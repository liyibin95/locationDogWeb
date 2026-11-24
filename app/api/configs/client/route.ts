import { NextRequest, NextResponse } from 'next/server';
import { getConfigsCollection } from '@/lib/mongodb';
import { getOrSetCache } from '@/lib/redis';
import { ConfigDocument } from '@/types/config';
import { Filter } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * 解析并格式化配置项的值
 */
function parseTypedValue(type: string, value: string): any {
  if (type === 'number') {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  if (type === 'boolean') {
    return value === 'true';
  }
  if (type === 'json') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * 计算配置规则的特异性优先级权重（Specific overrides Generic）
 * appId 精确匹配 > all
 * env 精确匹配 > all
 * channel 精确匹配 > all
 */
function getSpecificityScore(config: ConfigDocument, targetAppId?: string, targetEnv?: string, targetChannel?: string): number {
  let score = 0;
  if (targetAppId && config.appId === targetAppId) score += 100;
  if (targetEnv && config.environment === targetEnv) score += 20;
  if (targetChannel && config.channel && config.channel !== 'all' && config.channel === targetChannel) score += 5;
  return score;
}

/**
 * GET /api/configs/client
 * 供 Android App 启动或周期性同步配置的接口
 *
 * 请求参数：
 * - appId: 客户端应用包名/标识（例如 com.example.myapp）
 * - env: 客户端运行环境（prod / beta / dev，默认 prod）
 * - versionCode: 客户端版本号（整数，例如 102）
 * - channel: 渠道名（例如 googleplay, xiaomi, official）
 * - group: 指定拉取的分组（可选，例如 network，默认获取所有）
 * - key: 单独拉取某个指定 key（可选）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const appId = searchParams.get('appId')?.trim() || '';
    const env = searchParams.get('env')?.trim() || searchParams.get('environment')?.trim() || 'prod';
    const channel = searchParams.get('channel')?.trim() || '';
    const group = searchParams.get('group')?.trim() || '';
    const key = searchParams.get('key')?.trim() || '';
    const rawVersionCode = searchParams.get('versionCode');
    const versionCode = rawVersionCode ? parseInt(rawVersionCode, 10) : undefined;

    // 构造 Redis 缓存 Key
    const cacheKey = `cache:configs:client:${appId || 'all'}:${env}:${channel || 'all'}:${group || 'all'}:${key || 'all'}:${versionCode ?? 'none'}`;

    // 使用 Redis 缓存，默认有效时间 300 秒（5分钟），在后台修改配置时会主动清除
    const responseData = await getOrSetCache(
      cacheKey,
      async () => {
        const collection = await getConfigsCollection();

        // 仅查询已启用的配置项
        const filter: Filter<ConfigDocument> = {
          isEnabled: true,
        };

        if (group && group !== 'all') {
          filter.group = group;
        }

        if (key) {
          filter.key = key;
        }

        // 查询满足 appId (包含指定包名或 'all') 且满足 env (包含指定环境或 'all') 的所有记录
        if (appId) {
          filter.appId = { $in: [appId, 'all'] };
        }
        if (env) {
          filter.environment = { $in: [env as any, 'all'] };
        }

        const configs = await collection.find(filter).toArray();

        // 在内存中依据 Android 客户端实际属性进行过滤与覆盖解析
        const eligibleConfigs: ConfigDocument[] = [];

        for (const c of configs) {
          // 1. 渠道过滤
          if (channel && c.channel && c.channel !== 'all') {
            if (c.channel !== channel) {
              continue;
            }
          }

          // 2. 客户端版本范围匹配
          if (versionCode !== undefined && !isNaN(versionCode)) {
            if (c.minVersionCode !== undefined && versionCode < c.minVersionCode) {
              continue;
            }
            if (c.maxVersionCode !== undefined && versionCode > c.maxVersionCode) {
              continue;
            }
          }

          eligibleConfigs.push(c);
        }

        // 针对同 key 的配置，依据特异性优先级合并
        const resolvedMap: Record<string, any> = {};
        const resolvedItemsMap: Record<string, { config: ConfigDocument; score: number }> = {};
        let latestTimestamp = 0;

        for (const c of eligibleConfigs) {
          const score = getSpecificityScore(c, appId, env, channel);
          const existing = resolvedItemsMap[c.key];

          if (!existing || score > existing.score) {
            resolvedItemsMap[c.key] = { config: c, score };
          }

          const updateTime = new Date(c.updatedAt).getTime();
          if (updateTime > latestTimestamp) {
            latestTimestamp = updateTime;
          }
        }

        const finalItems = Object.values(resolvedItemsMap).map(({ config }) => {
          const parsed = parseTypedValue(config.type, config.value);
          resolvedMap[config.key] = parsed;
          return {
            key: config.key,
            value: parsed,
            rawValue: config.value,
            type: config.type,
            group: config.group,
            appId: config.appId,
            environment: config.environment,
            channel: config.channel,
            description: config.description,
            updatedAt: config.updatedAt,
          };
        });

        return {
          success: true,
          appId: appId || 'all',
          environment: env,
          configs: resolvedMap,
          items: finalItems,
          version: latestTimestamp || Date.now(),
          count: finalItems.length,
        };
      },
      300
    );

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取客户端配置失败' },
      { status: 500 }
    );
  }
}
