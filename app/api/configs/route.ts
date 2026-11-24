import { NextRequest, NextResponse } from 'next/server';
import { getConfigsCollection } from '@/lib/mongodb';
import { validateAdminOrApiKey } from '@/lib/auth';
import { getOrSetCache, deleteCachePattern } from '@/lib/redis';
import { ConfigDocument, ConfigType, ConfigEnvironment } from '@/types/config';
import { Filter, ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const VALID_TYPES: ConfigType[] = ['string', 'number', 'boolean', 'json'];
const VALID_ENVS: ConfigEnvironment[] = ['all', 'prod', 'beta', 'dev'];

/**
 * 校验配置值与类型是否匹配
 */
function validateConfigValue(type: ConfigType, value: string): { valid: boolean; error?: string } {
  if (value === undefined || value === null) {
    return { valid: false, error: '配置值不能为空' };
  }

  if (type === 'number') {
    if (isNaN(Number(value))) {
      return { valid: false, error: '类型为 number 时，值必须为有效数值' };
    }
  } else if (type === 'boolean') {
    if (value !== 'true' && value !== 'false') {
      return { valid: false, error: '类型为 boolean 时，值必须为 "true" 或 "false"' };
    }
  } else if (type === 'json') {
    try {
      JSON.parse(value);
    } catch {
      return { valid: false, error: '类型为 json 时，值必须为合法的 JSON 格式字符串' };
    }
  }

  return { valid: true };
}

/**
 * GET /api/configs - 查询配置列表（管理后台）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim();
    const group = searchParams.get('group')?.trim();
    const appId = searchParams.get('appId')?.trim();
    const env = searchParams.get('environment')?.trim();
    const isEnabled = searchParams.get('isEnabled');

    const cacheKey = `cache:configs:list:${page}:${limit}:${search || ''}:${group || 'all'}:${appId || 'all'}:${env || 'all'}:${isEnabled ?? 'all'}`;

    const result = await getOrSetCache(
      cacheKey,
      async () => {
        const filter: Filter<ConfigDocument> = {};

        if (group && group !== 'all') {
          filter.group = group;
        }

        if (appId && appId !== 'all') {
          filter.appId = appId;
        }

        if (env && env !== 'all') {
          filter.environment = env as ConfigEnvironment;
        }

        if (isEnabled === 'true') {
          filter.isEnabled = true;
        } else if (isEnabled === 'false') {
          filter.isEnabled = false;
        }

        if (search) {
          filter.$or = [
            { key: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { group: { $regex: search, $options: 'i' } },
            { appId: { $regex: search, $options: 'i' } },
          ];
        }

        const collection = await getConfigsCollection();

        const [total, configs] = await Promise.all([
          collection.countDocuments(filter),
          collection
            .find(filter)
            .sort({ updatedAt: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const formatted = configs.map((c) => ({
          ...c,
          _id: c._id?.toString(),
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

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取配置列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/configs - 创建新配置
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
      value,
      type = 'string',
      group = 'default',
      appId = 'all',
      environment = 'all',
      channel = 'all',
      minVersionCode,
      maxVersionCode,
      description = '',
      isEnabled = true,
    } = body;

    if (!key || typeof key !== 'string' || !key.trim()) {
      return NextResponse.json(
        { success: false, error: '配置键 (key) 为必填项且不能全为空白' },
        { status: 400 }
      );
    }

    const cleanKey = key.trim();
    // 键名格式校验：支持字母、数字、下划线、中划线、点
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanKey)) {
      return NextResponse.json(
        { success: false, error: '配置键 (key) 仅支持字母、数字、下划线 (_)、中划线 (-) 或点 (.)' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: `不支持的类型：${type}，仅支持 string, number, boolean, json` },
        { status: 400 }
      );
    }

    if (!VALID_ENVS.includes(environment)) {
      return NextResponse.json(
        { success: false, error: `不支持的环境：${environment}，仅支持 all, prod, beta, dev` },
        { status: 400 }
      );
    }

    const valueValidation = validateConfigValue(type, String(value ?? ''));
    if (!valueValidation.valid) {
      return NextResponse.json({ success: false, error: valueValidation.error }, { status: 400 });
    }

    const collection = await getConfigsCollection();

    // 检查键唯一性：同一个 appId、group、environment 下 key 不允许重复
    const existing = await collection.findOne({
      key: cleanKey,
      appId: appId.trim() || 'all',
      group: group.trim() || 'default',
      environment,
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `同一应用 (${appId})、分组 (${group}) 和环境 (${environment}) 下已存在键名 "${cleanKey}"`,
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const newConfig: ConfigDocument = {
      key: cleanKey,
      value: String(value ?? ''),
      type,
      group: group.trim() || 'default',
      appId: appId.trim() || 'all',
      environment,
      channel: channel?.trim() || 'all',
      minVersionCode: typeof minVersionCode === 'number' ? minVersionCode : undefined,
      maxVersionCode: typeof maxVersionCode === 'number' ? maxVersionCode : undefined,
      description: description?.trim() || '',
      isEnabled: Boolean(isEnabled),
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newConfig);

    // 主动清除配置相关 Redis 缓存
    deleteCachePattern('cache:configs:*').catch(() => {});

    return NextResponse.json(
      {
        success: true,
        data: { ...newConfig, _id: result.insertedId.toString() },
        message: '配置创建成功',
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '创建配置失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/configs - 更新配置
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const body = await request.json();
    const { _id, key, value, type, group, appId, environment, channel, minVersionCode, maxVersionCode, description, isEnabled } = body;

    if (!_id) {
      return NextResponse.json({ success: false, error: '必须提供 _id 参数' }, { status: 400 });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(_id);
    } catch {
      return NextResponse.json({ success: false, error: '无效的 _id 格式' }, { status: 400 });
    }

    const collection = await getConfigsCollection();
    const current = await collection.findOne({ _id: objectId });
    if (!current) {
      return NextResponse.json({ success: false, error: '未找到指定配置' }, { status: 404 });
    }

    const finalType = type ?? current.type;
    const finalValue = value !== undefined ? String(value) : current.value;

    if (type !== undefined && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ success: false, error: `不支持的类型：${type}` }, { status: 400 });
    }

    if (value !== undefined || type !== undefined) {
      const valCheck = validateConfigValue(finalType, finalValue);
      if (!valCheck.valid) {
        return NextResponse.json({ success: false, error: valCheck.error }, { status: 400 });
      }
    }

    const updateDoc: Partial<ConfigDocument> = {
      updatedAt: new Date(),
    };

    if (key !== undefined) {
      const cleanKey = key.trim();
      if (!cleanKey) {
        return NextResponse.json({ success: false, error: '配置键不能为空' }, { status: 400 });
      }
      updateDoc.key = cleanKey;
    }

    if (value !== undefined) updateDoc.value = finalValue;
    if (type !== undefined) updateDoc.type = finalType;
    if (group !== undefined) updateDoc.group = group.trim() || 'default';
    if (appId !== undefined) updateDoc.appId = appId.trim() || 'all';
    if (environment !== undefined) updateDoc.environment = environment;
    if (channel !== undefined) updateDoc.channel = channel.trim() || 'all';
    if (description !== undefined) updateDoc.description = description.trim();
    if (isEnabled !== undefined) updateDoc.isEnabled = Boolean(isEnabled);
    if (minVersionCode !== undefined) {
      updateDoc.minVersionCode = minVersionCode === null || minVersionCode === '' ? undefined : Number(minVersionCode);
    }
    if (maxVersionCode !== undefined) {
      updateDoc.maxVersionCode = maxVersionCode === null || maxVersionCode === '' ? undefined : Number(maxVersionCode);
    }

    await collection.updateOne({ _id: objectId }, { $set: updateDoc });

    const updated = await collection.findOne({ _id: objectId });

    // 主动清除配置相关 Redis 缓存
    deleteCachePattern('cache:configs:*').catch(() => {});

    return NextResponse.json({
      success: true,
      data: { ...updated, _id: updated?._id.toString() },
      message: '配置更新成功',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '更新配置失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/configs - 删除配置
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

    const collection = await getConfigsCollection();
    const result = await collection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: '未找到指定配置或已被删除' }, { status: 404 });
    }

    // 主动清除配置相关 Redis 缓存
    deleteCachePattern('cache:configs:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: '配置删除成功',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '删除配置失败' },
      { status: 500 }
    );
  }
}
