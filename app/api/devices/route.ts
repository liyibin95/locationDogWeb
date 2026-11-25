import { NextRequest, NextResponse } from 'next/server';
import { getDevicesCollection } from '@/lib/mongodb';
import { validateAdminOrApiKey } from '@/lib/auth';
import { getOrSetCache, deleteCachePattern } from '@/lib/redis';
import { DeviceDocument, DeviceStatus } from '@/types/device';
import { Filter, ObjectId, Sort } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/devices - 查询设备列表（支持分页、搜索、状态筛选、微信绑定筛选）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.trim();
    const wechatStatus = searchParams.get('wechatStatus')?.trim(); // all | bound | unbound
    const sortBy = searchParams.get('sortBy')?.trim() || 'createdAt';
    const sortOrder = searchParams.get('sortOrder')?.trim() === 'asc' ? 1 : -1;

    const cacheKey = `cache:devices:list:${page}:${limit}:${search || ''}:${status || 'all'}:${wechatStatus || 'all'}:${sortBy}:${sortOrder}`;

    const result = await getOrSetCache(
      cacheKey,
      async () => {
        const filter: Filter<DeviceDocument> = {};

        if (status && status !== 'all') {
          filter.status = status as DeviceStatus;
        }

        if (wechatStatus === 'bound') {
          filter.wechatId = { $exists: true, $nin: ['', null] } as any;
        } else if (wechatStatus === 'unbound') {
          filter.$or = [
            { wechatId: { $exists: false } },
            { wechatId: '' },
            { wechatId: null as any },
          ];
        }

        if (search) {
          const searchRegex = { $regex: search, $options: 'i' };
          const searchConditions: any[] = [
            { deviceId: searchRegex },
            { deviceInfo: searchRegex },
            { wechatId: searchRegex },
            { brand: searchRegex },
            { model: searchRegex },
            { remark: searchRegex },
          ];

          // 如果搜索词是合法的 ObjectId，也加入对 _id 的精确匹配
          try {
            if (ObjectId.isValid(search) && search.length === 24) {
              searchConditions.push({ _id: new ObjectId(search) });
            }
          } catch {
            // ignore
          }

          if (filter.$or) {
            filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
            delete filter.$or;
          } else {
            filter.$or = searchConditions;
          }
        }

        const collection = await getDevicesCollection();

        // 排序规则
        let sortOptions: Sort = { createdAt: sortOrder as any };
        if (sortBy === 'points') {
          sortOptions = { points: sortOrder as any };
        } else if (sortBy === 'updatedAt') {
          sortOptions = { updatedAt: sortOrder as any };
        }

        const [total, devices] = await Promise.all([
          collection.countDocuments(filter),
          collection
            .find(filter)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const formatted = devices.map((d) => ({
          ...d,
          _id: d._id?.toString(),
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
      30
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取设备列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/devices - 新增 Android 设备
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const body = await request.json();
    const {
      deviceId,
      deviceInfo,
      brand = '',
      model = '',
      osVersion = '',
      wechatId = '',
      points = 0,
      status = 'normal',
      remark = '',
      createdAt,
    } = body;

    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      return NextResponse.json(
        { success: false, error: '设备ID (deviceId) 不能为空' },
        { status: 400 }
      );
    }

    if (!deviceInfo || typeof deviceInfo !== 'string' || !deviceInfo.trim()) {
      return NextResponse.json(
        { success: false, error: '设备信息 (deviceInfo) 不能为空' },
        { status: 400 }
      );
    }

    const cleanDeviceId = deviceId.trim();
    const cleanPoints = isNaN(Number(points)) ? 0 : Math.max(0, Math.floor(Number(points)));

    const collection = await getDevicesCollection();

    // 检查设备ID唯一性
    const existing = await collection.findOne({ deviceId: cleanDeviceId });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `设备ID "${cleanDeviceId}" 已存在，不可重复添加。`,
        },
        { status: 409 }
      );
    }

    const now = new Date();
    let registerDate = now;
    if (createdAt) {
      const parsed = new Date(createdAt);
      if (!isNaN(parsed.getTime())) {
        registerDate = parsed;
      }
    }

    const newDevice: DeviceDocument = {
      deviceId: cleanDeviceId,
      deviceInfo: deviceInfo.trim(),
      brand: brand?.trim() || '',
      model: model?.trim() || '',
      osVersion: osVersion?.trim() || '',
      wechatId: wechatId?.trim() || '',
      points: cleanPoints,
      status: status === 'disabled' ? 'disabled' : 'normal',
      remark: remark?.trim() || '',
      createdAt: registerDate,
      updatedAt: now,
    };

    const result = await collection.insertOne(newDevice);

    deleteCachePattern('cache:devices:*').catch(() => {});

    return NextResponse.json(
      {
        success: true,
        data: { ...newDevice, _id: result.insertedId.toString() },
        message: '设备添加成功',
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '新增设备失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/devices - 更新设备信息 / 变更积分 / 切换状态
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
      deviceId,
      deviceInfo,
      brand,
      model,
      osVersion,
      wechatId,
      points,
      pointsDelta,
      status,
      remark,
      createdAt,
    } = body;

    if (!_id) {
      return NextResponse.json({ success: false, error: '必须提供设备 _id 参数' }, { status: 400 });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(_id);
    } catch {
      return NextResponse.json({ success: false, error: '无效的 _id 格式' }, { status: 400 });
    }

    const collection = await getDevicesCollection();
    const current = await collection.findOne({ _id: objectId as any });
    if (!current) {
      return NextResponse.json({ success: false, error: '未找到指定设备' }, { status: 404 });
    }

    // 若修改了 deviceId，需检查唯一性冲突
    if (deviceId && deviceId.trim() !== current.deviceId) {
      const cleanDeviceId = deviceId.trim();
      const conflict = await collection.findOne({
        deviceId: cleanDeviceId,
        _id: { $ne: objectId as any },
      });
      if (conflict) {
        return NextResponse.json(
          { success: false, error: `设备ID "${cleanDeviceId}" 已被其他设备占用` },
          { status: 409 }
        );
      }
    }

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (deviceId !== undefined) updateFields.deviceId = deviceId.trim();
    if (deviceInfo !== undefined) updateFields.deviceInfo = deviceInfo.trim();
    if (brand !== undefined) updateFields.brand = brand.trim();
    if (model !== undefined) updateFields.model = model.trim();
    if (osVersion !== undefined) updateFields.osVersion = osVersion.trim();
    if (wechatId !== undefined) updateFields.wechatId = wechatId.trim();
    if (status !== undefined) updateFields.status = status === 'disabled' ? 'disabled' : 'normal';
    if (remark !== undefined) updateFields.remark = remark.trim();

    if (createdAt !== undefined) {
      const parsedDate = new Date(createdAt);
      if (!isNaN(parsedDate.getTime())) {
        updateFields.createdAt = parsedDate;
      }
    }

    // 积分修改逻辑：支持直接设定绝对积分值，或者通过 pointsDelta 快捷增减
    if (typeof pointsDelta === 'number' && !isNaN(pointsDelta)) {
      const newPoints = Math.max(0, (current.points || 0) + Math.floor(pointsDelta));
      updateFields.points = newPoints;
    } else if (points !== undefined) {
      const numPoints = Number(points);
      if (!isNaN(numPoints)) {
        updateFields.points = Math.max(0, Math.floor(numPoints));
      }
    }

    await collection.updateOne({ _id: objectId as any }, { $set: updateFields });

    deleteCachePattern('cache:devices:*').catch(() => {});

    const updated = await collection.findOne({ _id: objectId as any });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        _id: updated?._id?.toString(),
      },
      message: '设备信息更新成功',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '更新设备失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/devices - 删除设备
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('_id');

    if (!id) {
      return NextResponse.json({ success: false, error: '必须提供 id 参数' }, { status: 400 });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ success: false, error: '无效的 id 格式' }, { status: 400 });
    }

    const collection = await getDevicesCollection();
    const result = await collection.deleteOne({ _id: objectId as any });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: '未找到指定设备或已删除' }, { status: 404 });
    }

    deleteCachePattern('cache:devices:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: '设备已成功删除',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '删除设备失败' },
      { status: 500 }
    );
  }
}
