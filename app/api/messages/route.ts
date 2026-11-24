import { NextRequest, NextResponse } from 'next/server';
import { getMessagesCollection } from '@/lib/mongodb';
import { validateAdminOrApiKey } from '@/lib/auth';
import { getOrSetCache, deleteCachePattern } from '@/lib/redis';
import { MessageDocument, MessageType, MessagePriority, MessageStatus, TargetType } from '@/types/message';
import { Filter, ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const VALID_TYPES: MessageType[] = ['announcement', 'notification', 'upgrade', 'alert'];
const VALID_PRIORITIES: MessagePriority[] = ['low', 'normal', 'high', 'urgent'];
const VALID_STATUSES: MessageStatus[] = ['published', 'draft', 'archived'];
const VALID_TARGETS: TargetType[] = ['all', 'user', 'channel', 'version'];

/**
 * GET /api/messages - 查询消息列表（管理后台）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const keyParam = searchParams.get('key')?.trim();
    const targetAppId = searchParams.get('appId')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim();
    const type = searchParams.get('type')?.trim();
    const status = searchParams.get('status')?.trim();
    const priority = searchParams.get('priority')?.trim();
    const appId = targetAppId;
    const isPopup = searchParams.get('isPopup');

    const cacheKey = `cache:messages:list:${id || ''}:${keyParam || ''}:${page}:${limit}:${search || ''}:${type || 'all'}:${status || 'all'}:${priority || 'all'}:${appId || 'all'}:${isPopup ?? 'all'}`;

    const result = await getOrSetCache(
      cacheKey,
      async () => {
        const collection = await getMessagesCollection();

        // 支持通过 ID 查询单条消息详情
        if (id) {
          try {
            const doc = await collection.findOne({ _id: new ObjectId(id) as any });
            if (!doc) {
              return { success: false, error: '未找到指定消息', status: 404 };
            }
            return {
              success: true,
              data: { ...doc, _id: doc._id?.toString() },
            };
          } catch {
            return { success: false, error: '无效的 id 格式', status: 400 };
          }
        }

        // 支持通过 key 精确查询单条消息公告详情
        if (keyParam) {
          const keyFilter: Filter<MessageDocument> = { key: keyParam };
          if (appId && appId !== 'all') {
            keyFilter.appId = { $in: [appId, 'all'] };
          }
          const doc = await collection.findOne(keyFilter, { sort: { createdAt: -1 } });
          if (!doc) {
            return { success: false, error: `未找到 key 为 "${keyParam}" 的消息公告`, status: 404 };
          }
          return {
            success: true,
            data: { ...doc, _id: doc._id?.toString() },
          };
        }

        const filter: Filter<MessageDocument> = {};

        if (type && type !== 'all' && VALID_TYPES.includes(type as MessageType)) {
          filter.type = type as MessageType;
        }

        if (status && status !== 'all' && VALID_STATUSES.includes(status as MessageStatus)) {
          filter.status = status as MessageStatus;
        }

        if (priority && priority !== 'all' && VALID_PRIORITIES.includes(priority as MessagePriority)) {
          filter.priority = priority as MessagePriority;
        }

        if (appId && appId !== 'all') {
          filter.appId = appId;
        }

        if (isPopup === 'true') {
          filter.isPopup = true;
        } else if (isPopup === 'false') {
          filter.isPopup = false;
        }

        if (search) {
          filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { key: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } },
            { targetValue: { $regex: search, $options: 'i' } },
            { appId: { $regex: search, $options: 'i' } },
          ];
        }

        const [total, messages] = await Promise.all([
          collection.countDocuments(filter),
          collection
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const formatted = messages.map((m) => ({
          ...m,
          _id: m._id?.toString(),
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
      60
    );

    if ((result as any).status) {
      return NextResponse.json(result, { status: (result as any).status });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取消息列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages - 创建新消息
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const body = await request.json();
    const {
      key,
      title,
      content,
      type = 'announcement',
      priority = 'normal',
      targetType = 'all',
      targetValue = '',
      appId = 'all',
      actionUrl = '',
      actionText = '',
      isPopup = false,
      extra = {},
      status = 'published',
      publishAt,
      expireAt,
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ success: false, error: '消息标题 (title) 为必填项' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ success: false, error: '消息内容 (content) 为必填项' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ success: false, error: `不支持的消息类型：${type}` }, { status: 400 });
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ success: false, error: `不支持的优先级：${priority}` }, { status: 400 });
    }

    if (!VALID_TARGETS.includes(targetType)) {
      return NextResponse.json({ success: false, error: `不支持的目标受众类型：${targetType}` }, { status: 400 });
    }

    if (targetType !== 'all' && (!targetValue || !targetValue.trim())) {
      return NextResponse.json(
        { success: false, error: `当受众定向为 ${targetType} 时，定向目标值 (targetValue) 不能为空` },
        { status: 400 }
      );
    }

    const cleanKey = typeof key === 'string' && key.trim() ? key.trim() : undefined;
    const collection = await getMessagesCollection();

    if (cleanKey) {
      const existing = await collection.findOne({
        key: cleanKey,
        appId: appId.trim() || 'all',
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `应用 (${appId || 'all'}) 下已存在 key 为 "${cleanKey}" 的消息`,
          },
          { status: 409 }
        );
      }
    }

    const now = new Date();
    const pubDate = publishAt ? new Date(publishAt) : now;
    const expDate = expireAt ? new Date(expireAt) : undefined;

    const newMessage: MessageDocument = {
      key: cleanKey,
      title: title.trim(),
      content: content.trim(),
      type,
      priority,
      targetType,
      targetValue: targetValue.trim(),
      appId: appId.trim() || 'all',
      actionUrl: actionUrl.trim(),
      actionText: actionText.trim(),
      isPopup: Boolean(isPopup),
      extra: typeof extra === 'object' && extra !== null ? extra : {},
      status,
      publishAt: pubDate,
      expireAt: expDate,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newMessage);

    deleteCachePattern('cache:messages:*').catch(() => {});

    return NextResponse.json(
      {
        success: true,
        data: { ...newMessage, _id: result.insertedId.toString() },
        message: '消息创建成功',
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '创建消息失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/messages - 更新消息
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
      key,
      title,
      content,
      type,
      priority,
      targetType,
      targetValue,
      appId,
      actionUrl,
      actionText,
      isPopup,
      extra,
      status,
      publishAt,
      expireAt,
    } = body;

    if (!_id) {
      return NextResponse.json({ success: false, error: '必须提供 _id 参数' }, { status: 400 });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(_id);
    } catch {
      return NextResponse.json({ success: false, error: '无效的 _id 格式' }, { status: 400 });
    }

    const collection = await getMessagesCollection();
    const existing = await collection.findOne({ _id: objectId as any });
    if (!existing) {
      return NextResponse.json({ success: false, error: '未找到指定消息' }, { status: 404 });
    }

    const updateDoc: Partial<MessageDocument> = {
      updatedAt: new Date(),
    };

    const updateOps: any = { $set: updateDoc };

    if (key !== undefined) {
      const finalKey = typeof key === 'string' && key.trim() ? key.trim() : null;
      if (finalKey) {
        const targetApp = (appId !== undefined ? appId.trim() : existing.appId) || 'all';
        const existingWithKey = await collection.findOne({
          key: finalKey,
          appId: targetApp,
          _id: { $ne: objectId as any },
        });
        if (existingWithKey) {
          return NextResponse.json(
            {
              success: false,
              error: `在目标 App "${targetApp}" 下已存在 key 为 "${finalKey}" 的公告`,
            },
            { status: 400 }
          );
        }
        updateDoc.key = finalKey;
      } else {
        updateOps.$unset = { key: '' };
      }
    }

    if (title !== undefined) updateDoc.title = title.trim();
    if (content !== undefined) updateDoc.content = content.trim();
    if (type !== undefined && VALID_TYPES.includes(type)) updateDoc.type = type;
    if (priority !== undefined && VALID_PRIORITIES.includes(priority)) updateDoc.priority = priority;
    if (targetType !== undefined && VALID_TARGETS.includes(targetType)) updateDoc.targetType = targetType;
    if (targetValue !== undefined) updateDoc.targetValue = targetValue.trim();
    if (appId !== undefined) updateDoc.appId = appId.trim() || 'all';
    if (actionUrl !== undefined) updateDoc.actionUrl = actionUrl.trim();
    if (actionText !== undefined) updateDoc.actionText = actionText.trim();
    if (isPopup !== undefined) updateDoc.isPopup = Boolean(isPopup);
    if (extra !== undefined) updateDoc.extra = typeof extra === 'object' && extra !== null ? extra : {};
    if (status !== undefined && VALID_STATUSES.includes(status)) updateDoc.status = status;

    if (publishAt !== undefined) {
      updateDoc.publishAt = publishAt ? new Date(publishAt) : new Date();
    }
    if (expireAt !== undefined) {
      updateDoc.expireAt = expireAt ? new Date(expireAt) : null;
    }

    await collection.updateOne({ _id: objectId as any }, updateOps);
    const updated = await collection.findOne({ _id: objectId as any });

    deleteCachePattern('cache:messages:*').catch(() => {});

    return NextResponse.json({
      success: true,
      data: { ...updated, _id: updated?._id?.toString() },
      message: '消息更新成功',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '更新消息失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages - 删除消息
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id || body._id;
      } catch {
        // No body
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: '必须提供待删除的 id 参数' }, { status: 400 });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ success: false, error: '无效的 id 格式' }, { status: 400 });
    }

    const collection = await getMessagesCollection();
    const result = await collection.deleteOne({ _id: objectId as any });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: '未找到指定消息或已被删除' }, { status: 404 });
    }

    deleteCachePattern('cache:messages:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: '消息删除成功',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '删除消息失败' },
      { status: 500 }
    );
  }
}
