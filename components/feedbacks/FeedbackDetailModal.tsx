'use client';

import React from 'react';
import { FeedbackDocument, FeedbackStatus, FeedbackType, FeedbackPriority } from '@/types/feedback';
import {
  X,
  MessageSquareText,
  Smartphone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Reply,
  Copy,
  Check,
  Globe,
  Tag,
  AlertOctagon,
  ExternalLink,
} from 'lucide-react';

interface FeedbackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: FeedbackDocument | null;
  onOpenReply: (feedback: FeedbackDocument) => void;
}

export const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({
  isOpen,
  onClose,
  feedback,
  onOpenReply,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen || !feedback) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">意见反馈档案详情</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-sm">
                ID: {feedback._id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-300">
          {/* Title & Badges */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/20">
                {feedback.type === 'suggestion'
                  ? '💡 产品建议'
                  : feedback.type === 'bug'
                  ? '🐛 缺陷反馈'
                  : feedback.type === 'feature'
                  ? '✨ 功能需求'
                  : feedback.type === 'complaint'
                  ? '📢 吐槽投诉'
                  : '💬 其它反馈'}
              </span>

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  feedback.status === 'pending'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : feedback.status === 'processing'
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                    : feedback.status === 'resolved'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                {feedback.status === 'pending'
                  ? '⏳ 待处理'
                  : feedback.status === 'processing'
                  ? '🔄 处理中'
                  : feedback.status === 'resolved'
                  ? '✅ 已解决'
                  : '📁 已关闭'}
              </span>

              <span className="text-xs text-slate-400">
                优先级:{' '}
                <span className="font-semibold text-slate-200">
                  {feedback.priority === 'urgent'
                    ? '🔴 紧急'
                    : feedback.priority === 'high'
                    ? '🟠 高'
                    : feedback.priority === 'normal'
                    ? '🔵 普通'
                    : '⚪ 低'}
                </span>
              </span>
            </div>

            <h4 className="text-base font-bold text-white pt-1">{feedback.title}</h4>
          </div>

          {/* Detailed Content */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
            <span className="text-xs font-semibold text-slate-400 block">反馈内容全文</span>
            <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
              {feedback.content}
            </p>

            {/* Screenshots */}
            {feedback.images && feedback.images.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-2">附件图片截图:</span>
                <div className="flex flex-wrap gap-2">
                  {feedback.images.map((img, i) => (
                    <a
                      key={i}
                      href={img}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-lg border border-slate-700 overflow-hidden hover:opacity-80 transition"
                    >
                      <img
                        src={img}
                        alt="feedback-img"
                        className="h-20 w-20 object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Admin Reply */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-400 flex items-center space-x-1">
                <Reply className="h-3.5 w-3.5" />
                <span>管理员答复 / 处理结论</span>
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenReply(feedback);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {feedback.reply ? '修改回复' : '立即答复'}
              </button>
            </div>

            {feedback.reply ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                <p className="text-xs text-emerald-200 whitespace-pre-wrap leading-relaxed">
                  {feedback.reply}
                </p>
                <div className="flex items-center justify-between text-[11px] text-emerald-400/80 pt-1.5 border-t border-emerald-500/10">
                  <span>处理人: {feedback.repliedBy || '管理员'}</span>
                  <span>答复时间: {formatDate(feedback.repliedAt)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">
                暂未答复，点击右上角「立即答复」录入回复内容。
              </p>
            )}
          </div>

          {/* Submitter & Network metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block">来源与设备</span>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">关联设备:</span>
                  <span className="font-mono text-slate-200 truncate max-w-[160px]">
                    {feedback.deviceId || '无'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">联系方式:</span>
                  <span className="text-slate-200">{feedback.contact || '未提供'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">用户 ID:</span>
                  <span className="text-slate-200">{feedback.userId || '-'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block">时间与网络</span>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">提交时间:</span>
                  <span className="font-mono text-slate-200">{formatDate(feedback.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">更新时间:</span>
                  <span className="font-mono text-slate-200">{formatDate(feedback.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">提交 IP:</span>
                  <span className="font-mono text-slate-200">{feedback.ip || '未知'}</span>
                </div>
              </div>
            </div>
          </div>

          {feedback.remark && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">内部备忘</span>
              <p className="text-xs text-slate-300">{feedback.remark}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-slate-800 px-6 py-3 bg-slate-900/60">
          <button
            onClick={() => handleCopy(JSON.stringify(feedback, null, 2), 'json')}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            {copiedKey === 'json' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedKey === 'json' ? '已复制 JSON' : '复制完整 JSON'}</span>
          </button>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                onClose();
                onOpenReply(feedback);
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              回复 / 处理
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
