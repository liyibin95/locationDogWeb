export type FeedbackType = 'suggestion' | 'bug' | 'feature' | 'complaint' | 'other';

export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'closed';

export type FeedbackPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface FeedbackDocument {
  _id?: string;
  title: string;              // 意见/反馈标题
  content: string;            // 意见/反馈详细内容
  type: FeedbackType;         // 反馈类型：suggestion(产品建议), bug(缺陷反馈), feature(新功能需求), complaint(吐槽投诉), other(其它)
  status: FeedbackStatus;     // 处理状态：pending(待处理), processing(处理中), resolved(已解决), closed(已关闭)
  priority: FeedbackPriority; // 优先级：low(低), normal(普通), high(高), urgent(紧急)
  contact?: string;           // 提交人联系方式 (微信/手机/邮箱/QQ)
  deviceId?: string;          // 关联设备ID (Android 设备 ID 等)
  userId?: string;            // 用户ID / 用户名
  images?: string[];          // 截图/附件图片 URL 列表
  reply?: string;             // 管理员回复 / 处理结果
  repliedAt?: string | Date;  // 回复处理时间
  repliedBy?: string;         // 处理人员
  remark?: string;            // 内部备忘 / 备注
  ip?: string;                // 提交者 IP
  userAgent?: string;         // 客户端 User-Agent
  createdAt: string | Date;   // 创建时间
  updatedAt: string | Date;   // 更新时间
}

export interface CreateFeedbackInput {
  title: string;
  content: string;
  type?: FeedbackType;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  contact?: string;
  deviceId?: string;
  userId?: string;
  images?: string[];
  reply?: string;
  remark?: string;
  createdAt?: string | Date;
}

export interface UpdateFeedbackInput {
  _id: string;
  title?: string;
  content?: string;
  type?: FeedbackType;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  contact?: string;
  deviceId?: string;
  userId?: string;
  images?: string[];
  reply?: string;
  repliedBy?: string;
  remark?: string;
}

export interface FeedbackQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  priority?: string;
  deviceId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface FeedbackStats {
  total: number;
  pendingCount: number;
  processingCount: number;
  resolvedCount: number;
  closedCount: number;
  todayCount: number;
  suggestionCount: number;
  bugCount: number;
  featureCount: number;
  complaintCount: number;
  otherCount: number;
}
