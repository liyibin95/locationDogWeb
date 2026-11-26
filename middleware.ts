import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/page-auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 公开路径白名单（登录页、API 鉴权路由、静态资源）
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/logs') || // 日志 API 自身具备独立 API Key 鉴权机制
    pathname.startsWith('/api/configs') || // 配置中心 API 具备鉴权机制与客户端接口
    pathname.startsWith('/api/messages') || // 消息中心 API 具备鉴权机制与客户端接口
    pathname.startsWith('/api/devices') || // 设备管理 API 具备鉴权机制与客户端接口
    pathname.startsWith('/api/feedbacks') || // 意见反馈 API
    pathname.startsWith('/api/apps') || // App 版本管理与更新检测 API
    pathname.startsWith('/api/upload') || // 上传接口具备独立鉴权机制
    pathname.startsWith('/uploads') || // 本地上传资源静态直链访问
    pathname.startsWith('/h5') || // H5 移动端公告与富文本页面（嵌入 Android App）
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    // 若已登录访问 /login，直接跳转至首页
    if (pathname === '/login') {
      const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
      const isAuthed = await verifyAuthToken(token);
      if (isAuthed) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. 页面访问鉴权校验
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthed = await verifyAuthToken(token);

  if (!isAuthed) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
