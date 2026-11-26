'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  HardDrive,
  Hash,
} from 'lucide-react';
import { AppVersionDocument, CreateAppVersionInput, UpdateAppVersionInput } from '@/types/app-version';

interface AppVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingVersion: AppVersionDocument | null;
  onSuccess: (message: string) => void;
  apiKey: string;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const AppVersionModal: React.FC<AppVersionModalProps> = ({
  isOpen,
  onClose,
  editingVersion,
  onSuccess,
  apiKey,
}) => {
  // Form fields
  const [appId, setAppId] = useState('default');
  const [appName, setAppName] = useState('NextLog Android');
  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState<number | ''>('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [fileMd5, setFileMd5] = useState('');
  const [fileSha256, setFileSha256] = useState('');
  const [changelog, setChangelog] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [minVersionCode, setMinVersionCode] = useState<number | ''>('');
  const [channel, setChannel] = useState('default');
  const [status, setStatus] = useState<AppVersionDocument['status']>('published');

  // Upload state
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState<string | null>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingVersion) {
      setAppId(editingVersion.appId || 'default');
      setAppName(editingVersion.appName || 'NextLog Android');
      setVersionName(editingVersion.versionName || '');
      setVersionCode(editingVersion.versionCode || '');
      setDownloadUrl(editingVersion.downloadUrl || '');
      setFileName(editingVersion.fileName || '');
      setFileSize(editingVersion.fileSize);
      setFileMd5(editingVersion.fileMd5 || '');
      setFileSha256(editingVersion.fileSha256 || '');
      setChangelog(editingVersion.changelog || '');
      setForceUpdate(Boolean(editingVersion.forceUpdate));
      setMinVersionCode(editingVersion.minVersionCode || '');
      setChannel(editingVersion.channel || 'default');
      setStatus(editingVersion.status || 'published');
      setUploadMode('url');
    } else {
      setAppId('default');
      setAppName('NextLog Android');
      setVersionName('');
      setVersionCode('');
      setDownloadUrl('');
      setFileName('');
      setFileSize(undefined);
      setFileMd5('');
      setFileSha256('');
      setChangelog('1. 优化应用运行性能与网络连接\n2. 修复已知异常与偶发崩溃\n3. 优化界面交互体验');
      setForceUpdate(false);
      setMinVersionCode('');
      setChannel('default');
      setStatus('published');
      setUploadMode('upload');
    }
    setErrorMessage(null);
    setUploadSuccessInfo(null);
  }, [editingVersion, isOpen]);

  if (!isOpen) return null;

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    const originalName = file.name || '';
    const lower = originalName.toLowerCase();

    if (!lower.endsWith('.apk') && !lower.endsWith('.aab') && !lower.endsWith('.zip')) {
      setErrorMessage('仅支持上传 Android 打包安装包文件 (.apk, .aab, .zip)');
      return;
    }

    setIsUploading(true);
    setUploadProgressText(`正在上传 ${originalName} (${formatBytes(file.size)})...`);
    setErrorMessage(null);

    // 智能尝试从文件名提取版本号 (如 app-v1.2.3.apk -> 1.2.3)
    const versionMatch = originalName.match(/v?(\d+\.\d+(\.\d+)?)/i);
    if (versionMatch && !versionName) {
      setVersionName(versionMatch[1]);
      // 简单推导 versionCode，例如 1.2.3 -> 10203
      const parts = versionMatch[1].split('.').map((p) => parseInt(p, 10));
      if (parts.length >= 2 && !versionCode) {
        const major = parts[0] || 0;
        const minor = parts[1] || 0;
        const patch = parts[2] || 0;
        setVersionCode(major * 10000 + minor * 100 + patch);
      }
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/apps/upload', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
        },
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.url) {
        setDownloadUrl(data.url);
        setFileName(data.fileName || originalName);
        setFileSize(data.fileSize || file.size);
        if (data.fileMd5) setFileMd5(data.fileMd5);
        if (data.fileSha256) setFileSha256(data.fileSha256);
        setUploadSuccessInfo(`安装包已成功上传至 ${data.storage === 'vercel-blob' ? 'Vercel Blob 云存储' : '本地存储'}`);
      } else {
        setErrorMessage(data.error || '上传安装包失败');
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络连接异常，上传中断');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!appId.trim()) {
      setErrorMessage('请填写应用标识 (appId)');
      return;
    }
    if (!versionName.trim()) {
      setErrorMessage('请填写版本名称 (versionName)，如 1.0.0');
      return;
    }
    const cleanCode = parseInt(String(versionCode), 10);
    if (isNaN(cleanCode) || cleanCode <= 0) {
      setErrorMessage('版本号 (versionCode) 必须是大于 0 的整数，用于比较版本高低');
      return;
    }
    if (!downloadUrl.trim()) {
      setErrorMessage('请上传安装包或提供有效的下载地址');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingVersion) {
        // 更新现有版本
        const payload: UpdateAppVersionInput = {
          _id: editingVersion._id!,
          appId: appId.trim(),
          appName: appName.trim(),
          versionName: versionName.trim(),
          versionCode: cleanCode,
          downloadUrl: downloadUrl.trim(),
          fileName: fileName.trim() || undefined,
          fileSize: fileSize,
          fileMd5: fileMd5.trim() || undefined,
          fileSha256: fileSha256.trim() || undefined,
          changelog: changelog.trim(),
          forceUpdate,
          minVersionCode: minVersionCode ? parseInt(String(minVersionCode), 10) : undefined,
          channel: channel.trim() || 'default',
          status,
        };

        const res = await fetch('/api/apps/versions', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          onSuccess('版本信息更新成功');
          onClose();
        } else {
          setErrorMessage(data.error || '更新失败');
        }
      } else {
        // 创建新发布版本
        const payload: CreateAppVersionInput = {
          appId: appId.trim(),
          appName: appName.trim(),
          versionName: versionName.trim(),
          versionCode: cleanCode,
          downloadUrl: downloadUrl.trim(),
          fileName: fileName.trim() || undefined,
          fileSize: fileSize,
          fileMd5: fileMd5.trim() || undefined,
          fileSha256: fileSha256.trim() || undefined,
          changelog: changelog.trim(),
          forceUpdate,
          minVersionCode: minVersionCode ? parseInt(String(minVersionCode), 10) : undefined,
          channel: channel.trim() || 'default',
          status,
        };

        const res = await fetch('/api/apps/versions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          onSuccess(`新版本 v${versionName} (${cleanCode}) 发布成功！`);
          onClose();
        } else {
          setErrorMessage(data.error || '创建版本失败');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络请求错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {editingVersion ? '编辑 App 版本配置' : '发布新版本 App'}
              </h3>
              <p className="text-xs text-slate-400">
                配置版本号、更新日志、上传打包后的 APK 安装包或指定下载地址
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. App 基本信息 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                应用标识 (App ID) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="例如: com.example.app 或 default"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                required
              />
              <div className="mt-1 flex items-center space-x-1">
                <span className="text-[10px] text-slate-500">快捷填充:</span>
                <button
                  type="button"
                  onClick={() => setAppId('default')}
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  default
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => setAppId('com.example.app')}
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  com.example.app
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">应用名称</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="例如: NextLog Android"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 2. 版本号与版本名 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                版本名称 (versionName) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="例如: 1.2.0"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                required
              />
              <p className="mt-1 text-[10px] text-slate-500">向用户展示的版本文本，如 1.0.0, 2.1.3</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                内部版本号 (versionCode) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                placeholder="例如: 10200"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                required
              />
              <p className="mt-1 text-[10px] text-slate-500">
                纯整数，客户端判断更新核心依据（新版本号 &gt; 客户端版本号即提示更新）
              </p>
            </div>
          </div>

          {/* 3. 安装包获取方式切换 */}
          <div className="border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300">
                安装包来源 <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUploadMode('upload')}
                  className={`flex items-center space-x-1 rounded-md px-2 py-0.5 transition ${
                    uploadMode === 'upload'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="h-3 w-3" />
                  <span>上传 APK</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`flex items-center space-x-1 rounded-md px-2 py-0.5 transition ${
                    uploadMode === 'url'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LinkIcon className="h-3 w-3" />
                  <span>直接填写直链</span>
                </button>
              </div>
            </div>

            {uploadMode === 'upload' ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/40 p-6 text-center hover:border-indigo-500/80 hover:bg-slate-800/70 transition cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".apk,.aab,.zip"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />

                {isUploading ? (
                  <div className="flex flex-col items-center py-2">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                    <p className="mt-2 text-xs font-medium text-slate-200">{uploadProgressText}</p>
                    <p className="text-[10px] text-slate-500 mt-1">正在校验哈希并写入存储，请稍候...</p>
                  </div>
                ) : downloadUrl ? (
                  <div className="flex flex-col items-center py-1">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    <p className="mt-2 text-xs font-semibold text-emerald-300">
                      安装包已就绪: {fileName || 'app-release.apk'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      大小: {formatBytes(fileSize)} {fileMd5 && `· MD5: ${fileMd5.substring(0, 10)}...`}
                    </p>
                    <span className="mt-2 text-[10px] text-indigo-400 underline">点击重新选择并替换</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-slate-500 group-hover:text-indigo-400 transition" />
                    <p className="mt-2 text-xs font-medium text-slate-300">
                      拖拽 Android 安装包 (.apk) 到此处，或 <span className="text-indigo-400 underline">点击上传</span>
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      系统将自动分析包名并生成 MD5 / SHA-256 哈希值
                    </p>
                  </>
                )}
              </div>
            ) : null}

            {uploadSuccessInfo && (
              <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{uploadSuccessInfo}</span>
              </div>
            )}

            {/* 下载地址显示与编辑 */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                安装包下载地址 (Download URL) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                placeholder="上传 APK 自动生成，或直接粘贴外部 CDN / OSS 下载直链..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            {/* 校验信息扩展 */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">文件 MD5 完整性校验码 (选填)</label>
                <input
                  type="text"
                  value={fileMd5}
                  onChange={(e) => setFileMd5(e.target.value)}
                  placeholder="32位 MD5 散列值"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">文件大小 (字节)</label>
                <input
                  type="number"
                  value={fileSize ?? ''}
                  onChange={(e) => setFileSize(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="例如: 18456200"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. 更新策略 (强制更新 / 最低支持版本 / 发布渠道) */}
          <div className="border-t border-slate-800 pt-3 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300">更新推送策略</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 强制更新开关 */}
              <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 p-2.5">
                <div>
                  <div className="text-xs font-medium text-slate-200">全员强制更新</div>
                  <div className="text-[10px] text-slate-400">客户端升级弹窗禁止关闭</div>
                </div>
                <input
                  type="checkbox"
                  checked={forceUpdate}
                  onChange={(e) => setForceUpdate(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
              </div>

              {/* 最低支持版本 */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  最低支持版本号 (minVersionCode)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minVersionCode}
                  onChange={(e) =>
                    setMinVersionCode(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                  }
                  placeholder="低于此版本强制升级"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* 发布渠道 */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">发布渠道</label>
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="如: default, official, beta"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 发布状态 */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">版本上线状态</label>
              <div className="flex items-center space-x-3 text-xs">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={status === 'published'}
                    onChange={() => setStatus('published')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-emerald-400 font-medium">已发布 (立即生效并对 Android 端可见)</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-amber-400">草稿 (暂不上线)</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="archived"
                    checked={status === 'archived'}
                    onChange={() => setStatus('archived')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-400">已归档</span>
                </label>
              </div>
            </div>
          </div>

          {/* 5. 更新日志 (Changelog) */}
          <div className="border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">更新日志 (Changelog)</label>
              <span className="text-[10px] text-slate-500">将在客户端更新弹窗中向用户展示</span>
            </div>
            <textarea
              rows={4}
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="1. 新增功能特性说明&#10;2. 修复已知问题&#10;3. 性能优化与界面改进"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>正在提交...</span>
                </>
              ) : (
                <span>{editingVersion ? '保存修改' : '确认发布'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
