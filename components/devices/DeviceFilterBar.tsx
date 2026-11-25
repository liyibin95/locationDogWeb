'use client';

import React from 'react';
import { Search, RotateCcw, Filter, Smartphone, MessageSquare, ArrowDownUp } from 'lucide-react';

interface DeviceFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  wechatStatus: string;
  onWechatStatusChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (val: 'asc' | 'desc') => void;
  onReset: () => void;
}

export const DeviceFilterBar: React.FC<DeviceFilterBarProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  wechatStatus,
  onWechatStatusChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onReset,
}) => {
  const isFiltered =
    Boolean(search) || status !== 'all' || wechatStatus !== 'all' || sortBy !== 'createdAt' || sortOrder !== 'desc';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索设备 ID、设备硬件型号、微信 ID 或备注..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">
                全部状态
              </option>
              <option value="normal" className="bg-slate-900">
                正常运行
              </option>
              <option value="disabled" className="bg-slate-900">
                已禁用
              </option>
            </select>
          </div>

          {/* Wechat status filter */}
          <div className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-xs text-slate-300">
            <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={wechatStatus}
              onChange={(e) => onWechatStatusChange(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">
                微信绑定: 全部
              </option>
              <option value="bound" className="bg-slate-900">
                已绑定微信
              </option>
              <option value="unbound" className="bg-slate-900">
                未绑定微信
              </option>
            </select>
          </div>

          {/* Sort options */}
          <div className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-xs text-slate-300">
            <ArrowDownUp className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                onSortByChange(sb);
                onSortOrderChange(so as 'asc' | 'desc');
              }}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="createdAt-desc" className="bg-slate-900">
                注册时间: 最新
              </option>
              <option value="createdAt-asc" className="bg-slate-900">
                注册时间: 最早
              </option>
              <option value="points-desc" className="bg-slate-900">
                积分数量: 从高到低
              </option>
              <option value="points-asc" className="bg-slate-900">
                积分数量: 从低到高
              </option>
            </select>
          </div>

          {/* Reset button */}
          {isFiltered && (
            <button
              onClick={onReset}
              className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="重置所有过滤条件"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>重置</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
