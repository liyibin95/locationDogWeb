import { NextRequest, NextResponse } from 'next/server';
import { getFeedbacksCollection, getLogsCollection } from '@/lib/mongodb';
import { validateAdminOrApiKey } from '@/lib/auth';
import { getOrSetCache, deleteCachePattern } from '@/lib/redis';
import { FeedbackDocument, FeedbackType, FeedbackStatus, FeedbackPriority } from '@/types/feedback';
import { Filter, ObjectId, Sort } from 'mongodb';

export const dynamic = 'force-dynamic';

const VALID_TYPES: FeedbackType[] = ['suggestion', 'bug', 'feature', 'complaint', 'other'];
const VALID_STATUSES: FeedbackStatus[] = ['pending', 'processing', 'resolved', 'closed'];
const VALID_PRIORITIES: FeedbackPriority[] = ['low', 'normal', 'high', 'urgent'];

/**
 * GET /api/feedbacks - 获取意见和建议列表（支持分页、搜索、类型、状态、优先级筛选）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim();
    const type = searchParams.get('type')?.trim();
    const status = searchParams.get('status')?.trim();
    const priority = searchParams.get('priority')?.trim();
    const deviceId = searchParams.get('deviceId')?.trim();
    const sortBy = searchParams.get('sortBy')?.trim() || 'createdAt';
    const sortOrder = searchParams.get('sortOrder')?.trim() === 'asc' ? 1 : -1;

    const cacheKey = `cache:feedbacks:list:${page}:${limit}:${search || ''}:${type || 'all'}:${status || 'all'}:${priority || 'all'}:${deviceId || ''}:${sortBy}:${sortOrder}`;

    const result = await getOrSetCache(
      cacheKey,
      async () => {
        const filter: Filter<FeedbackDocument> = {};

        if (type && type !== 'all' && VALID_TYPES.includes(type as FeedbackType)) {
          filter.type = type as FeedbackType;
        }

        if (status && status !== 'all' && VALID_STATUSES.includes(status as FeedbackStatus)) {
          filter.status = status as FeedbackStatus;
        }

        if (priority && priority !== 'all' && VALID_PRIORITIES.includes(priority as FeedbackPriority)) {
          filter.priority = priority as FeedbackPriority;
        }

        if (deviceId) {
          filter.deviceId = deviceId;
        }

        if (search) {
          const searchRegex = { $regex: search, $options: 'i' };
          const searchConditions: any[] = [
            { title: searchRegex },
            { content: searchRegex },
            { contact: searchRegex },
            { deviceId: searchRegex },
            { userId: searchRegex },
            { reply: searchRegex },
            { remark: searchRegex },
          ];

          if (ObjectId.isValid(search) && search.length === 24) {
            try {
              searchConditions.push({ _id: new ObjectId(search) });
            } catch {
              // ignore
            }
          }

          filter.$or = searchConditions;
        }

        const collection = await getFeedbacksCollection();

        let sortOptions: Sort = { createdAt: sortOrder as any };
        if (sortBy === 'updatedAt') {
          sortOptions = { updatedAt: sortOrder as any };
        } else if (sortBy === 'priority') {
          sortOptions = { priority: sortOrder as any };
        }

        const [total, feedbacks] = await Promise.all([
          collection.countDocuments(filter),
          collection
            .find(filter)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const formatted = feedbacks.map((item) => ({
          ...item,
          _id: item._id?.toString(),
        }));

        return {
          success: true,
          data: formatted,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        };
      },
      20
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取意见反馈列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedbacks - 新增意见或建议
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      type = 'suggestion',
      status = 'pending',
      priority = 'normal',
      contact = '',
      deviceId = '',
      userId = '',
      images = [],
      reply = '',
      remark = '',
      createdAt,
    } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: '意见与建议内容 (content) 不能为空' },
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
    const normalizedStatus: FeedbackStatus = VALID_STATUSES.includes(status) ? status : 'pending';
    const normalizedPriority: FeedbackPriority = VALID_PRIORITIES.includes(priority) ? priority : 'normal';

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '';
    const userAgent = request.headers.get('user-agent') || '';

    const now = new Date();
    let registerDate = now;
    if (createdAt) {
      const parsed = new Date(createdAt);
      if (!isNaN(parsed.getTime())) {
        registerDate = parsed;
      }
    }

    const newFeedback: FeedbackDocument = {
      title: cleanTitle,
      content: cleanContent,
      type: normalizedType,
      status: normalizedStatus,
      priority: normalizedPriority,
      contact: typeof contact === 'string' ? contact.trim() : '',
      deviceId: typeof deviceId === 'string' ? deviceId.trim() : '',
      userId: typeof userId === 'string' ? userId.trim() : '',
      images: Array.isArray(images) ? images.filter((img) => typeof img === 'string' && img.trim()) : [],
      reply: typeof reply === 'string' ? reply.trim() : '',
      repliedAt: reply ? now : undefined,
      repliedBy: reply ? '管理员' : undefined,
      remark: typeof remark === 'string' ? remark.trim() : '',
      ip: clientIp,
      userAgent,
      createdAt: registerDate,
      updatedAt: now,
    };

    const collection = await getFeedbacksCollection();
    const insertResult = await collection.insertOne(newFeedback);

    deleteCachePattern('cache:feedbacks:*').catch(() => {});

    // 写入一条审计日志
    try {
      const logsCollection = await getLogsCollection();
      await logsCollection.insertOne({
        level: 'info',
        message: `收到新意见与建议：【${cleanTitle}】(类型: ${normalizedType}, 设备: ${deviceId || '无'})`,
        service: 'feedback-service',
        tags: ['feedback', normalizedType, ...(deviceId ? [deviceId] : [])],
        details: {
          feedbackId: insertResult.insertedId.toString(),
          title: cleanTitle,
          type: normalizedType,
          contact,
          deviceId,
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
        message: '意见与建议提交成功',
        data: {
          ...newFeedback,
          _id: insertResult.insertedId.toString(),
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

/**
 * PUT /api/feedbacks - 更新意见与建议（支持修改内容、状态、优先级、答复处理）
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const body = await request.json();
    const {
      _id,
      title,
      content,
      type,
      status,
      priority,
      contact,
      deviceId,
      userId,
      images,
      reply,
      repliedBy,
      remark,
    } = body;

    if (!_id) {
      return NextResponse.json({ success: false, error: '缺少必需参数 _id' }, { status: 400 });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(_id);
    } catch {
      return NextResponse.json({ success: false, error: '无效的 _id 格式' }, { status: 400 });
    }

    const collection = await getFeedbacksCollection();
    const current = await collection.findOne({ _id: objectId as any });
    if (!current) {
      return NextResponse.json({ success: false, error: '未找到指定反馈记录' }, { status: 404 });
    }

    const now = new Date();
    const updateFields: any = {
      updatedAt: now,
    };

    if (title !== undefined && typeof title === 'string') updateFields.title = title.trim();
    if (content !== undefined && typeof content === 'string') updateFields.content = content.trim();
    if (type !== undefined && VALID_TYPES.includes(type)) updateFields.type = type;
    if (status !== undefined && VALID_STATUSES.includes(status)) updateFields.status = status;
    if (priority !== undefined && VALID_PRIORITIES.includes(priority)) updateFields.priority = priority;
    if (contact !== undefined) updateFields.contact = String(contact).trim();
    if (deviceId !== undefined) updateFields.deviceId = String(deviceId).trim();
    if (userId !== undefined) updateFields.userId = String(userId).trim();
    if (Array.isArray(images)) updateFields.images = images.filter((img) => typeof img === 'string');
    if (remark !== undefined) updateFields.remark = String(remark).trim();

    // 回复处理
    if (reply !== undefined) {
      const cleanReply = String(reply).trim();
      updateFields.reply = cleanReply;
      if (cleanReply) {
        updateFields.repliedAt = now;
        updateFields.repliedBy = repliedBy?.trim() || '管理员';
        // 如果当前是待处理状态且未显式指定 status，则自动流转为 resolved
        if (current.status === 'pending' && status === undefined) {
          updateFields.status = 'resolved';
        }
      }
    }

    await collection.updateOne({ _id: objectId as any }, { $set: updateFields });
    deleteCachePattern('cache:feedbacks:*').catch(() => {});

    // 若进行了答复或修改了状态，记录操作审计日志
    if (reply !== undefined || status !== undefined) {
      try {
        const logsCollection = await getLogsCollection();
        await logsCollection.insertOne({
          level: 'info',
          message: `反馈【${current.title}】已被处理/更新：状态变更【${current.status} -> ${updateFields.status || current.status}】${reply ? '，已填写答复' : ''}`,
          service: 'feedback-service',
          tags: ['feedback', 'update', current._id?.toString() || ''],
          details: {
            feedbackId: current._id?.toString(),
            title: current.title,
            oldStatus: current.status,
            newStatus: updateFields.status || current.status,
            reply: updateFields.reply || current.reply,
          },
          createdAt: now,
        });
        deleteCachePattern('cache:logs:*').catch(() => {});
      } catch {
        // ignore
      }
    }

    const updated = await collection.findOne({ _id: objectId as any });

    return NextResponse.json({
      success: true,
      message: '意见反馈更新成功',
      data: {
        ...updated,
        _id: updated?._id?.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '更新意见反馈失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feedbacks - 删除意见与建议（支持单条或批量删除）
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id') || searchParams.get('_id');
    let idsToDelete: string[] = [];

    if (idParam) {
      idsToDelete.push(idParam.trim());
    }

    try {
      const body = await request.json();
      if (body && Array.isArray(body.ids)) {
        idsToDelete.push(...body.ids);
      } else if (body && typeof body.id === 'string') {
        idsToDelete.push(body.id);
      } else if (body && typeof body._id === 'string') {
        idsToDelete.push(body._id);
      }
    } catch {
      // ignore json parse error
    }

    idsToDelete = Array.from(new Set(idsToDelete.filter(Boolean)));

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { success: false, error: '未提供要删除的反馈 ID' },
        { status: 400 }
      );
    }

    const validObjectIds = idsToDelete
      .filter((id) => ObjectId.isValid(id) && id.length === 24)
      .map((id) => new ObjectId(id));

    if (validObjectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '提供的 ID 格式均不合法' },
        { status: 400 }
      );
    }

    const collection = await getFeedbacksCollection();
    const result = await collection.deleteMany({ _id: { $in: validObjectIds as any } });

    deleteCachePattern('cache:feedbacks:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 条意见反馈`,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '删除意见反馈失败' },
      { status: 500 }
    );
  }
}
