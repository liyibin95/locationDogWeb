import { NextResponse } from 'next/server';
import { getAppVersionsCollection } from '@/lib/mongodb';
import { getOrSetCache } from '@/lib/redis';
import { AppVersionStats } from '@/types/app-version';

export const dynamic = 'force-dynamic';

/**
 * GET /api/apps/versions/stats
 * 获取 App 版本的综合统计指标
 */
export async function GET() {
  try {
    const cacheKey = 'cache:apps:versions:stats';

    const stats = await getOrSetCache<AppVersionStats>(
      cacheKey,
      async () => {
        const collection = await getAppVersionsCollection();

        const [
          total,
          publishedCount,
          forceUpdateCount,
          distinctApps,
          latestVersion,
          downloadSumResult,
        ] = await Promise.all([
          collection.countDocuments(),
          collection.countDocuments({ status: 'published' }),
          collection.countDocuments({ forceUpdate: true }),
          collection.distinct('appId'),
          collection
            .find({ status: 'published' })
            .sort({ versionCode: -1, createdAt: -1 })
            .limit(1)
            .next(),
          collection
            .aggregate([
              {
                $group: {
                  _id: null,
                  totalDownloads: { $sum: '$downloadCount' },
                },
              },
            ])
            .toArray(),
        ]);

        const totalDownloads = downloadSumResult[0]?.totalDownloads || 0;

        return {
          total,
          publishedCount,
          totalDownloads,
          forceUpdateCount,
          activeAppsCount: distinctApps.length,
          latestVersionName: latestVersion?.versionName,
          latestVersionCode: latestVersion?.versionCode,
        };
      },
      60
    );

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取版本统计指标失败' },
      { status: 500 }
    );
  }
}
