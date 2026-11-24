import { NextRequest, NextResponse } from 'next/server';
import { getMessageReadsCollection, getMessagesCollection } from '@/lib/mongodb';
import { deleteCachePattern } from '@/lib/redis';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * POST /api/messages/read
 * 标记消息为已读
 *
 * 请求体：
 * - userId: 用户 ID 或设备标识 (必填)
 * - messageId: 单个消息 ID (可选)
 * - messageIds: 批量消息 ID 数组 (可选)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, messageId, messageIds } = body;

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json({ success: false, error: 'userId 为必填项' }, { status: 400 });
    }

    const idsToMark: string[] = [];
    if (messageId && typeof messageId === 'string') {
      idsToMark.push(messageId.trim());
    }
    if (Array.isArray(messageIds)) {
      messageIds.forEach((id) => {
        if (typeof id === 'string' && id.trim()) {
          idsToMark.push(id.trim());
        }
      });
    }

    if (idsToMark.length === 0) {
      return NextResponse.json(
        { success: false, error: '必须提供 messageId 或 messageIds' },
        { status: 400 }
      );
    }

    const cleanUserId = userId.trim();
    const readsCollection = await getMessageReadsCollection();
    const messagesCollection = await getMessagesCollection();
    const now = new Date();

    let newlyReadCount = 0;

    for (const mid of Array.from(new Set(idsToMark))) {
      try {
        const updateResult = await readsCollection.updateOne(
          { messageId: mid, userId: cleanUserId },
          { $setOnInsert: { messageId: mid, userId: cleanUserId, readAt: now } },
          { upsert: true }
        );

        if (updateResult.upsertedCount > 0) {
          newlyReadCount++;
          try {
            await messagesCollection.updateOne(
              { _id: new ObjectId(mid) as any },
              { $inc: { readCount: 1 } }
            );
          } catch {
            // Ignore if invalid ObjectId format
          }
        }
      } catch {
        // Skip duplicate errors
      }
    }

    if (newlyReadCount > 0) {
      deleteCachePattern('cache:messages:list:*').catch(() => {});
    }

    return NextResponse.json({
      success: true,
      markedCount: newlyReadCount,
      message: '已成功标记为已读',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '标记已读失败' },
      { status: 500 }
    );
  }
}
