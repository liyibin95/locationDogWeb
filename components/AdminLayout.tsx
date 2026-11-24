'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ScrollText,
  Sliders,
  Bell,
  BookOpen,
  Key,
  LogOut,
  Plus,
  RefreshCw,
  Menu,
  X,
  ChevronRight,
  Database,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  onOpenCreate?: () => void;
  createButtonText?: string;
  showCreateButton?: boolean;
  onOpenApiDocs?: () => void;
  apiKey: string;
  onUpdateApiKey: (key: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs,
  onOpenCreate,
  createButtonText = '新增',
  showCreateButton = true,
  onOpenApiDocs,
  apiKey,
  onUpdateApiKey,
  onRefresh,
  isLoading = false,
}) => {
  const pathname = usePathname();

  // Sidebar mobile drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sidebar desktop collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // API Key prompt popup
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  useEffect(() => {
    setTempKey(apiKey);
  }, [apiKey]);

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

  const menuItems = [
    {
      group: '应用服务管理',
      items: [
        {
          label: '日志中心',
          desc: '分布式日志采集与查询',
          href: '/',
          icon: ScrollText,
          active: pathname === '/',
        },
        {
          label: '配置中心',
          desc: 'Android 动态配置与开关',
          href: '/configs',
          icon: Sliders,
          active: pathname.startsWith('/configs'),
        },
        {
          label: '消息中心',
          desc: '公告、通知与启动弹窗',
          href: '/messages',
          icon: Bell,
          active: pathname.startsWith('/messages'),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* ========================================================= */}
      {/* 1. Mobile Sidebar Backdrop Drawer                         */}
      {/* ========================================================= */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ========================================================= */}
      {/* 2. Left Sidebar (Fixed on Desktop, Drawer on Mobile)      */}
      {/* ========================================================= */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-xl transition-all duration-300 md:static ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-16' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <Link href="/" className="flex items-center space-x-3 overflow-hidden group">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <div className="flex items-center space-x-1.5">
                  <h1 className="text-base font-bold tracking-tight text-white group-hover:text-indigo-200 truncate">
                    NextLog
                  </h1>
                  <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.2 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">Android 后台管理系统</p>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title={isCollapsed ? '展开菜单' : '收起菜单'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {menuItems.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all group ${
                      item.active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 transition-transform ${
                        item.active
                          ? 'text-white'
                          : 'text-slate-400 group-hover:scale-110 group-hover:text-indigo-400'
                      }`}
                    />
                    {!isCollapsed && (
                      <div className="min-w-0 flex-1 truncate">
                        <div className="font-semibold">{item.label}</div>
                        <div
                          className={`text-[10px] truncate ${
                            item.active ? 'text-indigo-100' : 'text-slate-500'
                          }`}
                        >
                          {item.desc}
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer Info */}
        <div className="border-t border-slate-800 p-3 space-y-2">
          {/* DB & App Status */}
          {!isCollapsed && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Database className="h-3 w-3 text-emerald-400" />
                  <span>MongoDB Atlas</span>
                </span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                已就绪 · 日志/配置/消息已联通
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="退出控制台"
            className={`w-full flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2 text-xs font-medium text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 transition ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>安全退出</span>}
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 3. Right Content Area (Top Bar + Main Scroll Content)     */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="text-slate-500">后台管理</span>
                <ChevronRight className="h-3 w-3 text-slate-600" />
                {breadcrumbs && breadcrumbs.length > 0 ? (
                  breadcrumbs.map((b, i) => (
                    <React.Fragment key={i}>
                      {b.href ? (
                        <Link href={b.href} className="hover:text-slate-200">
                          {b.label}
                        </Link>
                      ) : (
                        <span className="font-medium text-white">{b.label}</span>
                      )}
                      {i < breadcrumbs.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-slate-600" />
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <span className="font-medium text-white">{title}</span>
                )}
              </div>
              {subtitle && (
                <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Refresh Button */}
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

            {/* API Docs Button */}
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
                <span className="hidden sm:inline">{apiKey ? '已设 Key' : '未设 Key'}</span>
              </button>

              {/* Popup to configure API Key */}
              {showKeyPrompt && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl z-50">
                  <h4 className="text-sm font-semibold text-white">配置客户端 API Key</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    用于前端弹窗新增日志及写接口鉴权（保存在本地浏览器）：
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

            {/* Create Action Button */}
            {showCreateButton && onOpenCreate && (
              <button
                onClick={onOpenCreate}
                className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{createButtonText}</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
          NextLog 后台管理系统 &copy; {new Date().getFullYear()} - 基于 Next.js 与 Vercel MongoDB
        </footer>
      </div>
    </div>
  );
};
