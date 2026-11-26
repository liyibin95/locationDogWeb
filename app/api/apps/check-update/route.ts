import { NextRequest, NextResponse } from 'next/server';
import { getAppVersionsCollection } from '@/lib/mongodb';
import { AppVersionDocument } from '@/types/app-version';
import { Filter } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * 辅助函数：将可能为相对路径的 downloadUrl 组装为包含当前主机协议与域名的完整绝对 URL
 */
function toAbsoluteUrl(url: string, request: NextRequest): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const protocol =
    request.headers.get('x-forwarded-proto') ||
    (request.url.startsWith('https') ? 'https' : 'http');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${protocol}://${host}${cleanUrl}`;
}

async function handleCheckUpdate(
  appId: string,
  versionCodeStr: string | null | number,
  versionName: string | null,
  channel: string | null,
  request: NextRequest
) {
  try {
    const targetAppId = (appId || 'default').trim();
    const clientVersionCode = Math.max(0, parseInt(String(versionCodeStr || '0'), 10) || 0);
    const targetChannel = channel?.trim();

    const collection = await getAppVersionsCollection();

    // 构建查询条件：已发布状态，匹配 appId
    const filter: Filter<AppVersionDocument> = {
      appId: targetAppId,
      status: 'published',
    };

    // 若指定了渠道，优先匹配对应渠道或未指定渠道的通用版本
    if (targetChannel && targetChannel !== 'all' && targetChannel !== 'default') {
      filter.$or = [
        { channel: targetChannel },
        { channel: { $in: ['', 'default', null as any] } },
        { channel: { $exists: false } },
      ];
    }

    // 按 versionCode 降序排列获取最高版本
    const latest = await collection
      .find(filter)
      .sort({ versionCode: -1, createdAt: -1 })
      .limit(1)
      .next();

    if (!latest) {
      return NextResponse.json({
        success: true,
        hasUpdate: false,
        forceUpdate: false,
        currentVersionCode: clientVersionCode,
        message: '暂无适用的发布版本',
      });
    }

    // 判断是否有新版本更新
    const hasUpdate = latest.versionCode > clientVersionCode;

    // 判断是否强制更新：
    // 1. 最新版本标记了 forceUpdate = true
    // 2. 或者配置了 minVersionCode 且当前客户端版本低于最低兼容版本
    let forceUpdate = Boolean(latest.forceUpdate);
    if (latest.minVersionCode != null && latest.minVersionCode > 0) {
      if (clientVersionCode < latest.minVersionCode) {
        forceUpdate = true;
      }
    }

    // 格式化下载链接 (确保客户端获取到可直接访问的绝对 URL)
    const absoluteDownloadUrl = toAbsoluteUrl(latest.downloadUrl, request);

    // 统计下载的重定向地址
    const trackDownloadUrl = latest._id
      ? toAbsoluteUrl(`/api/apps/download/${latest._id.toString()}`, request)
      : absoluteDownloadUrl;

    return NextResponse.json({
      success: true,
      hasUpdate,
      forceUpdate,
      currentVersionCode: clientVersionCode,
      latestVersion: {
        versionCode: latest.versionCode,
        versionName: latest.versionName,
        appId: latest.appId,
        appName: latest.appName || 'NextLog App',
        downloadUrl: absoluteDownloadUrl,
        trackDownloadUrl, // 具备自动累加下载计数的链接
        fileName: latest.fileName,
        fileSize: latest.fileSize,
        fileMd5: latest.fileMd5,
        fileSha256: latest.fileSha256,
        changelog: latest.changelog || '',
        forceUpdate: latest.forceUpdate,
        minVersionCode: latest.minVersionCode,
        channel: latest.channel || 'default',
        publishTime: latest.createdAt,
      },
      message: hasUpdate
        ? `发现新版本 ${latest.versionName} (${latest.versionCode})`
        : '当前已是最新版本',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        hasUpdate: false,
        forceUpdate: false,
        error: error.message || '检查版本更新异常',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/apps/check-update?appId=xxx&versionCode=100&versionName=1.0.0&channel=official
 * Android 客户端通过 GET 请求查询版本是否更新
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId') || 'default';
  const versionCode = searchParams.get('versionCode') || '0';
  const versionName = searchParams.get('versionName');
  const channel = searchParams.get('channel');

  return handleCheckUpdate(appId, versionCode, versionName, channel, request);
}

/**
 * POST /api/apps/check-update
 * Android 客户端通过 POST JSON 请求查询版本是否更新
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const appId = body.appId || 'default';
    const versionCode = body.versionCode ?? '0';
    const versionName = body.versionName ?? null;
    const channel = body.channel ?? null;

    return handleCheckUpdate(appId, versionCode, versionName, channel, request);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        hasUpdate: false,
        forceUpdate: false,
        error: error.message || '解析请求体失败',
      },
      { status: 400 }
    );
  }
}
