import { NextRequest, NextResponse } from 'next/server';
import { getFeedbacksCollection, getLogsCollection } from '@/lib/mongodb';
import { deleteCachePattern } from '@/lib/redis';
import { FeedbackDocument, FeedbackType } from '@/types/feedback';

export const dynamic = 'force-dynamic';

const VALID_TYPES: FeedbackType[] = ['suggestion', 'bug', 'feature', 'complaint', 'other'];

/**
 * GET /api/feedbacks/client?deviceId=xxx
 * 客户端按 deviceId 查询当前设备提交的历史反馈与处理回复
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId')?.trim();

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: '缺少必需参数 deviceId' },
        { status: 400 }
      );
    }

    const collection = await getFeedbacksCollection();
    const feedbacks = await collection
      .find({ deviceId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const formatted = feedbacks.map((f) => ({
      _id: f._id?.toString(),
      title: f.title,
      content: f.content,
      type: f.type,
      status: f.status,
      reply: f.reply || '',
      repliedAt: f.repliedAt,
      createdAt: f.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '查询反馈历史失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedbacks/client
 * Android 终端用户提交意见与建议
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      type = 'suggestion',
      contact = '',
      deviceId = '',
      userId = '',
      images = [],
    } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: '意见或反馈内容 (content) 不能为空' },
        { status: 400 }
      );
    }

    const cleanContent = content.trim();
    const cleanTitle = (
      title && typeof title === 'string' && title.trim()
        ? title.trim()
        : cleanContent.slice(0, 30) + (cleanContent.length > 30 ? '...' : '')
    );

    const normalizedType: FeedbackType = VALID_TYPES.includes(type) ? type : 'suggestion';

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '';
    const userAgent = request.headers.get('user-agent') || '';

    const now = new Date();
    const newFeedback: FeedbackDocument = {
      title: cleanTitle,
      content: cleanContent,
      type: normalizedType,
      status: 'pending',
      priority: 'normal',
      contact: typeof contact === 'string' ? contact.trim() : '',
      deviceId: typeof deviceId === 'string' ? deviceId.trim() : '',
      userId: typeof userId === 'string' ? userId.trim() : '',
      images: Array.isArray(images) ? images.filter((img) => typeof img === 'string' && img.trim()) : [],
      ip: clientIp,
      userAgent,
      createdAt: now,
      updatedAt: now,
    };

    const collection = await getFeedbacksCollection();
    const result = await collection.insertOne(newFeedback);

    deleteCachePattern('cache:feedbacks:*').catch(() => {});

    // 记录到日志中心
    try {
      const logsCollection = await getLogsCollection();
      await logsCollection.insertOne({
        level: 'info',
        message: `客户端提交意见与建议：【${cleanTitle}】(设备: ${deviceId || '未知'})`,
        service: 'feedback-service',
        tags: ['feedback', normalizedType, ...(deviceId ? [deviceId] : [])],
        details: {
          feedbackId: result.insertedId.toString(),
          title: cleanTitle,
          type: normalizedType,
          deviceId,
          contact,
        },
        ip: clientIp,
        userAgent,
        createdAt: now,
      });
      deleteCachePattern('cache:logs:*').catch(() => {});
    } catch {
      // ignore log error
    }

    return NextResponse.json(
      {
        success: true,
        message: '感谢您的意见与建议，我们已成功接收并会尽快处理！',
        data: {
          _id: result.insertedId.toString(),
          title: newFeedback.title,
          status: newFeedback.status,
          createdAt: newFeedback.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '提交意见与建议失败' },
      { status: 500 }
    );
  }
}
