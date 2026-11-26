import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { validateAdminOrApiKey } from '@/lib/auth';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

/**
 * POST /api/apps/upload
 * 上传打包后的 Android 安装包 (APK/AAB)
 *
 * 存储策略：
 * 1. 若配置了 Vercel Blob Token (BLOB_READ_WRITE_TOKEN)，优先上传至云端 Blob CDN 分发
 * 2. 若未配置云端 Token (如本地开发、独立 VPS 或 Docker 部署)，自动存储到 public/uploads/apps/ 目录提供静态下载
 * 3. 自动计算文件 MD5 与 SHA-256 完整性哈希，供客户端安全校验
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 鉴权校验
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: '未检测到上传文件' }, { status: 400 });
    }

    const originalName = file.name || 'app-release.apk';
    const lowerName = originalName.toLowerCase();

    // 检查是否为安装包文件
    if (!lowerName.endsWith('.apk') && !lowerName.endsWith('.aab') && !lowerName.endsWith('.zip')) {
      return NextResponse.json(
        { success: false, error: '仅支持上传 Android 安装包文件 (.apk, .aab, .zip)' },
        { status: 400 }
      );
    }

    // 读取 ArrayBuffer 并计算 MD5 和 SHA-256
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 格式化安全文件名
    const lastDotIndex = originalName.lastIndexOf('.');
    const ext = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '.apk';
    const safeBaseName = originalName
      .substring(0, lastDotIndex !== -1 ? lastDotIndex : originalName.length)
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .substring(0, 40);
    const uniqueFileName = `${Date.now()}_${safeBaseName}${ext}`;

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    // 策略 A: 存在 Vercel Blob Token，上传至云端存储
    if (blobToken) {
      try {
        const blob = await put(`apks/${uniqueFileName}`, file, {
          access: 'public',
          token: blobToken,
        });

        return NextResponse.json({
          success: true,
          url: blob.url,
          fileName: originalName,
          fileSize: file.size,
          fileMd5: md5Hash,
          fileSha256: sha256Hash,
          storage: 'vercel-blob',
          message: '安装包已成功上传至 Vercel Blob 云存储',
        });
      } catch (blobError: any) {
        console.warn('[Upload APK] Vercel Blob 上传失败，尝试降级本地存储:', blobError.message);
      }
    }

    // 策略 B: 本地文件系统存储 (适用于本地开发、私有化部署、Docker 容器)
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'apps');
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, uniqueFileName);
      await fs.writeFile(filePath, buffer);

      const relativeUrl = `/uploads/apps/${uniqueFileName}`;

      return NextResponse.json({
        success: true,
        url: relativeUrl,
        fileName: originalName,
        fileSize: file.size,
        fileMd5: md5Hash,
        fileSha256: sha256Hash,
        storage: 'local-disk',
        message: '安装包已成功存储至本地服务存储目录',
      });
    } catch (fsError: any) {
      return NextResponse.json(
        {
          success: false,
          error: `本地存储写入失败: ${fsError.message}。如果部署在只读 Serverless 环境（如 Vercel），请在环境变量中配置 BLOB_READ_WRITE_TOKEN 或直接填写外部下载直链。`,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || '安装包上传处理异常',
      },
      { status: 500 }
    );
  }
}
