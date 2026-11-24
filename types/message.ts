export type MessageType = 'announcement' | 'notification' | 'upgrade' | 'alert';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export type MessageStatus = 'published' | 'draft' | 'archived';

export type TargetType = 'all' | 'user' | 'channel' | 'version';

export interface MessageDocument {
  _id?: string;
  key?: string;
  title: string;
  content: string;
  type: MessageType;
  priority: MessagePriority;
  targetType: TargetType;
  targetValue?: string;
  appId: string;
  actionUrl?: string;
  actionText?: string;
  isPopup: boolean;
  extra?: Record<string, any>;
  status: MessageStatus;
  publishAt: string | Date;
  expireAt?: string | Date | null;
  readCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MessageReadDocument {
  _id?: string;
  messageId: string;
  userId: string;
  readAt: string | Date;
}

export interface CreateMessageInput {
  key?: string;
  title: string;
  content: string;
  type?: MessageType;
  priority?: MessagePriority;
  targetType?: TargetType;
  targetValue?: string;
  appId?: string;
  actionUrl?: string;
  actionText?: string;
  isPopup?: boolean;
  extra?: Record<string, any>;
  status?: MessageStatus;
  publishAt?: string | Date;
  expireAt?: string | Date | null;
}

export interface UpdateMessageInput extends Partial<CreateMessageInput> {
  _id?: string;
  key?: string;
}

export interface ClientMessageQuery {
  key?: string;
  appId?: string;
  userId?: string;
  versionCode?: number;
  channel?: string;
  type?: MessageType;
  popupOnly?: boolean;
  limit?: number;
}

export interface ClientMessageItem extends MessageDocument {
  isRead?: boolean;
}

export interface MessageStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  popupCount: number;
  alerts: number;
  byType: { type: string; count: number }[];
  appIds?: { name: string; count: number }[];
}
