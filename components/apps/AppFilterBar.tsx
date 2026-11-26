'use client';

import React from 'react';
import { Search, RotateCcw, Filter, ArrowUpDown } from 'lucide-react';

interface AppFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  channel: string;
  onChannelChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  sortOrder: 'asc' | 'desc';
  onToggleSortOrder: () => void;
  onReset: () => void;
}

export const AppFilterBar: React.FC<AppFilterBarProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  channel,
  onChannelChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  onReset,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      {/* 搜索框 */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索应用标识 (appId)、应用名、版本号或更新日志..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800/80 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
        />
      </div>

      {/* 筛选条件组 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 状态筛选 */}
        <div className="flex items-center space-x-1">
          <span className="text-[11px] text-slate-400">状态:</span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 py-1.5 px-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value="published">已发布 (生效中)</option>
            <option value="draft">草稿</option>
            <option value="archived">已归档 (下线)</option>
          </select>
        </div>

        {/* 渠道筛选 */}
        <div className="flex items-center space-x-1">
          <span className="text-[11px] text-slate-400">渠道:</span>
          <select
            value={channel}
            onChange={(e) => onChannelChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 py-1.5 px-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">全部渠道</option>
            <option value="default">默认渠道 (default)</option>
            <option value="official">官方渠道 (official)</option>
            <option value="beta">公测体验 (beta)</option>
            <option value="googleplay">Google Play</option>
          </select>
        </div>

        {/* 排序字段 */}
        <div className="flex items-center space-x-1">
          <span className="text-[11px] text-slate-400">排序:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 py-1.5 px-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="versionCode">版本号 (Code)</option>
            <option value="createdAt">创建时间</option>
            <option value="downloadCount">下载次数</option>
          </select>
        </div>

        {/* 升序/降序切换 */}
        <button
          onClick={onToggleSortOrder}
          title={sortOrder === 'asc' ? '当前升序，点击切换降序' : '当前降序，点击切换升序'}
          className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
        >
          <ArrowUpDown className="h-3 w-3" />
          <span className="text-[11px]">{sortOrder === 'asc' ? '升序' : '降序'}</span>
        </button>

        {/* 重置过滤器 */}
        <button
          onClick={onReset}
          title="重置所有筛选条件"
          className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-700 hover:text-white transition"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline text-[11px]">重置</span>
        </button>
      </div>
    </div>
  );
};
