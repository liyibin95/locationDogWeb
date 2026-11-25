import { NextResponse } from 'next/server';
import { getDevicesCollection } from '@/lib/mongodb';
import { getOrSetCache } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getOrSetCache(
      'cache:devices:stats',
      async () => {
        const collection = await getDevicesCollection();

        // 今天的零点时间戳
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [
          total,
          boundWechatCount,
          normalCount,
          disabledCount,
          todayNewCount,
          pointsAggregate,
        ] = await Promise.all([
          collection.countDocuments(),
          collection.countDocuments({
            wechatId: { $exists: true, $nin: ['', null] },
          }),
          collection.countDocuments({ status: 'normal' }),
          collection.countDocuments({ status: 'disabled' }),
          collection.countDocuments({ createdAt: { $gte: startOfToday } }),
          collection
            .aggregate<{ _id: null; totalPoints: number }>([
              { $group: { _id: null, totalPoints: { $sum: '$points' } } },
            ])
            .toArray(),
        ]);

        const totalPoints = pointsAggregate[0]?.totalPoints || 0;
        const unboundWechatCount = Math.max(0, total - boundWechatCount);

        return {
          total,
          boundWechatCount,
          unboundWechatCount,
          totalPoints,
          normalCount,
          disabledCount,
          todayNewCount,
        };
      },
      30
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取设备统计失败' },
      { status: 500 }
    );
  }
}
