import { NextRequest, NextResponse } from 'next/server';
import { getLogsCollection } from '@/lib/mongodb';
import { validateApiKey } from '@/lib/auth';
import { LogDocument, LogLevel } from '@/types/log';
import { Filter } from 'mongodb';

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
          // 如果传入的是 YYYY-MM-DD，调整为当天最后一刻
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

    // 格式化输出 _id 为字符串
    const formattedLogs = logs.map((log) => ({
      ...log,
      _id: log._id?.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
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
