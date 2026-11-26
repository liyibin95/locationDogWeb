'use client';

import React, { useState } from 'react';
import { MessageDocument, MessageType, MessagePriority } from '@/types/message';
import {
  Bell,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Smartphone,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface MessageTableProps {
  messages: MessageDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  isLoading: boolean;
  onOpenCreate: () => void;
  onEditMessage: (message: MessageDocument) => void;
  onDeleteMessage: (id: string) => Promise<boolean>;
  onToggleStatus: (message: MessageDocument) => Promise<boolean>;
  onPreviewMessage: (message: MessageDocument) => void;
}

export const MessageTable: React.FC<MessageTableProps> = ({
  messages,
  pagination,
  onPageChange,
  isLoading,
  onOpenCreate,
  onEditMessage,
  onDeleteMessage,
  onToggleStatus,
  onPreviewMessage,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除此消息吗？删除后客户端将不再展示该条内容。')) {
      return;
    }
    setDeletingId(id);
    try {
      await onDeleteMessage(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeBadge = (type: MessageType) => {
    switch (type) {
      case 'announcement':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'upgrade':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'alert':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
  };

  const getPriorityBadge = (priority: MessagePriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'low':
        return 'bg-slate-700 text-slate-400 border-slate-600';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const formatTypeLabel = (type: MessageType) => {
    switch (type) {
      case 'announcement':
        return '公告';
      case 'notification':
        return '通知';
      case 'upgrade':
        return '升级';
      case 'alert':
        return '告警';
    }
  };

  const formatDate = (dateInput: string | Date | undefined | null) => {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400">
            <tr>
              <th className="px-4 py-3">消息标题与正文</th>
              <th className="px-4 py-3">类型 / 优先级</th>
              <th className="px-4 py-3">定向受众 (Target)</th>
              <th className="px-4 py-3">弹窗 & 落地动作</th>
              <th className="px-4 py-3 text-center">状态 / 已读</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                    <span>加载消息列表中...</span>
                  </div>
                </td>
              </tr>
            ) : messages.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-3">
                    <div className="rounded-full bg-slate-800/80 p-3 text-slate-400">
                      <Bell className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium text-slate-300">暂无消息或公告</div>
                    <p className="text-xs text-slate-500">
                      尚未创建任何消息。消息中心可面向 Android App 客户端下发系统维护公告、版本更新提示、站内通知和启动弹窗。
                    </p>
                    <button
                      onClick={onOpenCreate}
                      className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>发布首条消息</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              messages.map((message) => {
                const id = message._id!;
                const isDeleting = deletingId === id;

                return (
                  <tr key={id} className="hover:bg-slate-800/40 transition-colors group">
                    {/* Title & Content */}
                    <td className="px-4 py-3.5 max-w-sm">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => onPreviewMessage(message)}
                          className="font-semibold text-white line-clamp-1 hover:text-indigo-400 text-left transition"
                          title="点击在真机模型中预览 Markdown 渲染效果"
                        >
                          {message.title}
                        </button>
                        <span className="rounded bg-indigo-500/10 px-1 py-0.2 text-[9px] font-mono text-indigo-400 border border-indigo-500/20">
                          MD
                        </span>
                        {message.key && (
                          <span
                            className="rounded bg-indigo-950/60 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 border border-indigo-500/30"
                            title={`唯一标识 Key: ${message.key}`}
                          >
                            key: {message.key}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2 font-mono">
                        {message.content}
                      </p>
                      <div className="mt-1 flex items-center space-x-2 text-[10px] text-slate-500">
                        <span>发布: {formatDate(message.publishAt)}</span>
                        {message.expireAt && (
                          <span>· 过期: {formatDate(message.expireAt)}</span>
                        )}
                      </div>
                    </td>

                    {/* Type & Priority */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span
                          className={`inline-flex items-center w-max rounded px-1.5 py-0.5 text-[10px] font-medium border ${getTypeBadge(
                            message.type
                          )}`}
                        >
                          {formatTypeLabel(message.type)}
                        </span>
                        <span
                          className={`inline-flex items-center w-max rounded px-1.5 py-0.5 text-[10px] font-mono border ${getPriorityBadge(
                            message.priority
                          )}`}
                        >
                          {message.priority}
                        </span>
                      </div>
                    </td>

                    {/* Target & App */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                            message.appId === 'all'
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                          }`}
                        >
                          App: {message.appId}
                        </span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 border border-slate-700">
                          受众: {message.targetType}
                          {message.targetValue ? ` (${message.targetValue})` : ''}
                        </span>
                      </div>
                    </td>

                    {/* Popup & Action Link */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        {message.isPopup ? (
                          <span className="inline-flex items-center space-x-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                            <Sparkles className="h-3 w-3" />
                            <span>启动强弹窗</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">常规列表</span>
                        )}

                        {message.actionUrl && (
                          <div className="flex items-center space-x-1 text-[11px] text-indigo-300 truncate max-w-[160px]" title={message.actionUrl}>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{message.actionText || message.actionUrl}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status & Read Count */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => onToggleStatus(message)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium transition cursor-pointer border ${
                          message.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : message.status === 'draft'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                        title="点击切换发布/草稿状态"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                            message.status === 'published'
                              ? 'bg-emerald-400'
                              : message.status === 'draft'
                              ? 'bg-amber-400'
                              : 'bg-slate-500'
                          }`}
                        ></span>
                        {message.status === 'published'
                          ? '已发布'
                          : message.status === 'draft'
                          ? '草稿'
                          : '已归档'}
                      </button>
                      <div className="mt-1 text-[10px] text-slate-500">
                        已读: {message.readCount || 0}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Open H5 page in new tab */}
                        <a
                          href={`/h5/messages/${id}${message.status !== 'published' ? '?preview=true' : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 rounded px-2 py-1 text-[11px] text-emerald-400 hover:bg-emerald-500/10 transition"
                          title="在浏览器中直接打开 H5 公告页面 (嵌入 Android App 链接)"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">H5 公告</span>
                        </a>

                        {/* Preview on device button */}
                        <button
                          onClick={() => onPreviewMessage(message)}
                          className="flex items-center space-x-1 rounded px-2 py-1 text-[11px] text-indigo-400 hover:bg-indigo-500/10 transition"
                          title="在模拟 Android 设备中预览效果"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">真机预览</span>
                        </button>

                        <button
                          onClick={() => onEditMessage(message)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                          title="编辑消息"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(id)}
                          disabled={isDeleting}
                          className="rounded p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition disabled:opacity-50"
                          title="删除消息"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
          <div>
            共 <span className="font-semibold text-white">{pagination.total}</span> 条消息，第{' '}
            <span className="font-semibold text-white">{pagination.page}</span> /{' '}
            <span>{pagination.totalPages}</span> 页
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>上一页</span>
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <span>下一页</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
