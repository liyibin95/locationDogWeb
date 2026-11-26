'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BookOpen, Key, LogOut, Plus, RefreshCw, ScrollText, Sliders, Bell, Smartphone, MessageSquareText, Package } from 'lucide-react';

interface NavbarProps {
  onOpenCreate?: () => void;
  onOpenApiDocs?: () => void;
  apiKey: string;
  onUpdateApiKey: (key: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  createButtonText?: string;
  showCreateButton?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreate,
  onOpenApiDocs,
  apiKey,
  onUpdateApiKey,
  onRefresh,
  isLoading = false,
  createButtonText = '新增',
  showCreateButton = true,
}) => {
  const pathname = usePathname();
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

  const navItems = [
    { label: '日志中心', href: '/', icon: ScrollText, active: pathname === '/' },
    { label: '配置中心', href: '/configs', icon: Sliders, active: pathname.startsWith('/configs') },
    { label: '消息中心', href: '/messages', icon: Bell, active: pathname.startsWith('/messages') },
    { label: '设备管理', href: '/devices', icon: Smartphone, active: pathname.startsWith('/devices') },
    { label: '意见反馈', href: '/feedbacks', icon: MessageSquareText, active: pathname.startsWith('/feedbacks') },
    { label: '版本管理', href: '/apps', icon: Package, active: pathname.startsWith('/apps') },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Brand & Tabs */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                  NextLog
                </h1>
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                  App Hub
                </span>
              </div>
              <p className="text-[11px] text-slate-400">日志 · 配置 · 消息中心</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 border-l border-slate-800 pl-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    item.active
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
              title="刷新数据"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">刷新</span>
            </button>
          )}

          {/* API Docs Modal Trigger */}
          {onOpenApiDocs && (
            <button
              onClick={onOpenApiDocs}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="接口调用文档"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">API 文档</span>
            </button>
          )}

          {/* API Key Configure Button */}
          <div className="relative">
            <button
              onClick={() => {
                setTempKey(apiKey);
                setShowKeyPrompt(!showKeyPrompt);
              }}
              className={`flex items-center space-x-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
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
                  用于前端弹窗操作及接口鉴权验证（保存在本地浏览器）：
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

          {/* Action Create Button */}
          {showCreateButton && onOpenCreate && (
            <button
              onClick={onOpenCreate}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{createButtonText}</span>
            </button>
          )}

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

      {/* Mobile nav subbar */}
      <div className="flex md:hidden border-t border-slate-800/80 px-4 py-1.5 space-x-2 overflow-x-auto bg-slate-900/90">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                item.active
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
