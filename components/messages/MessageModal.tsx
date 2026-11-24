'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageDocument, MessageType, MessagePriority, MessageStatus, TargetType } from '@/types/message';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { processAndUploadImage } from '@/lib/image-uploader';
import {
  X,
  Check,
  AlertCircle,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Quote,
  Code,
  Link as LinkIcon,
  Table as TableIcon,
  FileText,
  Eye,
  Columns,
  Edit3,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMessage?: MessageDocument | null;
  apiKey: string;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMessage,
  apiKey,
}) => {
  const isEdit = Boolean(initialMessage?._id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<MessageType>('announcement');
  const [priority, setPriority] = useState<MessagePriority>('normal');
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [targetValue, setTargetValue] = useState('');
  const [appId, setAppId] = useState('all');
  const [actionUrl, setActionUrl] = useState('');
  const [actionText, setActionText] = useState('');
  const [isPopup, setIsPopup] = useState(false);
  const [extraStr, setExtraStr] = useState('');
  const [status, setStatus] = useState<MessageStatus>('published');
  const [expireAt, setExpireAt] = useState('');

  // Markdown Editor View Mode: 'edit' | 'preview' | 'split'
  const [contentViewMode, setContentViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image Upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialMessage) {
      setTitle(initialMessage.title);
      setContent(initialMessage.content);
      setType(initialMessage.type || 'announcement');
      setPriority(initialMessage.priority || 'normal');
      setTargetType(initialMessage.targetType || 'all');
      setTargetValue(initialMessage.targetValue || '');
      setAppId(initialMessage.appId || 'all');
      setActionUrl(initialMessage.actionUrl || '');
      setActionText(initialMessage.actionText || '');
      setIsPopup(initialMessage.isPopup ?? false);
      setExtraStr(
        initialMessage.extra && Object.keys(initialMessage.extra).length > 0
          ? JSON.stringify(initialMessage.extra, null, 2)
          : ''
      );
      setStatus(initialMessage.status || 'published');
      setExpireAt(
        initialMessage.expireAt
          ? new Date(initialMessage.expireAt).toISOString().slice(0, 16)
          : ''
      );
    } else {
      setTitle('');
      setContent('');
      setType('announcement');
      setPriority('normal');
      setTargetType('all');
      setTargetValue('');
      setAppId('all');
      setActionUrl('');
      setActionText('');
      setIsPopup(false);
      setExtraStr('');
      setStatus('published');
      setExpireAt('');
    }
    setContentViewMode('edit');
    setErrorMsg(null);
  }, [initialMessage, isOpen]);

  // Insert markdown tag helper
  const insertMarkdown = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultText;
    const replacement = `${before}${selectedText}${after}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  // Image upload handler
  const handleProcessImage = async (file: File) => {
    setIsUploadingImage(true);
    setUploadStatusText('正在检测图片尺寸并选择存储策略...');
    setErrorMsg(null);

    try {
      const result = await processAndUploadImage(file, apiKey, (statusMsg) => {
        setUploadStatusText(statusMsg);
      });

      const altText = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'image';
      const markdownImage = `\n![${altText}](${result.url})\n`;

      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.substring(0, start) + markdownImage + content.substring(end);
        setContent(newContent);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + markdownImage.length, start + markdownImage.length);
        }, 0);
      } else {
        setContent((prev) => prev + markdownImage);
      }

      const sizeKb = (result.size / 1024).toFixed(1);
      if (result.storage === 'base64') {
        setUploadStatusText(`图片已作为 Base64 嵌入 (${sizeKb} KB)`);
      } else if (result.storage === 'vercel-blob') {
        setUploadStatusText(`图片已上传至 Vercel Blob Store (${sizeKb} KB)`);
      } else {
        setUploadStatusText(`图片已降级为 Base64 嵌入 (${sizeKb} KB)`);
      }

      setTimeout(() => setUploadStatusText(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || '图片处理失败');
      setUploadStatusText(null);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleProcessImage(file);
          return;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleProcessImage(file);
      }
    }
  };

  // Insert standard announcement template
  const insertAnnouncementTemplate = () => {
    const template = `## 📢 平台系统维护与升级公告

尊敬的用户：

为了向您提供更加稳定和优质的 Android 应用服务，我们计划于 **2026年11月25日 02:00 - 04:00** 进行底层服务器架构升级维护。

### 🛠️ 本次升级主要内容：
- **性能飞跃**：大幅优化移动弱网环境下的配置拉取与重试机制
- **用户体验**：针对部分 Android 14/15 机型全面优化通知弹窗响应
- **安全保障**：增强数据安全传输链路，全面支持离线配置自动容灾

### ⚠️ 影响与注意事项：
> 维护期间，部分云同步服务可能出现短暂中断，本地使用不受影响。

如有疑问请随时联系技术支持，感谢您的理解与支持！`;

    if (!content.trim() || window.confirm('是否载入系统公告 Markdown 模版覆盖当前正文？')) {
      setContent(template);
      if (!title.trim()) {
        setTitle('平台系统维护与升级公告');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('消息标题为必填项');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('消息正文为必填项');
      return;
    }

    let parsedExtra: any = {};
    if (extraStr.trim()) {
      try {
        parsedExtra = JSON.parse(extraStr);
      } catch {
        setErrorMsg('扩展参数 (Extra) 必须为合法 JSON 格式');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        content: content.trim(),
        type,
        priority,
        targetType,
        targetValue: targetValue.trim(),
        appId: appId.trim() || 'all',
        actionUrl: actionUrl.trim(),
        actionText: actionText.trim(),
        isPopup,
        extra: parsedExtra,
        status,
        expireAt: expireAt ? new Date(expireAt).toISOString() : null,
      };

      if (isEdit && initialMessage?._id) {
        payload._id = initialMessage._id;
      }

      const res = await fetch('/api/messages', {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '保存消息失败');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '网络异常，提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-8">
        {/* Hidden File Input for Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              handleProcessImage(files[0]);
            }
          }}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              {isEdit ? '编辑消息与公告' : '新建消息 / 公告'}
            </h3>
            <p className="text-xs text-slate-400">
              支持完整 Markdown 富文本与图片插入（≤64KB 转 Base64，&gt;64KB 上传 Vercel Blob）。
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center space-x-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Status Banner */}
          {uploadStatusText && (
            <div className="flex items-center space-x-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5 text-xs text-indigo-300">
              {isUploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              )}
              <span>{uploadStatusText}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300">
              消息标题 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: 平台维护升级公告 或 发现新版本 v2.1.0"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Markdown Content Field with Toolbar and Live Preview */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              {/* Markdown Quick Toolbar */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => insertMarkdown('**', '**', '粗体文字')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="粗体 (**B**)"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('*', '*', '斜体文字')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="斜体 (*I*)"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('# ', '', '一级标题')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="一级标题 (# H1)"
                >
                  <Heading1 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('## ', '', '二级标题')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="二级标题 (## H2)"
                >
                  <Heading2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('- ', '', '列表项')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="无序列表 (- List)"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('> ', '', '引用与提示内容')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="引用内容 (> Quote)"
                >
                  <Quote className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('`', '`', 'code')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="行内代码 (`code`)"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('[', '](https://example.com)', '链接文本')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="超链接 ([Text](url))"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdown(
                      '| 事项 | 说明 |\n| --- | --- |\n| ',
                      ' | 详情描述 |\n',
                      '功能升级'
                    )
                  }
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="表格"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </button>

                {/* Image Upload Button */}
                <button
                  type="button"
                  disabled={isUploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1 rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80 transition disabled:opacity-50"
                  title="插入图片 (<=64KB 转 Base64，>64KB 上传 Vercel Blob)"
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                  ) : (
                    <ImageIcon className="h-3 w-3 text-emerald-400" />
                  )}
                  <span className="text-[11px] font-medium hidden sm:inline">插入图片</span>
                </button>

                <div className="h-3.5 w-[1px] bg-slate-700 mx-1"></div>

                <button
                  type="button"
                  onClick={insertAnnouncementTemplate}
                  className="flex items-center space-x-1 rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition"
                  title="一键插入系统公告标准模版"
                >
                  <FileText className="h-3 w-3" />
                  <span>载入模版</span>
                </button>
              </div>

              {/* View Switcher: Edit, Preview, Split */}
              <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setContentViewMode('edit')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-medium transition ${
                    contentViewMode === 'edit'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="h-3 w-3" />
                  <span>编辑</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentViewMode('preview')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-medium transition ${
                    contentViewMode === 'preview'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>预览</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentViewMode('split')}
                  className={`hidden sm:flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-medium transition ${
                    contentViewMode === 'split'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Columns className="h-3 w-3" />
                  <span>双栏分屏</span>
                </button>
              </div>
            </div>

            {/* Content Textarea & Preview Display */}
            {contentViewMode === 'edit' ? (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  rows={6}
                  placeholder="在此输入 Markdown 正文，支持直接 Ctrl+V 粘贴截图或拖入图片..."
                  className={`w-full rounded-lg border bg-slate-900 p-3 font-mono text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                    isDragging ? 'border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/40' : 'border-slate-700'
                  }`}
                  required
                />
                {isDragging && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-indigo-950/60 border-2 border-dashed border-indigo-400 pointer-events-none">
                    <span className="text-xs font-semibold text-indigo-200">松开鼠标即可插入图片</span>
                  </div>
                )}
              </div>
            ) : contentViewMode === 'preview' ? (
              <div className="min-h-[150px] max-h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-4">
                {content.trim() ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <span className="text-xs text-slate-500 italic">暂无内容，请在编辑模式下输入</span>
                )}
              </div>
            ) : (
              /* Split View */
              <div className="grid grid-cols-2 gap-3 min-h-[180px]">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    rows={8}
                    placeholder="在此输入 Markdown..."
                    className={`w-full rounded-lg border bg-slate-900 p-3 font-mono text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors ${
                      isDragging ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-700'
                    }`}
                    required
                  />
                  {isDragging && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-indigo-950/60 border-2 border-dashed border-indigo-400 pointer-events-none">
                      <span className="text-xs font-semibold text-indigo-200">松开鼠标即可插入图片</span>
                    </div>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <MarkdownRenderer content={content} />
                </div>
              </div>
            )}
          </div>

          {/* Type & Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">消息类型</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MessageType)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="announcement">系统公告 (Announcement)</option>
                <option value="notification">通知消息 (Notification)</option>
                <option value="upgrade">版本升级 (Upgrade)</option>
                <option value="alert">紧急告警 (Alert)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">优先级 (Priority)</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as MessagePriority)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="urgent">紧急 (Urgent)</option>
                <option value="high">高 (High)</option>
                <option value="normal">普通 (Normal)</option>
                <option value="low">低 (Low)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">发布状态</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MessageStatus)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="published">立即发布 (Published)</option>
                <option value="draft">存为草稿 (Draft)</option>
                <option value="archived">已归档 (Archived)</option>
              </select>
            </div>
          </div>

          {/* Targeting Scope */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
            <span className="text-xs font-medium text-slate-300">定向推送与受众规则 (Targeting)</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400">目标类型</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as TargetType)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">全体用户 (All)</option>
                  <option value="user">指定用户 / 设备 (User)</option>
                  <option value="channel">指定渠道 (Channel)</option>
                  <option value="version">指定版本 (Version)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400">
                  {targetType === 'all'
                    ? '受众参数 (无需填写)'
                    : targetType === 'user'
                    ? '指定用户 ID (逗号分隔)'
                    : targetType === 'channel'
                    ? '指定渠道 (如 googleplay)'
                    : '指定版本规则 (如 <= 105)'}
                </label>
                <input
                  type="text"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  disabled={targetType === 'all'}
                  placeholder={
                    targetType === 'all'
                      ? '面向全体'
                      : targetType === 'user'
                      ? 'user_123, user_456'
                      : targetType === 'channel'
                      ? 'googleplay, official'
                      : '<= 105 或 100-110'
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400">App 适用包名 (appId)</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="all 或 com.example.app"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Link & Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">
                跳转动作链接 (DeepLink 或 URL)
              </label>
              <input
                type="text"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="例如: https://... 或 myapp://upgrade"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">动作按钮文案</label>
              <input
                type="text"
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="例如: 立即升级 / 前往查看"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Launch Popup & Expire Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Launch Popup Switch */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-medium text-slate-200">App 启动强弹窗</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  开启后 Android App 打开时将弹出浮层 Dialog 提示。
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPopup}
                  onChange={(e) => setIsPopup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Expiration Date */}
            <div>
              <label className="block text-xs font-medium text-slate-300">过期下线时间 (可选)</label>
              <input
                type="datetime-local"
                value={expireAt}
                onChange={(e) => setExpireAt(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Extra JSON parameters */}
          <div>
            <label className="block text-xs font-medium text-slate-300">
              扩展自定义参数 (Extra JSON，可选)
            </label>
            <textarea
              value={extraStr}
              onChange={(e) => setExtraStr(e.target.value)}
              rows={2}
              placeholder={`{\n  "forceUpdate": false,\n  "downloadUrl": "https://example.com/app.apk"\n}`}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs font-mono text-indigo-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{submitting ? '保存中...' : isEdit ? '更新消息' : '立即发布'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
