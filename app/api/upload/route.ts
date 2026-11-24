import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { validateAdminOrApiKey } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * 上传图片至 Vercel Blob Store (当图片大于特定阈值，如 64KB 时调用)
 */
export async function POST(request: NextRequest) {
  try {
    // 校验管理会话或 API Key 凭证
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: '未检测到上传文件' }, { status: 400 });
    }

    // 格式检查
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: '仅支持上传图片文件 (JPEG/PNG/GIF/WEBP/SVG)' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '服务端未配置 BLOB_READ_WRITE_TOKEN。如需使用 Vercel Blob 存储，请在 Vercel Storage 中绑定 Blob 或在 .env.local 中配置 token。',
          canFallbackBase64: true,
        },
        { status: 503 }
      );
    }

    // 生成唯一且安全的文件名
    const originalName = file.name || 'image.png';
    const lastDotIndex = originalName.lastIndexOf('.');
    const ext = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '.png';
    const safeBaseName = originalName
      .substring(0, lastDotIndex !== -1 ? lastDotIndex : originalName.length)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    const uniqueFilename = `announcements/${Date.now()}_${safeBaseName}${ext}`;

    const blob = await put(uniqueFilename, file, {
      access: 'public',
      token,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      size: file.size,
      storage: 'vercel-blob',
      message: '图片已成功上传至 Vercel Blob Store',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || '上传图片至 Vercel Blob 失败',
        canFallbackBase64: true,
      },
      { status: 500 }
    );
  }
}
