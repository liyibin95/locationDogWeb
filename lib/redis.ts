/**
 * Vercel KV / Upstash Redis 客户端封装
 *
 * 基于 Upstash REST API 原生实现，完美适配 Next.js (Node.js & Edge Runtime)，
 * 无需引入额外底层长连接依赖，天生契合 Serverless 架构。
 *
 * 具备以下特性：
 * 1. 自动读取 Vercel KV 标准环境变量（KV_REST_API_URL / KV_REST_API_TOKEN）及兼容前缀
 * 2. 自动处理 JSON 序列化与反序列化
 * 3. 超时保护机制（默认 2 秒超时降级，绝不因缓存网络波动拖慢主业务）
 * 4. 自动容错降级：Redis 不可用或网络异常时自动降级回源数据库
 * 5. 开箱即用的 getOrSetCache 缓存包装器
 */

const KV_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.resume_KV_REST_API_URL ||
  '';

const KV_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.resume_KV_REST_API_TOKEN ||
  '';

/**
 * 检查 Redis 配置是否已就绪
 */
export function isRedisConfigured(): boolean {
  return Boolean(KV_URL && KV_TOKEN);
}

/**
 * 执行底层 Redis REST 命令
 */
async function executeCommand<T = any>(command: any[], timeoutMs = 2000): Promise<T | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(KV_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[Redis] HTTP ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    if (data.error) {
      console.warn(`[Redis] Command error:`, data.error);
      return null;
    }

    return data.result as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`[Redis] Request timed out (${timeoutMs}ms) for command:`, command[0]);
    } else {
      console.warn(`[Redis] Network error:`, error?.message || error);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Redis 基础方法接口
 */
export const redis = {
  /**
   * 获取缓存
   */
  async get<T = any>(key: string): Promise<T | null> {
    const raw = await executeCommand<any>(['GET', key]);
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    }
    return raw as T;
  },

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值（对象会自动转为 JSON 字符串）
   * @param ex 过期时间（秒）
   */
  async set(key: string, value: any, options?: { ex?: number }): Promise<boolean> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const cmd: any[] = ['SET', key, serialized];
    if (options?.ex && options.ex > 0) {
      cmd.push('EX', options.ex);
    }
    const result = await executeCommand<string>(cmd);
    return result === 'OK';
  },

  /**
   * 删除一个或多个缓存
   */
  async del(...keys: string[]): Promise<number> {
    if (!keys.length) return 0;
    const result = await executeCommand<number>(['DEL', ...keys]);
    return result || 0;
  },

  /**
   * 查找匹配 pattern 的所有键
   */
  async keys(pattern: string): Promise<string[]> {
    const result = await executeCommand<string[]>(['KEYS', pattern]);
    return Array.isArray(result) ? result : [];
  },

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const result = await executeCommand<number>(['EXISTS', key]);
    return result === 1;
  },
};

/**
 * 便捷缓存工具：获取或计算并写入缓存
 *
 * 1. 尝试从 Redis 读取，命中的话直接返回反序列化数据
 * 2. 未命中或 Redis 异常时，执行 fetcher 回源
 * 3. 将回源结果异步写入 Redis（不阻塞返回），并设置 TTL
 *
 * @param key 缓存键名
 * @param fetcher 回源查询方法
 * @param ttlSeconds 缓存有效期（秒），默认 60 秒
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  // 1. 尝试从缓存中读取
  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (err) {
    console.warn(`[Cache] Error reading key "${key}":`, err);
  }

  // 2. 回源查询
  const freshData = await fetcher();

  // 3. 异步写入缓存（无需 await，避免占用响应时间）
  if (freshData !== null && freshData !== undefined) {
    redis.set(key, freshData, { ex: ttlSeconds }).catch((err) => {
      console.warn(`[Cache] Failed to set key "${key}":`, err);
    });
  }

  return freshData;
}

/**
 * 批量删除匹配指定模式前缀的缓存（如 "cache:configs:*"）
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  try {
    const matchedKeys = await redis.keys(pattern);
    if (matchedKeys && matchedKeys.length > 0) {
      return await redis.del(...matchedKeys);
    }
  } catch (err) {
    console.warn(`[Cache] Error deleting pattern "${pattern}":`, err);
  }
  return 0;
}
