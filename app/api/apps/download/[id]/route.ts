import { NextRequest, NextResponse } from 'next/server';
import { getAppVersionsCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/apps/download/[id]
 * 累计下载次数并重定向至实际 APK 下载地址
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: '无效的版本 ID' }, { status: 400 });
    }

    const collection = await getAppVersionsCollection();
    const objectId = new ObjectId(id);

    // 查询并自增下载量
    const version = await collection.findOneAndUpdate(
      { _id: objectId as any },
      { $inc: { downloadCount: 1 }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!version || !version.downloadUrl) {
      return NextResponse.json({ success: false, error: '未找到该版本的安装包或下载地址' }, { status: 404 });
    }

    let downloadUrl = version.downloadUrl;

    // 若为相对路径，补全协议与 host
    if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
      const protocol =
        request.headers.get('x-forwarded-proto') ||
        (request.url.startsWith('https') ? 'https' : 'http');
      const host =
        request.headers.get('x-forwarded-host') ||
        request.headers.get('host') ||
        'localhost:3000';
      const cleanUrl = downloadUrl.startsWith('/') ? downloadUrl : `/${downloadUrl}`;
      downloadUrl = `${protocol}://${host}${cleanUrl}`;
    }

    // 重定向至真实安装包下载地址
    return NextResponse.redirect(downloadUrl, { status: 302 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '重定向下载失败' },
      { status: 500 }
    );
  }
}
