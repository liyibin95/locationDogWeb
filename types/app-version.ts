export type AppVersionStatus = 'published' | 'draft' | 'archived';

export interface AppVersionDocument {
  _id?: any;                  // 数据库 ID (前端为字符串，MongoDB 为 ObjectId)
  appId: string;              // 应用标识 (例如: 'com.example.app' 或 'default')
  appName: string;            // 应用名称 (例如: 'NextLog Android')
  versionName: string;        // 版本名称 (例如: '1.2.0')
  versionCode: number;        // 版本号 (数值类型，用于版本大小判定，例如: 10200)
  downloadUrl: string;        // 打包后 APK 的下载直链或相对服务路径
  fileName?: string;          // APK 文件名 (例如: 'app-v1.2.0-release.apk')
  fileSize?: number;          // 文件大小 (单位: 字节)
  fileMd5?: string;           // APK 文件 MD5 散列值 (用于客户端校验完整性)
  fileSha256?: string;        // APK 文件 SHA-256 散列值
  changelog?: string;         // 更新日志 / 发布说明 (支持换行与 Markdown)
  forceUpdate: boolean;       // 是否强制更新 (若为 true 则客户端弹窗不可取消)
  minVersionCode?: number;    // 最低支持版本号 (低于此版本号的旧客户端强制更新)
  channel?: string;           // 发布渠道 (例如: 'default', 'official', 'beta', 'googleplay')
  status: AppVersionStatus;   // 版本状态: published(已发布/生效中), draft(草稿), archived(已归档/下线)
  downloadCount: number;      // 累计下载次数
  createdAt: string | Date;   // 创建时间
  updatedAt: string | Date;   // 更新时间
}

export interface CreateAppVersionInput {
  appId: string;
  appName?: string;
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  fileName?: string;
  fileSize?: number;
  fileMd5?: string;
  fileSha256?: string;
  changelog?: string;
  forceUpdate?: boolean;
  minVersionCode?: number;
  channel?: string;
  status?: AppVersionStatus;
}

export interface UpdateAppVersionInput {
  _id: string;
  appId?: string;
  appName?: string;
  versionName?: string;
  versionCode?: number;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMd5?: string;
  fileSha256?: string;
  changelog?: string;
  forceUpdate?: boolean;
  minVersionCode?: number;
  channel?: string;
  status?: AppVersionStatus;
}

export interface AppVersionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  appId?: string;
  channel?: string;
  status?: string;
  sortBy?: 'versionCode' | 'createdAt' | 'downloadCount';
  sortOrder?: 'asc' | 'desc';
}

export interface AppVersionStats {
  total: number;              // 总版本记录数
  publishedCount: number;     // 已发布版本数
  totalDownloads: number;     // 累计下载量
  forceUpdateCount: number;   // 强制更新版本数
  activeAppsCount: number;    // 涉及的独立 App 数量
  latestVersionName?: string; // 最新版本名称
  latestVersionCode?: number; // 最新版本号
}

export interface AppCheckUpdateResponse {
  success: boolean;
  hasUpdate: boolean;         // 是否有新版本更新
  forceUpdate: boolean;       // 是否需要强制更新 (结合版本标记与 minVersionCode 计算得出)
  currentVersionCode?: number;// 客户端传入的当前版本号
  latestVersion?: {
    versionCode: number;
    versionName: string;
    appId: string;
    appName: string;
    downloadUrl: string;
    fileName?: string;
    fileSize?: number;
    fileMd5?: string;
    fileSha256?: string;
    changelog?: string;
    forceUpdate: boolean;
    minVersionCode?: number;
    channel?: string;
    publishTime?: string | Date;
  };
  message?: string;
  error?: string;
}
