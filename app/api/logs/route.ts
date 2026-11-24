import { NextRequest, NextResponse } from 'next/server';
import { getLogsCollection } from '@/lib/mongodb';
import { validateApiKey, validateAdminOrApiKey } from '@/lib/auth';
import { getOrSetCache, deleteCachePattern } from '@/lib/redis';
import { LogDocument, LogLevel } from '@/types/log';
import { Filter, ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const VALID_LEVELS: LogLevel[] = ['info', 'warn', 'error', 'debug'];

/**
 * GET /api/logs - 查询日志列表
 * 支持按级别、服务名、关键词搜索、时间范围筛选，以及分页
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const level = searchParams.get('level')?.toLowerCase();
    const service = searchParams.get('service')?.trim();
    const search = searchParams.get('search')?.trim();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const cacheKey = `cache:logs:list:${page}:${limit}:${level || 'all'}:${service || 'all'}:${search || ''}:${startDate || ''}:${endDate || ''}`;

    // 日志列表设置 10 秒轻量缓存，降低频繁翻页或多人查看时对 MongoDB 的重复击穿
    const responseData = await getOrSetCache(
      cacheKey,
      async () => {
        const filter: Filter<LogDocument> = {};

        // 级别筛选
        if (level && level !== 'all' && VALID_LEVELS.includes(level as LogLevel)) {
          filter.level = level as LogLevel;
        }

        // 服务名筛选
        if (service) {
          filter.service = service;
        }

        // 关键词搜索（对消息内容和服务名进行模糊搜索）
        if (search) {
          filter.$or = [
            { message: { $regex: search, $options: 'i' } },
            { service: { $regex: search, $options: 'i' } },
          ];
        }

        // 时间范围筛选
        if (startDate || endDate) {
          filter.createdAt = {};
          if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
              filter.createdAt.$gte = start;
            }
          }
          if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
              if (endDate.length === 10) {
                end.setHours(23, 59, 59, 999);
              }
              filter.createdAt.$lte = end;
            }
          }
        }

        const collection = await getLogsCollection();

        const [total, logs] = await Promise.all([
          collection.countDocuments(filter),
          collection
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const formattedLogs = logs.map((log) => ({
          ...log,
          _id: log._id?.toString(),
        }));

        return {
          success: true,
          data: formattedLogs,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        };
      },
      10
    );

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '查询日志失败，请检查 MongoDB 连接配置。',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/logs - 新增日志
 * 接口需鉴权（通过 x-api-key 或 Authorization: Bearer <API_KEY>）
 */
export async function POST(request: NextRequest) {
  // 1. 接口鉴权校验
  const auth = validateApiKey(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: auth.reason || '未授权：接口鉴权失败',
      },
      { status: 401 }
    );
  }

  // 2. 解析与验证请求体
  try {
    const body = await request.json();
    const { level, message, service, tags, details } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: '参数错误：message 为必填项且不能为空',
        },
        { status: 400 }
      );
    }

    const normalizedLevel: LogLevel = (level?.toLowerCase() as LogLevel) || 'info';
    if (!VALID_LEVELS.includes(normalizedLevel)) {
      return NextResponse.json(
        {
          success: false,
          error: `参数错误：level 必须是 ${VALID_LEVELS.join(', ')} 之一`,
        },
        { status: 400 }
      );
    }

    // 3. 提取请求来源信息
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // 4. 构建日志记录
    const logDoc: LogDocument = {
      level: normalizedLevel,
      message: message.trim(),
      service: typeof service === 'string' && service.trim() ? service.trim() : 'default',
      tags: Array.isArray(tags) ? tags.filter((t) => typeof t === 'string') : [],
      details: typeof details === 'object' && details !== null ? details : undefined,
      ip,
      userAgent,
      createdAt: new Date(),
    };

    // 5. 插入 MongoDB
    const collection = await getLogsCollection();
    const result = await collection.insertOne(logDoc);

    return NextResponse.json(
      {
        success: true,
        message: '日志记录成功',
        data: {
          _id: result.insertedId.toString(),
          ...logDoc,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error inserting log:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '写入日志失败，请检查请求体格式或数据库连接。',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/logs - 删除日志（支持单条或批量删除）
 */
export async function DELETE(request: NextRequest) {
  // 1. 鉴权校验
  const auth = await validateAdminOrApiKey(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: auth.reason || '未授权：删除操作需要管理员权限或有效 API Key',
      },
      { status: 401 }
    );
  }

  try {
    let idsToDelete: string[] = [];

    // 从 Query 参数获取 id
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    if (queryId) {
      idsToDelete.push(queryId.trim());
    }

    // 从 Body 获取 ids
    try {
      const body = await request.json();
      if (body && Array.isArray(body.ids)) {
        idsToDelete.push(...body.ids);
      } else if (body && typeof body.id === 'string') {
        idsToDelete.push(body.id);
      }
    } catch {
      // Body 为空时允许仅依赖 queryId
    }

    // 去重并过滤合法 ObjectId
    idsToDelete = Array.from(new Set(idsToDelete.filter(Boolean)));

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '参数错误：未提供要删除的日志 ID',
        },
        { status: 400 }
      );
    }

    const objectIds: ObjectId[] = [];
    for (const id of idsToDelete) {
      try {
        objectIds.push(new ObjectId(id));
      } catch {
        // 忽略非有效 ObjectId 格式
      }
    }

    if (objectIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '参数错误：提供的 ID 均非合法的日志记录 ID',
        },
        { status: 400 }
      );
    }

    const collection = await getLogsCollection();
    const result = await collection.deleteMany({
      _id: { $in: objectIds as any },
    });

    // 删除日志后异步清除缓存
    deleteCachePattern('cache:logs:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 条日志`,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('Error deleting logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '删除日志失败，请检查数据库连接。',
      },
      { status: 500 }
    );
  }
}
