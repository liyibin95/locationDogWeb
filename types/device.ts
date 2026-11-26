export type DeviceStatus = 'normal' | 'disabled';

export interface DeviceDocument {
  _id?: string;
  deviceId: string;          // 设备唯一标识 (Android ID / OAID / 自定义设备ID)
  deviceInfo: string;        // 设备详细信息 (如：Xiaomi Redmi K60 / Android 14)
  brand?: string;            // 品牌 (如 Xiaomi, Huawei, OPPO, vivo, Samsung)
  model?: string;            // 型号 (如 23013RK75C)
  osVersion?: string;        // 系统版本 (如 Android 14 / API 34)
  wechatId?: string;         // 绑定的微信 ID (微信号 / OpenID / UnionID)
  points: number;            // 积分数量
  status: DeviceStatus;      // 设备状态 (normal: 正常, disabled: 禁用)
  remark?: string;           // 备注信息
  ip?: string;               // 最近访问/注册 IP
  createdAt: string | Date;  // 注册时间
  updatedAt: string | Date;  // 最后活跃/更新时间
}

export interface CreateDeviceInput {
  deviceId: string;
  deviceInfo: string;
  brand?: string;
  model?: string;
  osVersion?: string;
  wechatId?: string;
  points?: number;
  status?: DeviceStatus;
  remark?: string;
  createdAt?: string | Date;
}

export interface UpdateDeviceInput {
  _id?: string;
  deviceId?: string;
  newDeviceId?: string;
  deviceInfo?: string;
  brand?: string;
  model?: string;
  osVersion?: string;
  wechatId?: string;
  points?: number;
  pointsDelta?: number;      // 快捷积分增减（如 +10, -5）
  status?: DeviceStatus;
  remark?: string;
  reason?: string;           // 积分调整事由
}

export interface DeviceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  wechatStatus?: 'all' | 'bound' | 'unbound';
  sortBy?: 'createdAt' | 'points' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface DeviceStats {
  total: number;
  boundWechatCount: number;
  unboundWechatCount: number;
  totalPoints: number;
  normalCount: number;
  disabledCount: number;
  todayNewCount: number;
}
