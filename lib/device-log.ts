import { getLogsCollection } from '@/lib/mongodb';
import { deleteCachePattern } from '@/lib/redis';
import { LogDocument } from '@/types/log';

export interface RecordPointsLogParams {
  deviceId: string;
  deviceDbId?: string;
  deviceInfo?: string;
  beforePoints: number;
  afterPoints: number;
  changeValue: number;
  pointsDelta?: number;
  targetPoints?: number;
  reason?: string;
  operator?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * 记录设备积分变动日志到 logs 集合
 * 记录修改值 (changeValue)、修改前值 (beforePoints)、修改后值 (afterPoints)
 */
export async function recordDevicePointsLog(params: RecordPointsLogParams): Promise<void> {
  const {
    deviceId,
    deviceDbId,
    deviceInfo,
    beforePoints,
    afterPoints,
    changeValue,
    pointsDelta,
    targetPoints,
    reason,
    operator = 'system',
    ip = '',
    userAgent = '',
  } = params;

  const changeSign = changeValue >= 0 ? `+${changeValue}` : `${changeValue}`;
  const reasonText = reason?.trim() ? ` (事由: ${reason.trim()})` : '';
  const message = `设备 [${deviceId}] 积分已修改：变动值 ${changeSign}，修改前 ${beforePoints}，修改后 ${afterPoints}${reasonText}`;

  const logDoc: LogDocument = {
    level: 'info',
    message,
    service: 'device-service',
    tags: ['device', 'points', deviceId],
    details: {
      type: 'device_points_modified',
      deviceId,
      deviceDbId,
      deviceInfo,
      changeValue,
      beforePoints,
      afterPoints,
      pointsDelta: typeof pointsDelta === 'number' ? pointsDelta : undefined,
      targetPoints: typeof targetPoints === 'number' ? targetPoints : undefined,
      reason: reason?.trim() || undefined,
      operator,
    },
    ip: ip || undefined,
    userAgent: userAgent || undefined,
    createdAt: new Date(),
  };

  try {
    const logsCollection = await getLogsCollection();
    await logsCollection.insertOne(logDoc);
    // 失效日志列表和统计缓存，保证前端即时可见最新日志
    deleteCachePattern('cache:logs:*').catch(() => {});
  } catch (error) {
    console.error('记录设备积分变更日志失败:', error);
  }
}
