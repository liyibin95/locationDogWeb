import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getExpectedAuthToken, verifyPassword } from '@/lib/page-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: '请输入访问密码' },
        { status: 400 }
      );
    }

    const isValid = verifyPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '访问密码错误，请重新输入' },
        { status: 401 }
      );
    }

    const token = await getExpectedAuthToken();

    const response = NextResponse.json({
      success: true,
      message: '验证通过，已授权访问',
    });

    // 设置安全 HttpOnly Cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 天有效期
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '登录验证失败' },
      { status: 500 }
    );
  }
}
