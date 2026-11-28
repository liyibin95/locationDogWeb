import { NextRequest, NextResponse } from 'next/server';
import { getDevicesCollection } from '@/lib/mongodb';
import { validateAdminOrApiKey } from '@/lib/auth';
import { deleteCachePattern } from '@/lib/redis';
import { DeviceDocument } from '@/types/device';
import { recordDevicePointsLog } from '@/lib/device-log';
import { Filter } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * 处理设备与微信 ID 绑定关系的统一逻辑
 * 支持：
 * 1. 按设备 ID 绑定微信 ID (mode = 'byDeviceId' 或传入 deviceId + wechatId)
 * 2. 按微信 ID 绑定设备 ID (mode = 'byWechatId' 或传入 wechatId + deviceId)
 * 3. 解除绑定关系 (action = 'unbind' 或将对端字段留空)
 * 4. 跨记录合并：当设备记录与微信记录此前作为独立档案存在时，自动合并并累计双方积分
 */
async function handleBindDevice(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const body = await request.json();
    const {
      mode = 'auto',
      deviceId,
      wechatId,
      action = 'bind',
      mergePoints = true,
      force = true,
    } = body;

    const cleanDeviceId = typeof deviceId === 'string' ? deviceId.trim() : '';
    const cleanWechatId = typeof wechatId === 'string' ? wechatId.trim() : '';

    if (!cleanDeviceId && !cleanWechatId) {
      return NextResponse.json(
        { success: false, error: '必须提供设备 ID (deviceId) 或微信 ID (wechatId)' },
        { status: 400 }
      );
    }

    const isUnbind =
      action === 'unbind' ||
      (!cleanWechatId && mode === 'byDeviceId') ||
      (!cleanDeviceId && mode === 'byWechatId');

    const collection = await getDevicesCollection();
    const now = new Date();

    // 确定执行模式：按设备ID优先、按微信ID优先、或自动推断
    let effectiveMode = mode;
    if (effectiveMode === 'auto') {
      if (cleanDeviceId && cleanWechatId) {
        // 先检查哪个在库中存在
        const hasDevice = await collection.findOne({ deviceId: cleanDeviceId });
        if (hasDevice) {
          effectiveMode = 'byDeviceId';
        } else {
          const hasWechat = await collection.findOne({ wechatId: cleanWechatId });
          if (hasWechat) {
            effectiveMode = 'byWechatId';
          } else {
            return NextResponse.json(
              {
                success: false,
                error: `未找到设备 [${cleanDeviceId}] 或微信 [${cleanWechatId}] 的档案记录，请先新增。`,
              },
              { status: 404 }
            );
          }
        }
      } else if (cleanDeviceId) {
        effectiveMode = 'byDeviceId';
      } else {
        effectiveMode = 'byWechatId';
      }
    }

    // ==========================================
    // 模式 A: 按设备 ID 绑定 / 解绑 微信 ID
    // ==========================================
    if (effectiveMode === 'byDeviceId') {
      if (!cleanDeviceId) {
        return NextResponse.json(
          { success: false, error: '按设备 ID 操作时，必须提供 deviceId' },
          { status: 400 }
        );
      }

      const deviceDoc = await collection.findOne({ deviceId: cleanDeviceId });
      if (!deviceDoc) {
        return NextResponse.json(
          { success: false, error: `未找到设备 ID 为 "${cleanDeviceId}" 的设备记录` },
          { status: 404 }
        );
      }

      // A1. 解除该设备的微信绑定
      if (isUnbind) {
        if (!deviceDoc.wechatId) {
          return NextResponse.json({
            success: true,
            data: { ...deviceDoc, _id: deviceDoc._id?.toString() },
            message: `设备 [${cleanDeviceId}] 当前未绑定任何微信 ID，无需解绑`,
          });
        }

        const oldWechatId = deviceDoc.wechatId;
        await collection.updateOne(
          { _id: deviceDoc._id },
          { $set: { wechatId: '', updatedAt: now } }
        );
        deleteCachePattern('cache:devices:*').catch(() => {});

        const updated = await collection.findOne({ _id: deviceDoc._id });
        return NextResponse.json({
          success: true,
          data: { ...updated, _id: updated?._id?.toString() },
          message: `已成功解除设备 [${cleanDeviceId}] 与微信 [${oldWechatId}] 的绑定关系`,
        });
      }

      // A2. 绑定微信 ID 到当前设备
      if (!cleanWechatId) {
        return NextResponse.json(
          { success: false, error: '请提供要绑定的微信 ID (wechatId)' },
          { status: 400 }
        );
      }

      if (deviceDoc.wechatId === cleanWechatId) {
        return NextResponse.json({
          success: true,
          data: { ...deviceDoc, _id: deviceDoc._id?.toString() },
          message: `设备 [${cleanDeviceId}] 已与微信 [${cleanWechatId}] 绑定，无需重复操作`,
        });
      }

      // 检查目标微信 ID 是否已被库中记录使用
      const existingWechatDoc = await collection.findOne({ wechatId: cleanWechatId });

      let resultMessage = `设备 [${cleanDeviceId}] 已成功绑定微信 [${cleanWechatId}]`;

      if (existingWechatDoc && String(existingWechatDoc._id) !== String(deviceDoc._id)) {
        // 情况 1: 该微信记录是独立的新增微信档案（尚未绑定实体设备）
        if (!existingWechatDoc.deviceId) {
          const wechatPoints = existingWechatDoc.points || 0;
          let finalPoints = deviceDoc.points || 0;

          if (mergePoints && wechatPoints > 0) {
            finalPoints += wechatPoints;
            const clientIp =
              request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
              request.headers.get('x-real-ip') ||
              '';
            const userAgent = request.headers.get('user-agent') || '';

            await recordDevicePointsLog({
              deviceId: cleanDeviceId,
              deviceDbId: deviceDoc._id?.toString(),
              deviceInfo: deviceDoc.deviceInfo,
              beforePoints: deviceDoc.points || 0,
              afterPoints: finalPoints,
              changeValue: wechatPoints,
              reason: `合并微信独立档案 [${cleanWechatId}] 积分 (+${wechatPoints})`,
              operator: 'admin',
              ip: clientIp,
              userAgent,
            });
          }

          // 合并信息并删除独立的微信档案
          await Promise.all([
            collection.deleteOne({ _id: existingWechatDoc._id }),
            collection.updateOne(
              { _id: deviceDoc._id },
              {
                $set: {
                  wechatId: cleanWechatId,
                  points: finalPoints,
                  remark: deviceDoc.remark || existingWechatDoc.remark || '',
                  updatedAt: now,
                },
              }
            ),
          ]);

          resultMessage = `设备 [${cleanDeviceId}] 与微信 [${cleanWechatId}] 绑定成功，已合并微信独立档案${
            mergePoints && wechatPoints > 0 ? `（累计合并积分 +${wechatPoints}）` : ''
          }`;
        } else {
          // 情况 2: 该微信已被其它设备绑定
          if (!force) {
            return NextResponse.json(
              {
                success: false,
                error: `微信 ID "${cleanWechatId}" 已被其他设备 [${existingWechatDoc.deviceId}] 绑定。如需强制改绑，请设置 force: true。`,
              },
              { status: 409 }
            );
          }

          // 从原设备解绑该微信
          await collection.updateOne(
            { _id: existingWechatDoc._id },
            { $set: { wechatId: '', updatedAt: now } }
          );

          // 绑定到当前设备
          await collection.updateOne(
            { _id: deviceDoc._id },
            { $set: { wechatId: cleanWechatId, updatedAt: now } }
          );

          resultMessage = `微信 ID [${cleanWechatId}] 已从原设备 [${existingWechatDoc.deviceId}] 解绑，并成功绑定到当前设备 [${cleanDeviceId}]`;
        }
      } else {
        // 目标微信未被使用，直接更新当前设备
        await collection.updateOne(
          { _id: deviceDoc._id },
          { $set: { wechatId: cleanWechatId, updatedAt: now } }
        );
      }

      deleteCachePattern('cache:devices:*').catch(() => {});
      const updated = await collection.findOne({ _id: deviceDoc._id });

      return NextResponse.json({
        success: true,
        data: { ...updated, _id: updated?._id?.toString() },
        message: resultMessage,
      });
    }

    // ==========================================
    // 模式 B: 按微信 ID 绑定 / 解绑 设备 ID
    // ==========================================
    if (effectiveMode === 'byWechatId') {
      if (!cleanWechatId) {
        return NextResponse.json(
          { success: false, error: '按微信 ID 操作时，必须提供 wechatId' },
          { status: 400 }
        );
      }

      const wechatDoc = await collection.findOne({ wechatId: cleanWechatId });
      if (!wechatDoc) {
        // 若没有找到微信档案，但传了设备ID且该设备存在，可引导绑定
        if (cleanDeviceId) {
          const deviceDoc = await collection.findOne({ deviceId: cleanDeviceId });
          if (deviceDoc) {
            await collection.updateOne(
              { _id: deviceDoc._id },
              { $set: { wechatId: cleanWechatId, updatedAt: now } }
            );
            deleteCachePattern('cache:devices:*').catch(() => {});
            const updated = await collection.findOne({ _id: deviceDoc._id });
            return NextResponse.json({
              success: true,
              data: { ...updated, _id: updated?._id?.toString() },
              message: `微信 [${cleanWechatId}] 首次录入并成功绑定至设备 [${cleanDeviceId}]`,
            });
          }
        }
        return NextResponse.json(
          { success: false, error: `未找到微信 ID 为 "${cleanWechatId}" 的记录` },
          { status: 404 }
        );
      }

      // B1. 解除该微信的设备绑定
      if (isUnbind) {
        if (!wechatDoc.deviceId) {
          return NextResponse.json({
            success: true,
            data: { ...wechatDoc, _id: wechatDoc._id?.toString() },
            message: `微信 [${cleanWechatId}] 当前未绑定任何设备，无需解绑`,
          });
        }

        const oldDeviceId = wechatDoc.deviceId;
        await collection.updateOne(
          { _id: wechatDoc._id },
          { $unset: { deviceId: '' }, $set: { updatedAt: now } }
        );
        deleteCachePattern('cache:devices:*').catch(() => {});

        const updated = await collection.findOne({ _id: wechatDoc._id });
        return NextResponse.json({
          success: true,
          data: { ...updated, _id: updated?._id?.toString() },
          message: `已成功解除微信 [${cleanWechatId}] 与设备 [${oldDeviceId}] 的绑定关系`,
        });
      }

      // B2. 绑定设备 ID 到当前微信
      if (!cleanDeviceId) {
        return NextResponse.json(
          { success: false, error: '请提供要绑定的设备 ID (deviceId)' },
          { status: 400 }
        );
      }

      if (wechatDoc.deviceId === cleanDeviceId) {
        return NextResponse.json({
          success: true,
          data: { ...wechatDoc, _id: wechatDoc._id?.toString() },
          message: `微信 [${cleanWechatId}] 已与设备 [${cleanDeviceId}] 绑定，无需重复操作`,
        });
      }

      // 检查目标设备 ID 是否已经在库中存在
      const existingDeviceDoc = await collection.findOne({ deviceId: cleanDeviceId });

      let resultMessage = `微信 [${cleanWechatId}] 已成功绑定设备 [${cleanDeviceId}]`;

      if (existingDeviceDoc && String(existingDeviceDoc._id) !== String(wechatDoc._id)) {
        // 目标设备已有一条独立的设备记录：将微信信息合并至该设备记录中
        const wechatPoints = wechatDoc.points || 0;
        let finalPoints = existingDeviceDoc.points || 0;

        if (mergePoints && wechatPoints > 0) {
          finalPoints += wechatPoints;
          const clientIp =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            '';
          const userAgent = request.headers.get('user-agent') || '';

          await recordDevicePointsLog({
            deviceId: cleanDeviceId,
            deviceDbId: existingDeviceDoc._id?.toString(),
            deviceInfo: existingDeviceDoc.deviceInfo,
            beforePoints: existingDeviceDoc.points || 0,
            afterPoints: finalPoints,
            changeValue: wechatPoints,
            reason: `合并微信用户 [${cleanWechatId}] 档案积分 (+${wechatPoints})`,
            operator: 'admin',
            ip: clientIp,
            userAgent,
          });
        }

        // 删除独立的微信记录，并更新目标设备记录的 wechatId 和积分
        await Promise.all([
          collection.deleteOne({ _id: wechatDoc._id }),
          collection.updateOne(
            { _id: existingDeviceDoc._id },
            {
              $set: {
                wechatId: cleanWechatId,
                points: finalPoints,
                remark: existingDeviceDoc.remark || wechatDoc.remark || '',
                updatedAt: now,
              },
            }
          ),
        ]);

        deleteCachePattern('cache:devices:*').catch(() => {});
        const updated = await collection.findOne({ _id: existingDeviceDoc._id });

        return NextResponse.json({
          success: true,
          data: { ...updated, _id: updated?._id?.toString() },
          message: `微信 [${cleanWechatId}] 与设备 [${cleanDeviceId}] 绑定成功，已合并关联记录${
            mergePoints && wechatPoints > 0 ? `（累计合并积分 +${wechatPoints}）` : ''
          }`,
        });
      } else {
        // 目标设备记录不存在，直接将 deviceId 设置到当前微信记录上
        await collection.updateOne(
          { _id: wechatDoc._id },
          {
            $set: {
              deviceId: cleanDeviceId,
              deviceInfo: wechatDoc.deviceInfo?.includes('微信用户')
                ? `Android 设备 (${cleanDeviceId.slice(-6)})`
                : wechatDoc.deviceInfo,
              updatedAt: now,
            },
          }
        );

        deleteCachePattern('cache:devices:*').catch(() => {});
        const updated = await collection.findOne({ _id: wechatDoc._id });

        return NextResponse.json({
          success: true,
          data: { ...updated, _id: updated?._id?.toString() },
          message: resultMessage,
        });
      }
    }

    return NextResponse.json(
      { success: false, error: '未知的绑定模式或参数不合法' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '修改绑定关系失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/devices/bind - 修改绑定关系
 */
export async function POST(request: NextRequest) {
  return handleBindDevice(request);
}

/**
 * PUT /api/devices/bind - 修改绑定关系 (兼容 PUT 请求)
 */
export async function PUT(request: NextRequest) {
  return handleBindDevice(request);
}
