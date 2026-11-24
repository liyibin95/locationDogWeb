import { NextResponse } from 'next/server';
import { getMessagesCollection } from '@/lib/mongodb';
import { getOrSetCache } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getOrSetCache(
      'cache:messages:stats',
      async () => {
        const collection = await getMessagesCollection();

        const [total, published, draft, archived, popupCount, alerts, byTypeStats, appIdStats] = await Promise.all([
          collection.countDocuments(),
          collection.countDocuments({ status: 'published' }),
          collection.countDocuments({ status: 'draft' }),
          collection.countDocuments({ status: 'archived' }),
          collection.countDocuments({ isPopup: true, status: 'published' }),
          collection.countDocuments({ type: 'alert', status: 'published' }),
          collection
            .aggregate<{ _id: string; count: number }>([
              { $group: { _id: '$type', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ])
            .toArray(),
          collection
            .aggregate<{ _id: string; count: number }>([
              { $group: { _id: '$appId', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ])
            .toArray(),
        ]);

        return {
          total,
          published,
          draft,
          archived,
          popupCount,
          alerts,
          byType: byTypeStats.map((t) => ({ type: t._id || 'unknown', count: t.count })),
          appIds: appIdStats.map((a) => ({ name: a._id || 'all', count: a.count })),
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
      { success: false, error: error.message || '获取消息统计失败' },
      { status: 500 }
    );
  }
}
