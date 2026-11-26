import { NextResponse } from 'next/server';
import { getFeedbacksCollection } from '@/lib/mongodb';
import { getOrSetCache } from '@/lib/redis';
import { FeedbackStats } from '@/types/feedback';

export const dynamic = 'force-dynamic';

/**
 * GET /api/feedbacks/stats - 获取意见与建议统计概览
 */
export async function GET() {
  try {
    const cacheKey = 'cache:feedbacks:stats';

    const stats = await getOrSetCache(
      cacheKey,
      async () => {
        const collection = await getFeedbacksCollection();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [
          total,
          pendingCount,
          processingCount,
          resolvedCount,
          closedCount,
          todayCount,
          suggestionCount,
          bugCount,
          featureCount,
          complaintCount,
          otherCount,
        ] = await Promise.all([
          collection.countDocuments({}),
          collection.countDocuments({ status: 'pending' }),
          collection.countDocuments({ status: 'processing' }),
          collection.countDocuments({ status: 'resolved' }),
          collection.countDocuments({ status: 'closed' }),
          collection.countDocuments({ createdAt: { $gte: todayStart } }),
          collection.countDocuments({ type: 'suggestion' }),
          collection.countDocuments({ type: 'bug' }),
          collection.countDocuments({ type: 'feature' }),
          collection.countDocuments({ type: 'complaint' }),
          collection.countDocuments({ type: 'other' }),
        ]);

        const data: FeedbackStats = {
          total,
          pendingCount,
          processingCount,
          resolvedCount,
          closedCount,
          todayCount,
          suggestionCount,
          bugCount,
          featureCount,
          complaintCount,
          otherCount,
        };

        return data;
      },
      15
    );

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取意见反馈统计失败' },
      { status: 500 }
    );
  }
}
