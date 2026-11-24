'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface MessageFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  type: string;
  onTypeChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  priority: string;
  onPriorityChange: (val: string) => void;
  appId: string;
  onAppIdChange: (val: string) => void;
  onReset: () => void;
  availableApps: string[];
}

export const MessageFilterBar: React.FC<MessageFilterBarProps> = ({
  search,
  onSearchChange,
  type,
  onTypeChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  appId,
  onAppIdChange,
  onReset,
  availableApps,
}) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索消息标题、内容或定向目标..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Selects */}
        <div className="flex flex-wrap items-center gap-2">
          {/* App ID filter */}
          <select
            value={appId}
            onChange={(e) => onAppIdChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">所有 App 目标</option>
            {availableApps.map((app) => (
              <option key={app} value={app}>
                {app}
              </option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">所有消息类型</option>
            <option value="announcement">系统公告 (Announcement)</option>
            <option value="notification">通知消息 (Notification)</option>
            <option value="upgrade">版本升级 (Upgrade)</option>
            <option value="alert">紧急告警 (Alert)</option>
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">所有发布状态</option>
            <option value="published">已发布 (Published)</option>
            <option value="draft">草稿 (Draft)</option>
            <option value="archived">已归档 (Archived)</option>
          </select>

          {/* Priority filter */}
          <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">所有优先级</option>
            <option value="urgent">紧急 (Urgent)</option>
            <option value="high">高 (High)</option>
            <option value="normal">普通 (Normal)</option>
            <option value="low">低 (Low)</option>
          </select>

          {/* Reset button */}
          <button
            onClick={onReset}
            className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-2 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-white transition"
            title="重置所有筛选"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">重置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
