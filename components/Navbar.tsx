'use client';

import React from 'react';
import { Activity, BookOpen, Key, LogOut, Plus, RefreshCw } from 'lucide-react';

interface NavbarProps {
  onOpenCreate: () => void;
  onOpenApiDocs: () => void;
  apiKey: string;
  onUpdateApiKey: (key: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreate,
  onOpenApiDocs,
  apiKey,
  onUpdateApiKey,
  onRefresh,
  isLoading,
}) => {
  const [showKeyPrompt, setShowKeyPrompt] = React.useState(false);
  const [tempKey, setTempKey] = React.useState(apiKey);

  const handleSaveKey = () => {
    onUpdateApiKey(tempKey);
    setShowKeyPrompt(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/20">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white">NextLog</h1>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                MongoDB
              </span>
            </div>
            <p className="text-xs text-slate-400">日志查询与采集系统</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            title="刷新数据"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">刷新</span>
          </button>

          {/* API Docs Modal Trigger */}
          <button
            onClick={onOpenApiDocs}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            title="接口调用文档"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">API 文档</span>
          </button>

          {/* API Key Configure Button */}
          <div className="relative">
            <button
              onClick={() => {
                setTempKey(apiKey);
                setShowKeyPrompt(!showKeyPrompt);
              }}
              className={`flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                apiKey
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
              }`}
              title="配置测试 API Key"
            >
              <Key className="h-3.5 w-3.5" />
              <span>{apiKey ? '已设 API Key' : '未设 Key'}</span>
            </button>

            {/* Popup to configure API Key */}
            {showKeyPrompt && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl z-50">
                <h4 className="text-sm font-semibold text-white">配置客户端 API Key</h4>
                <p className="mt-1 text-xs text-slate-400">
                  用于前端弹窗新增日志及鉴权验证（保存在本地浏览器）：
                </p>
                <input
                  type="text"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="输入 LOG_API_KEY..."
                  className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <div className="mt-3 flex justify-end space-x-2">
                  <button
                    onClick={() => setShowKeyPrompt(false)}
                    className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveKey}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                  >
                    保存
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Create Log Button */}
          <button
            onClick={onOpenCreate}
            className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>新增日志</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition"
            title="锁定并退出控制台"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">退出</span>
          </button>
        </div>
      </div>
    </header>
  );
};
