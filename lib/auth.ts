/**
 * 日志写入接口鉴权工具
 */

export interface AuthResult {
  authenticated: boolean;
  reason?: string;
}

/**
 * 验证请求中的 API Key
 * 支持 Header:
 * 1. x-api-key: <KEY>
 * 2. Authorization: Bearer <KEY>
 */
export function validateApiKey(request: Request): AuthResult {
  const configuredKey = process.env.LOG_API_KEY;

  if (!configuredKey) {
    return {
      authenticated: false,
      reason: '服务端未配置 LOG_API_KEY 环境变量，请在环境变量中设置。',
    };
  }

  // 1. 尝试从 x-api-key 获取
  let providedKey = request.headers.get('x-api-key');

  // 2. 尝试从 Authorization: Bearer <token> 获取
  if (!providedKey) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7).trim();
    }
  }

  if (!providedKey) {
    return {
      authenticated: false,
      reason: '缺少鉴权凭证：请在请求头中携带 x-api-key 或 Authorization: Bearer <API_KEY>',
    };
  }

  // 支持以逗号分隔配置多个有效 API Key
  const validKeys = configuredKey.split(',').map((k) => k.trim());
  const isValid = validKeys.includes(providedKey);

  if (!isValid) {
    return {
      authenticated: false,
      reason: 'API Key 无效或未授权。',
    };
  }

  return { authenticated: true };
}
