'use client';

import React, { useState } from 'react';
import { FeedbackDocument, FeedbackStatus, FeedbackType, FeedbackPriority } from '@/types/feedback';
import {
  MessageSquareText,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Tag,
  Trash2,
  Edit2,
  Reply,
  Eye,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Mail,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface FeedbackTableProps {
  feedbacks: FeedbackDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  isLoading: boolean;
  onOpenCreate: () => void;
  onEditFeedback: (feedback: FeedbackDocument) => void;
  onReplyFeedback: (feedback: FeedbackDocument) => void;
  onViewDetail: (feedback: FeedbackDocument) => void;
  onDeleteFeedback: (id: string) => Promise<boolean>;
  onBatchDelete?: (ids: string[]) => Promise<boolean>;
  onUpdateStatus?: (id: string, newStatus: FeedbackStatus) => Promise<boolean>;
}

export const FeedbackTable: React.FC<FeedbackTableProps> = ({
  feedbacks,
  pagination,
  onPageChange,
  isLoading,
  onOpenCreate,
  onEditFeedback,
  onReplyFeedback,
  onViewDetail,
  onDeleteFeedback,
  onBatchDelete,
  onUpdateStatus,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === feedbacks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(feedbacks.map((f) => f._id).filter(Boolean) as string[]);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDelete = async (feedback: FeedbackDocument) => {
    const id = feedback._id;
    if (!id) return;

    if (!window.confirm(`确定要删除此条反馈【${feedback.title}】吗？删除后不可恢复。`)) {
      return;
    }

    setDeletingId(id);
    try {
      const ok = await onDeleteFeedback(id);
      if (ok) {
        setSelectedIds((prev) => prev.filter((item) => item !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0 || !onBatchDelete) return;

    if (!window.confirm(`确定要批量删除选中的 ${selectedIds.length} 条意见反馈吗？`)) {
      return;
    }

    setIsBatchDeleting(true);
    try {
      const ok = await onBatchDelete(selectedIds);
      if (ok) {
        setSelectedIds([]);
      }
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const formatDate = (dateVal: string | Date | undefined) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
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

  const renderTypeBadge = (type: FeedbackType) => {
    switch (type) {
      case 'suggestion':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-400 border border-indigo-500/20">
            <span>💡 产品建议</span>
          </span>
        );
      case 'bug':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400 border border-rose-500/20">
            <span>🐛 缺陷反馈</span>
          </span>
        );
      case 'feature':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
            <span>✨ 功能需求</span>
          </span>
        );
      case 'complaint':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
            <span>📢 吐槽投诉</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-slate-500/10 px-2 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-500/20">
            <span>💬 其它反馈</span>
          </span>
        );
    }
  };

  const renderStatusBadge = (status: FeedbackStatus, id?: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>待处理</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-400 border border-sky-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
            <span>处理中</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>已解决</span>
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-500/20">
            <XCircle className="h-3 w-3 text-slate-400" />
            <span>已关闭</span>
          </span>
        );
      default:
        return null;
    }
  };

  const renderPriorityBadge = (priority: FeedbackPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>紧急</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <span>高</span>
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] text-slate-300">
            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
            <span>普通</span>
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
            <span>低</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
      {/* Batch action toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-indigo-950/40 border-b border-indigo-500/20 px-4 py-2 text-xs">
          <div className="flex items-center space-x-2 text-indigo-300">
            <span>已选中 {selectedIds.length} 项</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
              className="flex items-center space-x-1 rounded-md bg-rose-600/90 hover:bg-rose-600 px-2.5 py-1 text-xs font-medium text-white transition disabled:opacity-50"
            >
              {isBatchDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              <span>批量删除</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={feedbacks.length > 0 && selectedIds.length === feedbacks.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3">标题与反馈内容</th>
              <th className="px-3 py-3">类型</th>
              <th className="px-3 py-3">状态</th>
              <th className="px-3 py-3">优先级</th>
              <th className="px-4 py-3">设备 / 联系方式</th>
              <th className="px-3 py-3">处理回复</th>
              <th className="px-4 py-3">提交时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span>加载意见与建议列表中...</span>
                  </div>
                </td>
              </tr>
            ) : feedbacks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2.5">
                    <div className="rounded-full bg-slate-800/80 p-3 text-slate-500">
                      <MessageSquareText className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium text-slate-300">暂无任何意见与建议</div>
                    <p className="text-xs text-slate-500">
                      用户提交的反馈建议、缺陷报告或管理员创建的跟进记录将显示在此处。
                    </p>
                    <button
                      onClick={onOpenCreate}
                      className="mt-2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
                    >
                      新增反馈登记
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              feedbacks.map((item) => {
                const isSelected = item._id ? selectedIds.includes(item._id) : false;
                const isExpanded = expandedId === item._id;

                return (
                  <React.Fragment key={item._id || Math.random()}>
                    <tr
                      className={`group hover:bg-slate-800/40 transition ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => item._id && toggleSelectOne(item._id)}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>

                      {/* Title & Preview */}
                      <td className="px-4 py-3.5 max-w-xs sm:max-w-md">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              onClick={() => onViewDetail(item)}
                              className="font-medium text-slate-100 hover:text-indigo-400 cursor-pointer transition truncate"
                            >
                              {item.title}
                            </span>
                            {item.images && item.images.length > 0 && (
                              <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 border border-slate-700">
                                📷 {item.images.length}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{item.content}</p>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {renderTypeBadge(item.type)}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {renderStatusBadge(item.status, item._id)}
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {renderPriorityBadge(item.priority)}
                      </td>

                      {/* Device / Contact */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 text-[11px]">
                          {item.deviceId ? (
                            <div className="flex items-center space-x-1 text-slate-300 font-mono">
                              <Smartphone className="h-3 w-3 text-indigo-400 shrink-0" />
                              <span className="truncate max-w-[120px]" title={item.deviceId}>
                                {item.deviceId}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                          {item.contact && (
                            <div className="flex items-center space-x-1 text-slate-400">
                              <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{item.contact}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Reply status */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {item.reply ? (
                          <span
                            onClick={() => onViewDetail(item)}
                            className="inline-flex items-center space-x-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20"
                            title={item.reply}
                          >
                            <Check className="h-3 w-3" />
                            <span>已答复</span>
                          </span>
                        ) : (
                          <span
                            onClick={() => onReplyFeedback(item)}
                            className="inline-flex items-center space-x-1 text-[11px] text-slate-400 hover:text-indigo-300 cursor-pointer"
                          >
                            <Reply className="h-3 w-3" />
                            <span>去回复</span>
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-[11px] text-slate-400 font-mono">
                        {formatDate(item.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Toggle Expand */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item._id || null)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                            title={isExpanded ? '收起详情' : '展开详情'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Reply / Process Button */}
                          <button
                            onClick={() => onReplyFeedback(item)}
                            className="rounded p-1 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300 transition"
                            title="回复处理"
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => onEditFeedback(item)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                            title="编辑"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item._id}
                            className="rounded p-1 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition disabled:opacity-50"
                            title="删除"
                          >
                            {deletingId === item._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <tr className="bg-slate-950/60 border-b border-slate-800">
                        <td colSpan={9} className="px-6 py-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Feedback Full Content */}
                            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                              <span className="text-[11px] font-semibold text-slate-300 block">
                                反馈完整内容描述
                              </span>
                              <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                                {item.content}
                              </p>

                              {/* Images preview if any */}
                              {item.images && item.images.length > 0 && (
                                <div className="pt-2">
                                  <span className="text-[10px] text-slate-400 block mb-1">
                                    附件截图 ({item.images.length})
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {item.images.map((img, i) => (
                                      <a
                                        key={i}
                                        href={img}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block rounded-lg border border-slate-700 overflow-hidden hover:opacity-80 transition"
                                      >
                                        <img
                                          src={img}
                                          alt="feedback-attachment"
                                          className="h-16 w-16 object-cover"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Reply & Metadata */}
                            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-slate-300">
                                  管理员处理与回复
                                </span>
                                <button
                                  onClick={() => onReplyFeedback(item)}
                                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                                >
                                  <Reply className="h-3 w-3" />
                                  <span>{item.reply ? '修改回复' : '立即回复'}</span>
                                </button>
                              </div>

                              {item.reply ? (
                                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-1">
                                  <p className="text-xs text-emerald-200 whitespace-pre-wrap">
                                    {item.reply}
                                  </p>
                                  <div className="flex items-center justify-between text-[10px] text-emerald-400/80 pt-1 border-t border-emerald-500/10">
                                    <span>回复人: {item.repliedBy || '管理员'}</span>
                                    <span>回复时间: {formatDate(item.repliedAt)}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-500 italic py-2">
                                  暂无答复，可点击右上角「立即回复」进行答复并同步状态。
                                </div>
                              )}

                              {item.remark && (
                                <div className="pt-1 text-[11px] text-slate-400">
                                  <span className="font-semibold text-slate-300">内部备忘: </span>
                                  <span>{item.remark}</span>
                                </div>
                              )}

                              <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                                <span>提交 IP: {item.ip || '未知'}</span>
                                {item.userId && <span>用户: {item.userId}</span>}
                                <span>最后更新: {formatDate(item.updatedAt)}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-4 py-3 text-xs text-slate-400">
          <div>
            共 <span className="font-semibold text-slate-200">{pagination.total}</span> 条反馈，当前第{' '}
            <span className="font-semibold text-slate-200">{pagination.page}</span> /{' '}
            {pagination.totalPages} 页
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:text-white transition disabled:opacity-40 disabled:hover:border-slate-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>上一页</span>
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:text-white transition disabled:opacity-40 disabled:hover:border-slate-800"
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
