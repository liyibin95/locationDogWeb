import { NextRequest, NextResponse } from 'next/server';
import { getDevicesCollection } from '@/lib/mongodb';
import { deleteCachePattern } from '@/lib/redis';
import { DeviceDocument } from '@/types/device';

export const dynamic = 'force-dynamic';

/**
 * GET /api/devices/client?deviceId=xxx
 * Android 客户端查询本机设备状态、积分余额与微信绑定信息
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

    const collection = await getDevicesCollection();
    const device = await collection.findOne({ deviceId });

    if (!device) {
      return NextResponse.json(
        { success: false, error: '设备未注册', registered: false },
        { status: 404 }
      );
    }

    // 更新最后活跃时间
    await collection.updateOne(
      { deviceId },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      registered: true,
      data: {
        _id: device._id?.toString(),
        deviceId: device.deviceId,
        deviceInfo: device.deviceInfo,
        brand: device.brand,
        model: device.model,
        osVersion: device.osVersion,
        wechatId: device.wechatId || '',
        isWechatBound: Boolean(device.wechatId && device.wechatId.trim()),
        points: device.points || 0,
        status: device.status,
        createdAt: device.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '查询设备信息失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/devices/client
 * Android 客户端上报 / 自动注册 / 绑定微信 / 心跳
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      deviceId,
      deviceInfo,
      brand = '',
      model = '',
      osVersion = '',
      wechatId,
    } = body;

    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      return NextResponse.json(
        { success: false, error: 'deviceId 为必填项' },
        { status: 400 }
      );
    }

    const cleanDeviceId = deviceId.trim();
    const now = new Date();
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '';

    const collection = await getDevicesCollection();
    const existing = await collection.findOne({ deviceId: cleanDeviceId });

    if (existing) {
      // 设备已存在：更新设备硬件信息与最后活跃时间，若传递了 wechatId 则更新绑定
      const updateData: any = {
        updatedAt: now,
        ip: clientIp,
      };

      if (deviceInfo) updateData.deviceInfo = String(deviceInfo).trim();
      if (brand) updateData.brand = String(brand).trim();
      if (model) updateData.model = String(model).trim();
      if (osVersion) updateData.osVersion = String(osVersion).trim();
      if (wechatId !== undefined) updateData.wechatId = String(wechatId).trim();

      await collection.updateOne({ deviceId: cleanDeviceId }, { $set: updateData });
      deleteCachePattern('cache:devices:*').catch(() => {});

      const updated = await collection.findOne({ deviceId: cleanDeviceId });

      return NextResponse.json({
        success: true,
        message: '设备信息更新与心跳成功',
        action: 'updated',
        data: {
          _id: updated?._id?.toString(),
          deviceId: updated?.deviceId,
          deviceInfo: updated?.deviceInfo,
          wechatId: updated?.wechatId || '',
          points: updated?.points || 0,
          status: updated?.status,
        },
      });
    }

    // 设备首次上报：自动完成注册，赋予默认 0 积分 (或新人赠送积分)
    const newDevice: DeviceDocument = {
      deviceId: cleanDeviceId,
      deviceInfo: (deviceInfo ? String(deviceInfo).trim() : `${brand} ${model} (Android ${osVersion})`).trim() || 'Android Device',
      brand: brand?.trim() || '',
      model: model?.trim() || '',
      osVersion: osVersion?.trim() || '',
      wechatId: wechatId?.trim() || '',
      points: 0,
      status: 'normal',
      remark: 'Android 客户端自动上报注册',
      ip: clientIp,
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await collection.insertOne(newDevice);
    deleteCachePattern('cache:devices:*').catch(() => {});

    return NextResponse.json(
      {
        success: true,
        message: '设备注册成功',
        action: 'created',
        data: {
          _id: insertResult.insertedId.toString(),
          deviceId: newDevice.deviceId,
          deviceInfo: newDevice.deviceInfo,
          wechatId: newDevice.wechatId,
          points: newDevice.points,
          status: newDevice.status,
          createdAt: newDevice.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '客户端上报失败' },
      { status: 500 }
    );
  }
}
