'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { MessageDocument, MessageType, MessagePriority, MessageStatus, TargetType } from '@/types/message';
import { processAndUploadImage, IMAGE_SIZE_THRESHOLD } from '@/lib/image-uploader';
import {
  ArrowLeft,
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
  Sparkles,
  Save,
  Send,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

function MessageCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEdit = Boolean(editId);

  const [key, setKey] = useState('');
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
  const [contentViewMode, setContentViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // API Key in localStorage for testing
  const [apiKey, setApiKey] = useState('next-log-secret-key-2026');

  useEffect(() => {
    const savedKey = localStorage.getItem('next_log_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleUpdateApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('next_log_api_key', key);
  };

  // If editId is provided, fetch existing message
  useEffect(() => {
    if (!editId) return;

    const fetchMessage = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/messages?id=${encodeURIComponent(editId)}`);
        const json = await res.json();
        if (json.success && json.data) {
          const doc: MessageDocument = json.data;
          setKey(doc.key || '');
          setTitle(doc.title);
          setContent(doc.content);
          setType(doc.type || 'announcement');
          setPriority(doc.priority || 'normal');
          setTargetType(doc.targetType || 'all');
          setTargetValue(doc.targetValue || '');
          setAppId(doc.appId || 'all');
          setActionUrl(doc.actionUrl || '');
          setActionText(doc.actionText || '');
          setIsPopup(doc.isPopup ?? false);
          setExtraStr(
            doc.extra && Object.keys(doc.extra).length > 0
              ? JSON.stringify(doc.extra, null, 2)
              : ''
          );
          setStatus(doc.status || 'published');
          setExpireAt(
            doc.expireAt ? new Date(doc.expireAt).toISOString().slice(0, 16) : ''
          );
        } else {
          setErrorMsg(json.error || '未找到该消息');
        }
      } catch (err: any) {
        setErrorMsg(err.message || '加载消息数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessage();
  }, [editId]);

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

  // Image Upload & Insertion handler (supports Base64 for <=64KB and Vercel Blob for >64KB)
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
        setUploadStatusText(`图片已作为 Base64 嵌入 (${sizeKb} KB，<= 64KB)`);
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

  // File Picker Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessImage(files[0]);
    }
  };

  // Clipboard Paste (Ctrl+V) handler for images / screenshots
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

  // Drag & Drop handlers for images
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
- **通知弹窗**：针对部分 Android 14/15 机型全面优化全屏与浮层 Dialog 动画
- **数据安全**：增强安全传输协议，本地离线自动兜底容灾

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

  const handleSubmit = async (submitStatus?: MessageStatus) => {
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('请填写消息标题');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!content.trim()) {
      setErrorMsg('请填写消息正文内容');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        key: key.trim() || undefined,
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
        status: submitStatus || status,
        expireAt: expireAt ? new Date(expireAt).toISOString() : null,
      };

      if (isEdit && editId) {
        payload._id = editId;
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

      // Redirect back to message list
      router.push('/messages');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || '网络异常，提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title={isEdit ? '编辑消息公告' : '新建消息公告'}
      subtitle="独立路由模式 · 支持 Markdown 富文本、图片智能存储 (Base64 / Vercel Blob) 与所见即所得双栏分屏"
      breadcrumbs={[
        { label: '应用服务管理' },
        { label: '消息中心', href: '/messages' },
        { label: isEdit ? '编辑消息' : '新建消息公告' },
      ]}
      apiKey={apiKey}
      onUpdateApiKey={handleUpdateApiKey}
      showCreateButton={false}
    >
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top action header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/messages"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition"
            title="返回消息列表"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {isEdit ? '编辑系统消息 / 公告' : '新建系统消息 / 公告'}
              </h2>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                Markdown 富文本 · 图片上传
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              支持直接粘贴截图、拖拽图片或点击按钮插入。智能判定大小（≤64KB 极速 Base64，&gt;64KB 上传 Vercel Blob）。
            </p>
          </div>
        </div>

        {/* Top buttons */}
        <div className="flex items-center space-x-2">
          {isEdit && editId && (
            <a
              href={`/h5/messages/${editId}?preview=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition"
              title="在独立窗口中预览 H5 公告效果"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>预览 H5</span>
            </a>
          )}
          <Link
            href="/messages"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
          >
            取消
          </Link>
          {status === 'draft' ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('published')}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? '发布中...' : '直接发布'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit()}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{submitting ? '保存中...' : isEdit ? '保存修改' : '立即发布'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error notification banner */}
      {errorMsg && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Image Upload Status Banner */}
      {uploadStatusText && (
        <div className="flex items-center space-x-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-300 animate-fadeIn">
          {isUploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          )}
          <span>{uploadStatusText}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          <p className="mt-2 text-xs">正在载入消息详情...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Title & Key Input */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  消息标题 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如: 平台维护升级公告 或 发现新版本 v2.5.0"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                  <span className="flex items-center space-x-1">
                    <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
                    <span>公告唯一 Key</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">用于按 Key 精确查询</span>
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="如: splash_notice, terms_update"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm font-mono text-indigo-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Markdown Content Editor with Full Toolbar and Split View */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              {/* Markdown Toolbar */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => insertMarkdown('**', '**', '粗体文字')}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="粗体 (**B**)"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('*', '*', '斜体文字')}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="斜体 (*I*)"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('# ', '', '一级标题')}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="一级标题 (# H1)"
                >
                  <Heading1 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('## ', '', '二级标题')}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="二级标题 (## H2)"
                >
                  <Heading2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('- ', '', '列表项')}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="无序列表 (- List)"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('> ', '', '提示或注意事项')}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="引用块 (> Quote)"
                >
                  <Quote className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('`', '`', 'code')}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="行内代码 (`code`)"
                >
                  <Code className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('[', '](https://example.com)', '链接描述')}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="超链接 ([Text](url))"
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdown(
                      '| 模块 | 影响范围 | 维护时间 |\n| --- | --- | --- |\n| ',
                      ' | 部分服务 | 02:00-04:00 |\n',
                      '订单系统'
                    )
                  }
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="Markdown 数据表格"
                >
                  <TableIcon className="h-4 w-4" />
                </button>

                {/* Image Upload Button */}
                <button
                  type="button"
                  disabled={isUploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1 rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80 transition disabled:opacity-50"
                  title="插入图片 (<=64KB 自动转为 Base64 内联，>64KB 自动上传 Vercel Blob)"
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span className="text-xs font-medium">插入图片</span>
                </button>

                <div className="h-4 w-[1px] bg-slate-700 mx-1.5"></div>

                <button
                  type="button"
                  onClick={insertAnnouncementTemplate}
                  className="flex items-center space-x-1.5 rounded bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition"
                  title="载入系统维护与升级标准公告模版"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>载入公告模版</span>
                </button>
              </div>

              {/* View Mode Toggle: Edit / Preview / Split */}
              <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setContentViewMode('edit')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                    contentViewMode === 'edit'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>源码编辑</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentViewMode('preview')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                    contentViewMode === 'preview'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>纯预览</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentViewMode('split')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                    contentViewMode === 'split'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Columns className="h-3.5 w-3.5" />
                  <span>双栏分屏</span>
                </button>
              </div>
            </div>

            {/* Hint for pasting / dragging */}
            <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
              <span>💡 提示：输入框支持直接按 <strong>Ctrl+V</strong> 粘贴剪贴板截图或<strong>拖拽图片文件</strong>入框自动上传。</span>
              <span className="text-[10px] text-slate-500">
                策略：≤ 64KB 极速 Base64 | &gt; 64KB Vercel Blob
              </span>
            </div>

            {/* Editor Body */}
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
                  rows={16}
                  placeholder="在此输入 Markdown 格式的公告或通知正文，支持直接粘贴图片或拖拽图片文件..."
                  className={`w-full rounded-lg border bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                    isDragging ? 'border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/40' : 'border-slate-700'
                  }`}
                />
                {isDragging && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-indigo-950/60 border-2 border-dashed border-indigo-400 pointer-events-none">
                    <span className="text-xs font-semibold text-indigo-200">松开鼠标即可插入图片</span>
                  </div>
                )}
              </div>
            ) : contentViewMode === 'preview' ? (
              <div className="min-h-[360px] rounded-lg border border-slate-800 bg-slate-950 p-6 overflow-y-auto max-h-[500px]">
                {content.trim() ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <span className="text-xs text-slate-500 italic">暂无内容，请在编辑模式下输入</span>
                )}
              </div>
            ) : (
              /* Split View */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1 relative">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Markdown 源码输入（支持截图粘贴 / 拖拽）
                  </div>
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
                    rows={16}
                    placeholder="在此输入 Markdown，支持直接 Ctrl+V 粘贴截图或拖入图片..."
                    className={`w-full rounded-lg border bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors ${
                      isDragging ? 'border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/40' : 'border-slate-700'
                    }`}
                  />
                  {isDragging && (
                    <div className="absolute inset-0 top-6 z-10 flex items-center justify-center rounded-lg bg-indigo-950/60 border-2 border-dashed border-indigo-400 pointer-events-none">
                      <span className="text-xs font-semibold text-indigo-200">松开鼠标即可插入图片</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                    富文本与图片实时渲染预览
                  </div>
                  <div className="min-h-[340px] max-h-[380px] overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-4">
                    {content.trim() ? (
                      <MarkdownRenderer content={content} />
                    ) : (
                      <span className="text-xs text-slate-500 italic">在左侧输入 Markdown 或粘贴图片即可在此实时渲染</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Attributes & Delivery Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Block: Classification & Targeting */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md space-y-4">
              <h3 className="text-xs font-semibold text-white border-b border-slate-800 pb-2">
                1. 消息分类与发布设置
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">消息类型</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as MessageType)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="announcement">系统公告 (Announcement)</option>
                    <option value="notification">通知消息 (Notification)</option>
                    <option value="upgrade">版本升级 (Upgrade)</option>
                    <option value="alert">紧急告警 (Alert)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">优先级</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as MessagePriority)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="urgent">紧急 (Urgent)</option>
                    <option value="high">高 (High)</option>
                    <option value="normal">普通 (Normal)</option>
                    <option value="low">低 (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">发布状态</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MessageStatus)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="published">立即发布 (Published)</option>
                    <option value="draft">存为草稿 (Draft)</option>
                    <option value="archived">已归档 (Archived)</option>
                  </select>
                </div>
              </div>

              {/* Targeting Rule */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-300">定向投放受众 (Targeting)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">定向类型</label>
                    <select
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as TargetType)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="all">全体用户 (All)</option>
                      <option value="user">指定用户/设备</option>
                      <option value="channel">指定应用渠道</option>
                      <option value="version">指定客户端版本</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {targetType === 'all'
                        ? '受众参数'
                        : targetType === 'user'
                        ? '用户 ID (逗号分隔)'
                        : targetType === 'channel'
                        ? '渠道名 (如 googleplay)'
                        : '版本号规则 (如 <= 105)'}
                    </label>
                    <input
                      type="text"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      disabled={targetType === 'all'}
                      placeholder={
                        targetType === 'all'
                          ? '全体生效'
                          : targetType === 'user'
                          ? 'user_101, user_102'
                          : targetType === 'channel'
                          ? 'googleplay, xiaomi'
                          : '<= 105 或 100-110'
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">App 包名 (appId)</label>
                    <input
                      type="text"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      placeholder="all 或 com.example.app"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Block: Android Interactions & Schedule */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md space-y-4">
              <h3 className="text-xs font-semibold text-white border-b border-slate-800 pb-2">
                2. Android 交互与失效时效
              </h3>

              {/* Popup Switch */}
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-semibold text-white">App 启动强弹窗</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    开启后，Android App 启动或切回前台时，自动以居中 Dialog 浮层弹窗提醒用户。
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3">
                  <input
                    type="checkbox"
                    checked={isPopup}
                    onChange={(e) => setIsPopup(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Action Link & Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    跳转链接 (DeepLink 或 URL)
                  </label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="例如: https://... 或 myapp://upgrade"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">按钮文案</label>
                  <input
                    type="text"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                    placeholder="例如: 立即升级 / 前往查看"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Expiration date & Extra JSON */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    过期下线时间 (可选)
                  </label>
                  <input
                    type="datetime-local"
                    value={expireAt}
                    onChange={(e) => setExpireAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    扩展参数 (Extra JSON，可选)
                  </label>
                  <input
                    type="text"
                    value={extraStr}
                    onChange={(e) => setExtraStr(e.target.value)}
                    placeholder='{"forceUpdate": false}'
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-indigo-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Submit Bar */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <Link
              href="/messages"
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
            >
              返回列表
            </Link>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('draft')}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
              >
                存为草稿
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('published')}
                className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{submitting ? '提交中...' : isEdit ? '保存更新' : '立即发布'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function MessageCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          页面加载中...
        </div>
      }
    >
      <MessageCreateForm />
    </Suspense>
  );
}
