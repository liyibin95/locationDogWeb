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
  Trash2,
} from 'lucide-react';
import { LogDocument, LogLevel, PaginationMeta } from '@/types/log';

interface LogTableProps {
  logs: LogDocument[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  onOpenCreate: () => void;
  onDeleteLog?: (id: string) => Promise<boolean>;
  onBatchDelete?: (ids: string[]) => Promise<boolean>;
}

export const LogTable: React.FC<LogTableProps> = ({
  logs,
  pagination,
  onPageChange,
  isLoading,
  onOpenCreate,
  onDeleteLog,
  onBatchDelete,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch';
    targetId?: string;
    count?: number;
  }>({ isOpen: false, type: 'single' });

  // 全选/反选本页
  const isAllSelected =
    logs.length > 0 && logs.every((l) => l._id && selectedIds.includes(l._id));
  const isSomeSelected =
    logs.some((l) => l._id && selectedIds.includes(l._id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = logs.map((l) => l._id).filter(Boolean) as string[];
      setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = logs.map((l) => l._id).filter(Boolean) as string[];
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!confirmDeleteModal.targetId || !onDeleteLog) return;
    setDeletingId(confirmDeleteModal.targetId);
    setConfirmDeleteModal({ isOpen: false, type: 'single' });
    try {
      const success = await onDeleteLog(confirmDeleteModal.targetId);
      if (success) {
        setSelectedIds((prev) => prev.filter((id) => id !== confirmDeleteModal.targetId));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0 || !onBatchDelete) return;
    setIsBatchDeleting(true);
    setConfirmDeleteModal({ isOpen: false, type: 'batch' });
    try {
      const success = await onBatchDelete(selectedIds);
      if (success) {
        setSelectedIds([]);
      }
    } finally {
      setIsBatchDeleting(false);
    }
  };

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
      {/* Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between border-b border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 text-xs text-indigo-300">
          <div className="flex items-center space-x-2">
            <span>
              已选择 <strong className="text-white font-semibold">{selectedIds.length}</strong> 条日志
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedIds([])}
              className="rounded px-2 py-1 text-slate-400 hover:text-white transition"
            >
              取消选择
            </button>
            <button
              onClick={() =>
                setConfirmDeleteModal({
                  isOpen: true,
                  type: 'batch',
                  count: selectedIds.length,
                })
              }
              disabled={isBatchDeleting}
              className="flex items-center space-x-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 px-3 py-1 font-medium text-white shadow transition disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isBatchDeleting ? '正在删除...' : `批量删除 (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
            <tr>
              <th className="py-3 pl-4 pr-1 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isSomeSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5"
                  title="全选 / 取消全选本页"
                />
              </th>
              <th className="py-3 px-2 font-medium w-36">时间</th>
              <th className="px-3 py-3 font-medium w-24">级别</th>
              <th className="px-3 py-3 font-medium w-32">服务</th>
              <th className="px-3 py-3 font-medium">消息内容</th>
              <th className="py-3 pl-2 pr-4 text-right font-medium w-28">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {logs.map((log) => {
              const isExpanded = expandedId === log._id;
              const isSelected = log._id ? selectedIds.includes(log._id) : false;
              const isThisDeleting = deletingId === log._id;

              return (
                <React.Fragment key={log._id || Math.random()}>
                  <tr
                    onClick={() => toggleExpand(log._id)}
                    className={`cursor-pointer transition hover:bg-slate-800/50 ${
                      isSelected
                        ? 'bg-indigo-500/10 hover:bg-indigo-500/15'
                        : isExpanded
                        ? 'bg-slate-800/40'
                        : ''
                    }`}
                  >
                    <td
                      className="py-3 pl-4 pr-1 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => log._id && toggleSelectOne(log._id, e as any)}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5"
                      />
                    </td>
                    <td className="py-3 px-2 text-slate-400 whitespace-nowrap">
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
                      <div className="flex items-center justify-end space-x-1.5">
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
                        {onDeleteLog && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (log._id) {
                                setConfirmDeleteModal({
                                  isOpen: true,
                                  type: 'single',
                                  targetId: log._id,
                                });
                              }
                            }}
                            disabled={isThisDeleting}
                            className="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition disabled:opacity-50"
                            title="删除日志"
                          >
                            <Trash2 className={`h-3.5 w-3.5 ${isThisDeleting ? 'animate-spin' : ''}`} />
                          </button>
                        )}
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
                      <td colSpan={6} className="p-4">
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

                          {/* Detail action row */}
                          {onDeleteLog && log._id && (
                            <div className="flex justify-end pt-2 border-t border-slate-800/80">
                              <button
                                onClick={() => {
                                  setConfirmDeleteModal({
                                    isOpen: true,
                                    type: 'single',
                                    targetId: log._id,
                                  });
                                }}
                                className="flex items-center space-x-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>删除本条日志</span>
                              </button>
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

      {/* Confirmation Modal */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">确认删除日志？</h4>
            </div>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              {confirmDeleteModal.type === 'batch'
                ? `您已选中 ${confirmDeleteModal.count} 条日志记录，确定要批量从数据库中永久删除吗？此操作不可逆。`
                : '确定要从数据库中永久删除本条日志记录吗？此操作不可逆。'}
            </p>
            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setConfirmDeleteModal({ isOpen: false, type: 'single' })}
                className="rounded-lg px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition"
              >
                取消
              </button>
              <button
                onClick={
                  confirmDeleteModal.type === 'batch'
                    ? handleConfirmBatchDelete
                    : handleConfirmSingleDelete
                }
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-rose-600/30 hover:bg-rose-500 transition"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
