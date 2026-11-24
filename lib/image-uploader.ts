/**
 * 图像处理与存储策略工具
 *
 * 策略规则：
 * - 小于等于 64KB：优先转换为 Base64 内联格式（零延迟、免云存储配额开销）
 * - 大于 64KB：自动上传至 Vercel Blob Store，生成全球 CDN 分发地址；
 *   如未配置 Vercel Blob Token 或上传失败，支持优雅降级为 Base64
 */

export const IMAGE_SIZE_THRESHOLD = 64 * 1024; // 64 KB

export interface ImageUploadResult {
  url: string;
  storage: 'base64' | 'vercel-blob' | 'base64-fallback';
  size: number;
  filename: string;
  warning?: string;
}

/**
 * 将 File 转换为 Base64 Data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('转换 Base64 失败'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 处理单张图片上传：按文件尺寸智能决定 Base64 或 Vercel Blob
 */
export async function processAndUploadImage(
  file: File,
  apiKey: string,
  onProgress?: (status: string) => void
): Promise<ImageUploadResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择有效的图片文件 (PNG, JPG, GIF, WebP, SVG)');
  }

  const filename = file.name || 'image.png';

  // 1. 小图策略 (<= 64KB) -> 直接使用 Base64
  if (file.size <= IMAGE_SIZE_THRESHOLD) {
    onProgress?.('图片较小 (<= 64KB)，正在转为 Base64 快速嵌入...');
    const base64 = await fileToBase64(file);
    return {
      url: base64,
      storage: 'base64',
      size: file.size,
      filename,
    };
  }

  // 2. 大图策略 (> 64KB) -> 上传至 Vercel Blob Store
  onProgress?.(`图片大小 ${(file.size / 1024).toFixed(1)} KB，正在上传至 Vercel Blob Store...`);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData,
    });

    const data = await res.json();

    if (res.ok && data.success && data.url) {
      return {
        url: data.url,
        storage: 'vercel-blob',
        size: file.size,
        filename,
      };
    }

    // 若上传失败或未配置 Token，询问或直接降级为 Base64
    const errMsg = data.error || 'Vercel Blob 上传失败';
    const confirmFallback = window.confirm(
      `上传至 Vercel Blob 失败: ${errMsg}\n\n是否降级直接使用 Base64 格式嵌入？（注意：大图 Base64 会增大消息体积）`
    );

    if (confirmFallback) {
      onProgress?.('已降级为 Base64 编码嵌入...');
      const fallbackBase64 = await fileToBase64(file);
      return {
        url: fallbackBase64,
        storage: 'base64-fallback',
        size: file.size,
        filename,
        warning: '由于 Vercel Blob 未配置或上传失败，已降级为 Base64 嵌入',
      };
    }

    throw new Error(errMsg);
  } catch (err: any) {
    // 若网络异常且用户同意，也支持降级
    if (err.message.includes('降级')) {
      throw err;
    }
    const confirmFallback = window.confirm(
      `网络请求异常: ${err.message}\n\n是否降级直接使用 Base64 格式嵌入？`
    );
    if (confirmFallback) {
      const fallbackBase64 = await fileToBase64(file);
      return {
        url: fallbackBase64,
        storage: 'base64-fallback',
        size: file.size,
        filename,
        warning: '网络上传异常，已降级为 Base64 嵌入',
      };
    }
    throw err;
  }
}
