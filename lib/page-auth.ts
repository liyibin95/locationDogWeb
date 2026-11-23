export const AUTH_COOKIE_NAME = 'next_log_page_auth';

const DEFAULT_SECRET = 'next-log-page-auth-salt-2026';

/**
 * 基于 Web Crypto API 计算 SHA-256 哈希值
 * 兼容 Edge Runtime 与 Node.js 运行时
 */
async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成基于当前配置密码与密钥的身份令牌
 */
export async function getExpectedAuthToken(): Promise<string> {
  const password = process.env.PAGE_PASSWORD || 'admin123';
  const secret = process.env.PAGE_AUTH_SECRET || DEFAULT_SECRET;
  return sha256(`${password}:${secret}`);
}

/**
 * 校验客户端 Cookie 中的令牌是否合法
 */
export async function verifyAuthToken(token?: string | null): Promise<boolean> {
  if (!token) return false;
  const expectedToken = await getExpectedAuthToken();
  return token === expectedToken;
}

/**
 * 校验用户输入的密码是否正确
 */
export function verifyPassword(inputPassword: string): boolean {
  const configuredPassword = process.env.PAGE_PASSWORD || 'admin123';
  return inputPassword === configuredPassword;
}
