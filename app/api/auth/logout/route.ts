import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/page-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '已成功退出登录',
  });

  response.cookies.delete(AUTH_COOKIE_NAME);

  return response;
}
