'use client';

import React, { useState } from 'react';
import { MessageDocument } from '@/types/message';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import {
  X,
  Wifi,
  Battery,
  Signal,
  Bell,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Globe,
} from 'lucide-react';

interface MessagePreviewModalProps {
  message: MessageDocument | null;
  onClose: () => void;
}

export const MessagePreviewModal: React.FC<MessagePreviewModalProps> = ({ message, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const h5Path = `/h5/messages/${message._id}${message.status !== 'published' ? '?preview=true' : ''}`;
  const fullH5Url =
    typeof window !== 'undefined'
      ? `${window.location.origin}${h5Path}`
      : h5Path;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fullH5Url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-sm rounded-3xl border-4 border-slate-700 bg-slate-950 p-4 shadow-2xl my-6">
        {/* Android Phone Top Notch / Speaker & Status Bar */}
        <div className="mx-auto h-4 w-28 rounded-b-xl bg-slate-800 mb-2"></div>
        <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 font-mono mb-4">
          <span>09:41</span>
          <div className="flex items-center space-x-1.5">
            <Signal className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <Battery className="h-3 w-3" />
          </div>
        </div>

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-800 p-1 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Simulated Screen Content */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 min-h-[460px] flex flex-col justify-between">
          <div className="overflow-y-auto max-h-[420px] pr-1">
            {/* App Bar Preview */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                App
              </div>
              <div>
                <div className="text-xs font-semibold text-white">我的 Android 应用</div>
                <div className="text-[9px] text-slate-500 flex items-center space-x-1.5">
                  <span>{message.appId}</span>
                  {message.key && <span className="font-mono text-indigo-400">· key: {message.key}</span>}
                </div>
              </div>
            </div>

            {/* If it's a popup */}
            {message.isPopup ? (
              <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-slate-800/90 p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="rounded-full bg-indigo-500/20 p-1.5 text-indigo-400">
                    <Bell className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400">
                    {message.type === 'upgrade'
                      ? '新版本发布'
                      : message.type === 'alert'
                      ? '紧急系统告警'
                      : '系统公告'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-2">{message.title}</h4>

                {/* Markdown Rich Text Content */}
                <div className="text-xs text-slate-300 leading-relaxed max-h-56 overflow-y-auto pr-1">
                  <MarkdownRenderer content={message.content} />
                </div>

                {/* Action buttons inside popup */}
                <div className="mt-4 space-y-2">
                  {message.actionUrl && (
                    <button className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30">
                      <span>{message.actionText || '立即前往'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-full rounded-xl bg-slate-700/60 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                  >
                    我知道了
                  </button>
                </div>
              </div>
            ) : (
              /* Regular In-App Notification / List Card */
              <div className="mt-4 space-y-3">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>站内消息中心</span>
                  <span className="text-[10px] text-indigo-400">最新通知</span>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                      {message.type}
                    </span>
                    <span className="text-[10px] text-slate-400">刚刚</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{message.title}</h4>

                  {/* Markdown Rich Text Content */}
                  <div className="text-[11px] text-slate-300 leading-relaxed">
                    <MarkdownRenderer content={message.content} />
                  </div>

                  {message.actionUrl && (
                    <div className="pt-1 flex items-center space-x-1 text-[11px] text-indigo-400 hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      <span>{message.actionText || message.actionUrl}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Android Home Navigation Bar Pill */}
          <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-slate-600"></div>
        </div>

        {/* Android App H5 Embed Link Info */}
        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1 text-emerald-400 font-medium">
              <Globe className="h-3.5 w-3.5" />
              <span>Android App H5 嵌入链接</span>
            </span>
            <a
              href={h5Path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 transition"
            >
              <span>新标签打开</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1.5">
            <span className="flex-1 font-mono text-[10px] text-slate-300 truncate select-all px-1">
              {fullH5Url}
            </span>
            <button
              onClick={handleCopyUrl}
              className="flex items-center space-x-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-2 py-1 text-[10px] font-medium transition"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>复制</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
