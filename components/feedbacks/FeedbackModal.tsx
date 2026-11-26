'use client';

import React, { useState, useEffect } from 'react';
import { FeedbackDocument, FeedbackStatus, FeedbackType, FeedbackPriority } from '@/types/feedback';
import { X, Check, AlertCircle, MessageSquareText, Tag, AlertOctagon, Reply, Smartphone, Mail, Loader2 } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialFeedback?: FeedbackDocument | null;
  apiKey: string;
  isReplyMode?: boolean;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialFeedback,
  apiKey,
  isReplyMode = false,
}) => {
  const isEdit = Boolean(initialFeedback?._id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [status, setStatus] = useState<FeedbackStatus>('pending');
  const [priority, setPriority] = useState<FeedbackPriority>('normal');
  const [contact, setContact] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [reply, setReply] = useState('');
  const [remark, setRemark] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialFeedback) {
      setTitle(initialFeedback.title || '');
      setContent(initialFeedback.content || '');
      setType(initialFeedback.type || 'suggestion');
      setStatus(initialFeedback.status || 'pending');
      setPriority(initialFeedback.priority || 'normal');
      setContact(initialFeedback.contact || '');
      setDeviceId(initialFeedback.deviceId || '');
      setReply(initialFeedback.reply || '');
      setRemark(initialFeedback.remark || '');
      // 如果处于回复模式且当前为 pending，则默认建议切换为 resolved
      if (isReplyMode && initialFeedback.status === 'pending') {
        setStatus('resolved');
      }
    } else {
      setTitle('');
      setContent('');
      setType('suggestion');
      setStatus('pending');
      setPriority('normal');
      setContact('');
      setDeviceId('');
      setReply('');
      setRemark('');
    }
    setErrorMsg(null);
  }, [initialFeedback, isOpen, isReplyMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!content.trim()) {
      setErrorMsg('请填写意见与建议详细内容');
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        title: title.trim() || content.trim().slice(0, 30),
        content: content.trim(),
        type,
        status,
        priority,
        contact: contact.trim(),
        deviceId: deviceId.trim(),
        reply: reply.trim(),
        remark: remark.trim(),
      };

      if (isEdit && initialFeedback?._id) {
        payload._id = initialFeedback._id;
      }

      const res = await fetch('/api/feedbacks', {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEdit ? '更新反馈失败' : '创建反馈失败'));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '网络请求错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {isReplyMode ? <Reply className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isReplyMode ? '回复与处理意见反馈' : isEdit ? '编辑意见反馈' : '新增意见与建议登记'}
              </h3>
              <p className="text-xs text-slate-400">
                {isReplyMode
                  ? '录入针对用户意见或问题的答复结论，并更新处理状态'
                  : '管理用户提交的产品建议、缺陷排查与客服处理记录'}
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
          {errorMsg && (
            <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              反馈标题 / 简要摘要
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="简要概括反馈问题（如留空则自动提取内容前 30 字）"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Type & Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">反馈类型</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="suggestion" className="bg-slate-900">💡 产品建议</option>
                <option value="bug" className="bg-slate-900">🐛 缺陷反馈</option>
                <option value="feature" className="bg-slate-900">✨ 功能需求</option>
                <option value="complaint" className="bg-slate-900">📢 吐槽投诉</option>
                <option value="other" className="bg-slate-900">💬 其它反馈</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">优先级</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as FeedbackPriority)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="urgent" className="bg-slate-900">🔴 紧急</option>
                <option value="high" className="bg-slate-900">🟠 高</option>
                <option value="normal" className="bg-slate-900">🔵 普通</option>
                <option value="low" className="bg-slate-900">⚪ 低</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">处理状态</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="pending" className="bg-slate-900">⏳ 待处理</option>
                <option value="processing" className="bg-slate-900">🔄 处理中</option>
                <option value="resolved" className="bg-slate-900">✅ 已解决</option>
                <option value="closed" className="bg-slate-900">📁 已关闭</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              详细描述内容 <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入用户的意见建议、复现步骤或详细诉求..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
              required
            />
          </div>

          {/* Device ID & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                关联设备 ID (deviceId)
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="例如 Android ID 或 OAID"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                用户联系方式 (contact)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="手机号 / 微信 / 邮箱"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Reply Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-400">
              <Reply className="h-4 w-4" />
              <span>管理员答复 / 处理结果 (客户端可见)</span>
            </div>
            <textarea
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="填写给用户的官方回复或处理解决方案（客户端可通过接口直接拉取查阅）..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-emerald-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
            />
          </div>

          {/* Internal Remark */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              内部备忘备注 (仅管理员可见)
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="仅后台可见的跟进备忘或内部排查进度"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{isEdit ? '保存更新' : '提交登记'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
