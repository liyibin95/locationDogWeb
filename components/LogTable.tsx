'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Globe,
  HardDrive,
  Terminal,
} from 'lucide-react';
import { LogDocument, LogLevel, PaginationMeta } from '@/types/log';

interface LogTableProps {
  logs: LogDocument[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  onOpenCreate: () => void;
}

export const LogTable: React.FC<LogTableProps> = ({
  logs,
  pagination,
  onPageChange,
  isLoading,
  onOpenCreate,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id?: string) => {
    if (!id) return;
    setExpandedId(expandedId === id ? null : id);
  };

  const copyLogJson = (log: LogDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    if (log._id) {
      setCopiedId(log._id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/30">
            <AlertCircle className="h-3 w-3" />
            <span>ERROR</span>
          </span>
        );
      case 'warn':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-3 w-3" />
            <span>WARN</span>
          </span>
        );
      case 'debug':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/30">
            <Bug className="h-3 w-3" />
            <span>DEBUG</span>
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-400 border border-sky-500/30">
            <CheckCircle2 className="h-3 w-3" />
            <span>INFO</span>
          </span>
        );
    }
  };

  const formatDate = (dateVal: string | Date) => {
    try {
      const d = new Date(dateVal);
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return String(dateVal);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-400">正在查询日志数据...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
        <Terminal className="mx-auto h-12 w-12 text-slate-600" />
        <h3 className="mt-3 text-base font-semibold text-slate-300">暂无匹配的日志记录</h3>
        <p className="mt-1 text-xs text-slate-500">
          尝试调整筛选条件，或者点击下方按钮通过带有鉴权的 API 新增日志。
        </p>
        <button
          onClick={onOpenCreate}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
        >
          立即新增日志
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
            <tr>
              <th className="py-3 pl-4 pr-2 font-medium w-40">时间</th>
              <th className="px-3 py-3 font-medium w-24">级别</th>
              <th className="px-3 py-3 font-medium w-32">服务</th>
              <th className="px-3 py-3 font-medium">消息内容</th>
              <th className="py-3 pl-2 pr-4 text-right font-medium w-20">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {logs.map((log) => {
              const isExpanded = expandedId === log._id;

              return (
                <React.Fragment key={log._id || Math.random()}>
                  <tr
                    onClick={() => toggleExpand(log._id)}
                    className={`cursor-pointer transition hover:bg-slate-800/50 ${
                      isExpanded ? 'bg-slate-800/40' : ''
                    }`}
                  >
                    <td className="py-3 pl-4 pr-2 text-slate-400 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getLevelBadge(log.level)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 border border-slate-700">
                        {log.service || 'default'}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-sans text-slate-200 break-words max-w-md">
                      <span className="line-clamp-1">{log.message}</span>
                      {log.tags && log.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {log.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-slate-800/80 px-1.5 py-0.2 text-[10px] text-slate-400"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => copyLogJson(log, e)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                          title="复制 JSON"
                        >
                          {copiedId === log._id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(log._id);
                          }}
                          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <tr className="bg-slate-950/70 border-b border-slate-800">
                      <td colSpan={5} className="p-4">
                        <div className="space-y-3 font-sans text-xs">
                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-4 text-slate-400">
                            <div className="flex items-center space-x-1">
                              <HardDrive className="h-3.5 w-3.5 text-slate-500" />
                              <span>ID:</span>
                              <span className="font-mono text-slate-300">{log._id}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Globe className="h-3.5 w-3.5 text-slate-500" />
                              <span>客户端 IP:</span>
                              <span className="font-mono text-slate-300">{log.ip || '-'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Terminal className="h-3.5 w-3.5 text-slate-500" />
                              <span>User-Agent:</span>
                              <span
                                className="truncate max-w-xs text-slate-300"
                                title={log.userAgent}
                              >
                                {log.userAgent || '-'}
                              </span>
                            </div>
                          </div>

                          {/* Full Message */}
                          <div>
                            <span className="font-semibold text-slate-300">完整消息：</span>
                            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-900 border border-slate-800 p-2.5 font-mono text-slate-200">
                              {log.message}
                            </p>
                          </div>

                          {/* Details JSON if present */}
                          {log.details && (
                            <div>
                              <span className="font-semibold text-slate-300">附加结构化信息 (Details)：</span>
                              <pre className="mt-1 max-h-60 overflow-y-auto rounded-lg bg-slate-900 border border-slate-800 p-3 font-mono text-[11px] text-emerald-400">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-400 gap-3">
        <div>
          共 <span className="font-semibold text-slate-200">{pagination.total}</span> 条日志
          ，当前第{' '}
          <span className="font-semibold text-slate-200">
            {pagination.page} / {pagination.totalPages}
          </span>{' '}
          页
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>上一页</span>
          </button>

          <span className="px-2 font-medium text-slate-300">
            {pagination.page}
          </span>

          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
          >
            <span>下一页</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
