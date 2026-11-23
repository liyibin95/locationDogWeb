export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogDocument {
  _id?: string;
  level: LogLevel;
  message: string;
  service?: string;
  tags?: string[];
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: string | Date;
}

export interface CreateLogInput {
  level: LogLevel;
  message: string;
  service?: string;
  tags?: string[];
  details?: Record<string, any>;
}

export interface LogQueryParams {
  page?: number;
  limit?: number;
  level?: LogLevel | 'all';
  service?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LogListResponse {
  success: boolean;
  data: LogDocument[];
  pagination: PaginationMeta;
  error?: string;
}

export interface LogStats {
  total: number;
  info: number;
  warn: number;
  error: number;
  debug: number;
  services: { name: string; count: number }[];
}
