import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/page-auth';

/**
 * 日志写入与管理接口鉴权工具
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

/**
 * 校验写操作/管理操作鉴权：支持页面 Cookie 认证或者 API Key 鉴权
 */
export async function validateAdminOrApiKey(request: Request): Promise<AuthResult> {
  // 1. 优先检查页面 Cookie 鉴权
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`));
  const token = match ? match[1] : null;

  if (token) {
    const isPageAuthed = await verifyAuthToken(token);
    if (isPageAuthed) {
      return { authenticated: true };
    }
  }

  // 2. 检查 API Key 鉴权
  return validateApiKey(request);
}

