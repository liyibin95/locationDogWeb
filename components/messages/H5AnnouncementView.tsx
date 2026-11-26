'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { H5MarkdownRenderer } from './H5MarkdownRenderer';
import {
  ArrowLeft,
  Calendar,
  Eye,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Share2,
  Sun,
  Moon,
  RefreshCw,
  X,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

export interface H5AnnouncementData {
  _id: string;
  key?: string;
  title: string;
  content: string;
  type: 'announcement' | 'notification' | 'upgrade' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  appId: string;
  targetType: string;
  targetValue?: string;
  actionUrl?: string;
  actionText?: string;
  isPopup?: boolean;
  extra?: Record<string, any>;
  publishAt: string | Date;
  expireAt?: string | Date | null;
  isExpired?: boolean;
  readCount?: number;
  isRead?: boolean;
}

interface H5AnnouncementViewProps {
  id?: string;
  keyParam?: string;
  appId?: string;
  userId?: string;
  channel?: string;
  versionCode?: number;
  themeParam?: 'dark' | 'light' | 'auto';
  hideHeader?: boolean;
  hideAction?: boolean;
  preview?: boolean;
  initialData?: H5AnnouncementData | null;
}

export const H5AnnouncementView: React.FC<H5AnnouncementViewProps> = ({
  id,
  keyParam,
  appId = '',
  userId = '',
  channel = '',
  versionCode,
  themeParam = 'auto',
  hideHeader = false,
  hideAction = false,
  preview = false,
  initialData = null,
}) => {
  const [data, setData] = useState<H5AnnouncementData | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Theme resolution: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fullscreen image lightbox modal
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Determine theme
  useEffect(() => {
    if (themeParam === 'dark') {
      setTheme('dark');
    } else if (themeParam === 'light') {
      setTheme('light');
    } else {
      // Auto: detect system preference
      if (typeof window !== 'undefined' && window.matchMedia) {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(isDark ? 'dark' : 'light');
      } else {
        setTheme('dark');
      }
    }
  }, [themeParam]);

  // Fetch Announcement Data
  const fetchData = useCallback(async () => {
    if (!id && !keyParam) {
      setErrorMessage('缺少公告参数：请提供 id 或 key 进行加载');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      if (id) params.set('id', id);
      if (keyParam) params.set('key', keyParam);
      if (appId) params.set('appId', appId);
      if (userId) params.set('userId', userId);
      if (channel) params.set('channel', channel);
      if (versionCode !== undefined && !isNaN(versionCode)) {
        params.set('versionCode', String(versionCode));
      }
      if (preview) params.set('preview', 'true');

      const res = await fetch(`/api/messages/client?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);

        // Notify Android Host JS Bridge
        if (typeof window !== 'undefined' && (window as any).Android) {
          try {
            (window as any).Android.onPageLoaded?.(JSON.stringify(json.data));
          } catch (e) {
            // ignore Android JS bridge errors
          }
        }

        // Auto mark as read if userId is present and not yet read
        if (userId && json.data._id && !json.data.isRead && !preview) {
          fetch('/api/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, messageId: json.data._id }),
          })
            .then((r) => r.json())
            .then((readRes) => {
              if (readRes.success) {
                setData((prev) => (prev ? { ...prev, isRead: true } : prev));
                if (typeof window !== 'undefined' && (window as any).Android) {
                  try {
                    (window as any).Android.onMessageRead?.(json.data._id);
                  } catch (e) {
                    // ignore
                  }
                }
              }
            })
            .catch(() => {});
        }
      } else {
        setErrorMessage(json.error || '获取公告内容失败');
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络连接超时，请检查网络设置');
    } finally {
      setIsLoading(false);
    }
  }, [id, keyParam, appId, userId, channel, versionCode, preview]);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [fetchData, initialData]);

  // Handle Back / Close
  const handleClose = () => {
    if (typeof window !== 'undefined') {
      if ((window as any).Android && typeof (window as any).Android.closePage === 'function') {
        (window as any).Android.closePage();
        return;
      }
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    }
  };

  // Handle Action Button Click
  const handleActionClick = (url: string, text: string) => {
    if (!url) return;
    if (typeof window !== 'undefined') {
      if ((window as any).Android && typeof (window as any).Android.onActionClick === 'function') {
        (window as any).Android.onActionClick(url, text);
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle Image Zoom
  const handleImageClick = (url: string) => {
    if (typeof window !== 'undefined' && (window as any).Android?.onImageClick) {
      (window as any).Android.onImageClick(url);
      return;
    }
    setLightboxImg(url);
  };

  // Handle Share / Copy Link
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('公告链接已复制到剪贴板');
      });
    }
  };

  const isDark = theme === 'dark';

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'upgrade':
        return {
          label: '版本更新',
          className: isDark
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'alert':
        return {
          label: '紧急告警',
          className: isDark
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            : 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'notification':
        return {
          label: '系统通知',
          className: isDark
            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            : 'bg-cyan-50 text-cyan-700 border-cyan-200',
        };
      default:
        return {
          label: '官方公告',
          className: isDark
            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
    }
  };

  const formatDate = (dateInput?: string | Date | null) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-200 flex flex-col justify-between ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 rounded-full bg-slate-900/95 text-white px-4 py-2 text-xs shadow-xl border border-slate-700 backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar (Visible if not hideHeader) */}
      {!hideHeader && (
        <header
          className={`sticky top-0 z-40 border-b backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))] px-4 pb-2.5 transition-colors ${
            isDark
              ? 'border-slate-800/80 bg-[#0b0f19]/90'
              : 'border-slate-200/80 bg-white/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={handleClose}
              className={`rounded-full p-2 transition ${
                isDark
                  ? 'text-slate-300 hover:bg-slate-800 active:bg-slate-700'
                  : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
              }`}
              aria-label="返回"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <span className="font-semibold text-sm truncate max-w-[200px]">
              {data?.title || '公告详情'}
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`rounded-full p-2 transition ${
                  isDark
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title={isDark ? '切换浅色模式' : '切换暗色模式'}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                onClick={handleShare}
                className={`rounded-full p-2 transition ${
                  isDark
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="复制公告链接"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 pb-24">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="flex space-x-2">
              <div className={`h-5 w-16 rounded-md ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <div className={`h-5 w-24 rounded-md ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            </div>
            <div className={`h-8 w-4/5 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className={`h-4 w-1/3 rounded-md ${isDark ? 'bg-slate-800/60' : 'bg-slate-200/80'}`} />
            <div className={`h-[1px] w-full my-4 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className={`h-4 w-full rounded ${isDark ? 'bg-slate-800/70' : 'bg-slate-200'}`} />
            <div className={`h-4 w-11/12 rounded ${isDark ? 'bg-slate-800/70' : 'bg-slate-200'}`} />
            <div className={`h-4 w-4/5 rounded ${isDark ? 'bg-slate-800/70' : 'bg-slate-200'}`} />
            <div className={`h-44 w-full rounded-xl my-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-200'}`} />
            <div className={`h-4 w-full rounded ${isDark ? 'bg-slate-800/70' : 'bg-slate-200'}`} />
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div
            className={`my-12 rounded-2xl border p-6 text-center ${
              isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold mb-1.5">公告无法显示</h3>
            <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {errorMessage}
            </p>
            <button
              onClick={fetchData}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>重新加载</span>
            </button>
          </div>
        )}

        {/* Loaded Announcement Card */}
        {!isLoading && !errorMessage && data && (
          <article className="space-y-4">
            {/* Badges & Meta */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Badge */}
              <span
                className={`inline-flex items-center space-x-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                  getTypeBadge(data.type).className
                }`}
              >
                {data.isPopup && <Sparkles className="h-3 w-3 mr-0.5" />}
                <span>{getTypeBadge(data.type).label}</span>
              </span>

              {/* Priority Badge */}
              {data.priority === 'urgent' && (
                <span className="rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold">
                  紧急
                </span>
              )}
              {data.priority === 'high' && (
                <span className="rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold">
                  高优
                </span>
              )}

              {/* App Scope Badge */}
              {data.appId && data.appId !== 'all' && (
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] border font-mono ${
                    isDark
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {data.appId}
                </span>
              )}

              {/* Read / Unread Status */}
              {data.isRead !== undefined && (
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] border ${
                    data.isRead
                      ? isDark
                        ? 'bg-slate-800 text-slate-500 border-slate-700'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                      : isDark
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}
                >
                  {data.isRead ? '已读' : '新未读'}
                </span>
              )}
            </div>

            {/* Announcement Title */}
            <h1
              className={`text-xl sm:text-2xl font-bold tracking-tight leading-snug ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {data.title}
            </h1>

            {/* Date & Info Row */}
            <div
              className={`flex flex-wrap items-center justify-between text-[11px] pb-3 border-b ${
                isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Calendar className="h-3.5 w-3.5 opacity-70" />
                  <span>{formatDate(data.publishAt)}</span>
                </span>
                {data.readCount !== undefined && (
                  <span className="flex items-center space-x-1">
                    <Eye className="h-3.5 w-3.5 opacity-70" />
                    <span>阅读 {data.readCount}</span>
                  </span>
                )}
              </div>
              {data.key && (
                <span className="font-mono text-[10px] text-indigo-400">
                  key: {data.key}
                </span>
              )}
            </div>

            {/* Expired Banner Notice */}
            {data.isExpired && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">该公告已过期下线</div>
                  <div className="text-[11px] text-amber-300/80 mt-0.5">
                    展示截止时间为 {formatDate(data.expireAt)}，当前内容仅作存档展示。
                  </div>
                </div>
              </div>
            )}

            {/* Rich Text / Markdown Body */}
            <div className="pt-2">
              <H5MarkdownRenderer
                content={data.content}
                theme={theme}
                onImageClick={handleImageClick}
              />
            </div>
          </article>
        )}
      </main>

      {/* Floating Action Button (Sticky Bottom) */}
      {!hideAction && data && data.actionUrl && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-colors ${
            isDark
              ? 'border-slate-800/80 bg-[#0b0f19]/90'
              : 'border-slate-200/80 bg-white/90'
          }`}
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between space-x-3">
            <div className="flex-1 truncate">
              <div className="text-xs font-semibold truncate">{data.actionText || '立即前往'}</div>
              <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {data.actionUrl}
              </div>
            </div>
            <button
              onClick={() => handleActionClick(data.actionUrl!, data.actionText || '立即前往')}
              className="flex-shrink-0 inline-flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition"
            >
              <span>{data.actionText || '立即前往'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Modal (Click to zoom image) */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxImg(null)}
        >
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 z-10 rounded-full bg-slate-800/80 p-2 text-white hover:bg-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxImg}
            alt="大图预览"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
