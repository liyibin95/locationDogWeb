import { NextResponse } from 'next/server';
import { getLogsCollection } from '@/lib/mongodb';
import { getOrSetCache } from '@/lib/redis';

export const dynamic = 'force-dynamic';

/**
 * GET /api/logs/stats - 获取日志统计概览
 */
export async function GET() {
  try {
    const stats = await getOrSetCache(
      'cache:logs:stats',
      async () => {
        const collection = await getLogsCollection();

        const [total, levelStats, services] = await Promise.all([
          collection.countDocuments(),
          collection
            .aggregate([
              {
                $group: {
                  _id: '$level',
                  count: { $sum: 1 },
                },
              },
            ])
            .toArray(),
          collection
            .aggregate([
              {
                $group: {
                  _id: '$service',
                  count: { $sum: 1 },
                },
              },
              { $sort: { count: -1 } },
              { $limit: 10 },
            ])
            .toArray(),
        ]);

        const res = {
          total,
          info: 0,
          warn: 0,
          error: 0,
          debug: 0,
          services: services.map((s) => ({
            name: s._id || 'unknown',
            count: s.count,
          })),
        };

        levelStats.forEach((item) => {
          if (item._id in res) {
            (res as any)[item._id] = item.count;
          }
        });

        return res;
      },
      30
    );

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching log stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取统计信息失败',
      },
      { status: 500 }
    );
  }
}
