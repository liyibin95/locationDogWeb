import { NextRequest, NextResponse } from 'next/server';
import { getMessagesCollection, getMessageReadsCollection } from '@/lib/mongodb';
import { getOrSetCache } from '@/lib/redis';
import { MessageDocument } from '@/types/message';
import { Filter, ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * 校验版本号是否命中定向规则
 */
function matchVersionRule(rule: string, clientVersion?: number): boolean {
  if (clientVersion === undefined || !rule) return true;
  const trimmed = rule.trim();

  // 范围: "100-110"
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map((s) => parseInt(s.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return clientVersion >= parts[0] && clientVersion <= parts[1];
    }
  }

  // 比较运算
  if (trimmed.startsWith('<=')) {
    const v = parseInt(trimmed.substring(2).trim(), 10);
    return !isNaN(v) && clientVersion <= v;
  }
  if (trimmed.startsWith('<')) {
    const v = parseInt(trimmed.substring(1).trim(), 10);
    return !isNaN(v) && clientVersion < v;
  }
  if (trimmed.startsWith('>=')) {
    const v = parseInt(trimmed.substring(2).trim(), 10);
    return !isNaN(v) && clientVersion >= v;
  }
  if (trimmed.startsWith('>')) {
    const v = parseInt(trimmed.substring(1).trim(), 10);
    return !isNaN(v) && clientVersion > v;
  }

  // 精确匹配
  const exact = parseInt(trimmed, 10);
  return !isNaN(exact) ? clientVersion === exact : true;
}

/**
 * GET /api/messages/client
 * 供 Android App 客户端获取消息/公告列表与弹窗通知
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id')?.trim();
    const key = searchParams.get('key')?.trim();
    const preview = searchParams.get('preview') === 'true';
    const appId = searchParams.get('appId')?.trim() || '';
    const userId = searchParams.get('userId')?.trim() || '';
    const channel = searchParams.get('channel')?.trim() || '';
    const type = searchParams.get('type')?.trim() || '';
    const popupOnly = searchParams.get('popupOnly') === 'true';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const rawVersion = searchParams.get('versionCode');
    const versionCode = rawVersion ? parseInt(rawVersion, 10) : undefined;

    const now = new Date();

    // 如果指定了 id 或 key，则查询单条公告详情（结合 Redis 缓存）
    if (id || key) {
      const cacheKey = id
        ? `cache:messages:doc:id:${id}:${preview}`
        : `cache:messages:doc:key:${key}:${appId || 'all'}:${preview}`;

      const doc = await getOrSetCache(
        cacheKey,
        async () => {
          const collection = await getMessagesCollection();
          if (id) {
            try {
              const filter: Filter<MessageDocument> = {
                _id: new ObjectId(id) as any,
                ...(preview ? {} : { status: 'published' }),
              };
              return await collection.findOne(filter);
            } catch {
              return null;
            }
          } else {
            const keyFilter: Filter<MessageDocument> = {
              key,
              ...(preview
                ? {}
                : {
                    status: 'published',
                    publishAt: { $lte: new Date() },
                    $or: [
                      { expireAt: { $exists: false } },
                      { expireAt: null },
                      { expireAt: { $gt: new Date() } },
                    ],
                  }),
            };

            if (appId && appId !== 'all') {
              keyFilter.appId = { $in: [appId, 'all'] };
            }

            return await collection.findOne(keyFilter, {
              sort: { priority: -1, publishAt: -1, createdAt: -1 },
            });
          }
        },
        60
      );

      if (!doc) {
        return NextResponse.json(
          {
            success: false,
            error: id
              ? `未找到指定公告或尚未发布`
              : `未找到 key 为 "${key}" 的有效公告或已下线`,
          },
          { status: 404 }
        );
      }

      // 验证受众定向（如果提供了定向参数才做强拦截，方便灵活访问）
      let isTargetMatched = true;
      if (doc.targetType === 'user' && userId) {
        const targets = (doc.targetValue || '').split(',').map((s) => s.trim());
        isTargetMatched = targets.includes(userId);
      } else if (doc.targetType === 'channel' && channel) {
        const targets = (doc.targetValue || '').split(',').map((s) => s.trim().toLowerCase());
        isTargetMatched = targets.includes(channel.toLowerCase()) || targets.includes('all');
      } else if (doc.targetType === 'version' && versionCode !== undefined) {
        isTargetMatched = matchVersionRule(doc.targetValue || '', versionCode);
      }

      if (!isTargetMatched) {
        return NextResponse.json(
          { success: false, error: '当前客户端不满足该公告的定向投放条件' },
          { status: 403 }
        );
      }

      // 查询已读状态
      let isRead = false;
      const docIdStr = doc._id?.toString();
      if (userId && docIdStr) {
        const readsCollection = await getMessageReadsCollection();
        const readRecord = await readsCollection.findOne({
          userId,
          messageId: docIdStr,
        });
        isRead = Boolean(readRecord);
      }

      const isExpired = Boolean(doc.expireAt && new Date(doc.expireAt) < now);

      const item = {
        _id: docIdStr,
        key: doc.key || '',
        title: doc.title,
        content: doc.content,
        type: doc.type,
        priority: doc.priority,
        appId: doc.appId,
        targetType: doc.targetType,
        targetValue: doc.targetValue,
        actionUrl: doc.actionUrl || '',
        actionText: doc.actionText || '',
        isPopup: doc.isPopup,
        extra: doc.extra || {},
        status: doc.status,
        publishAt: doc.publishAt,
        expireAt: doc.expireAt,
        isExpired,
        readCount: doc.readCount || 0,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        isRead,
      };

      return NextResponse.json({
        success: true,
        data: item,
        timestamp: Date.now(),
      });
    }

    // 缓存候选消息列表（跳过频繁的数据库排序和条件检索）
    const candidateCacheKey = `cache:messages:candidates:${appId || 'all'}:${type || 'all'}:${popupOnly}:${limit}`;
    const candidateMessages = await getOrSetCache(
      candidateCacheKey,
      async () => {
        const collection = await getMessagesCollection();
        const filter: Filter<MessageDocument> = {
          status: 'published',
          publishAt: { $lte: new Date() },
          $or: [{ expireAt: { $exists: false } }, { expireAt: null }, { expireAt: { $gt: new Date() } }],
        };

        if (appId) {
          filter.appId = { $in: [appId, 'all'] };
        }

        if (type && type !== 'all') {
          filter.type = type as any;
        }

        if (popupOnly) {
          filter.isPopup = true;
        }

        return await collection
          .find(filter)
          .sort({ priority: -1, publishAt: -1 })
          .limit(limit * 2)
          .toArray();
      },
      60
    );

    // 过滤定向受众 Target
    const matchedMessages = (candidateMessages || []).filter((m: any) => {
      if (m.targetType === 'all') {
        return true;
      }
      if (m.targetType === 'user') {
        if (!userId) return false;
        const targets = (m.targetValue || '').split(',').map((s: string) => s.trim());
        return targets.includes(userId);
      }
      if (m.targetType === 'channel') {
        if (!channel) return false;
        const targets = (m.targetValue || '').split(',').map((s: string) => s.trim().toLowerCase());
        return targets.includes(channel.toLowerCase()) || targets.includes('all');
      }
      if (m.targetType === 'version') {
        return matchVersionRule(m.targetValue || '', versionCode);
      }
      return true;
    });

    // 截取前 limit 条
    const finalMessages = matchedMessages.slice(0, limit);

    // 查询该用户的已读记录
    let readMessageIdSet = new Set<string>();
    if (userId && finalMessages.length > 0) {
      const messageIds = finalMessages.map((m: any) => (m._id ? m._id.toString() : ''));
      const readsCollection = await getMessageReadsCollection();
      const reads = await readsCollection
        .find({
          userId,
          messageId: { $in: messageIds },
        })
        .toArray();

      readMessageIdSet = new Set(reads.map((r) => r.messageId));
    }

    let unreadCount = 0;
    let popupMessage: any = null;

    const formattedList = finalMessages.map((m: any) => {
      const idStr = m._id ? m._id.toString() : '';
      const isRead = readMessageIdSet.has(idStr);
      if (!isRead) {
        unreadCount += 1;
      }

      const item = {
        _id: idStr,
        key: m.key || '',
        title: m.title,
        content: m.content,
        type: m.type,
        priority: m.priority,
        appId: m.appId,
        actionUrl: m.actionUrl || '',
        actionText: m.actionText || '',
        isPopup: m.isPopup,
        extra: m.extra || {},
        publishAt: m.publishAt,
        expireAt: m.expireAt,
        isRead,
      };

      // 选出优先级最高且未读的首个弹窗通知
      if (m.isPopup && !isRead && !popupMessage) {
        popupMessage = item;
      }

      return item;
    });

    return NextResponse.json({
      success: true,
      data: formattedList,
      unreadCount,
      popupMessage,
      count: formattedList.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取客户端消息失败' },
      { status: 500 }
    );
  }
}
