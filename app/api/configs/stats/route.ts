import { NextResponse } from 'next/server';
import { getConfigsCollection } from '@/lib/mongodb';
import { getOrSetCache } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getOrSetCache(
      'cache:configs:stats',
      async () => {
        const collection = await getConfigsCollection();

        const [total, enabled, disabled, groupStats, appIdStats, envStats] = await Promise.all([
          collection.countDocuments(),
          collection.countDocuments({ isEnabled: true }),
          collection.countDocuments({ isEnabled: false }),
          collection
            .aggregate<{ _id: string; count: number }>([
              { $group: { _id: '$group', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ])
            .toArray(),
          collection
            .aggregate<{ _id: string; count: number }>([
              { $group: { _id: '$appId', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ])
            .toArray(),
          collection
            .aggregate<{ _id: string; count: number }>([
              { $group: { _id: '$environment', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ])
            .toArray(),
        ]);

        return {
          total,
          enabled,
          disabled,
          groups: groupStats.map((g) => ({ name: g._id || 'default', count: g.count })),
          appIds: appIdStats.map((a) => ({ name: a._id || 'all', count: a.count })),
          environments: envStats.map((e) => ({ name: e._id || 'all', count: e.count })),
        };
      },
      60
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取配置统计失败' },
      { status: 500 }
    );
  }
}
