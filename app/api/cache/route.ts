import { NextRequest, NextResponse } from 'next/server';
import { validateAdminOrApiKey } from '@/lib/auth';
import { redis, isRedisConfigured, deleteCachePattern } from '@/lib/redis';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cache - 查看 Redis 状态和当前缓存键
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const configured = isRedisConfigured();
    if (!configured) {
      return NextResponse.json({
        success: false,
        status: 'not_configured',
        message: 'Redis 环境变量未配置 (KV_REST_API_URL / KV_REST_API_TOKEN)',
      });
    }

    // 简单 Ping 测试
    const startTime = Date.now();
    await redis.set('cache:ping', 'pong', { ex: 10 });
    const pong = await redis.get<string>('cache:ping');
    const latency = Date.now() - startTime;

    const allCacheKeys = await redis.keys('cache:*');

    return NextResponse.json({
      success: true,
      status: pong === 'pong' ? 'healthy' : 'degraded',
      latencyMs: latency,
      totalCachedKeys: allCacheKeys.length,
      keys: allCacheKeys.slice(0, 50),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '检查缓存状态失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache - 手动清理指定模式或全部缓存
 * Body: { pattern?: string } (默认 'cache:*')
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const pattern = body.pattern || 'cache:*';

    const deletedCount = await deleteCachePattern(pattern);

    return NextResponse.json({
      success: true,
      message: `已清理匹配 "${pattern}" 的缓存`,
      deletedCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '清理缓存失败' },
      { status: 500 }
    );
  }
}
