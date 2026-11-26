'use client';

import React from 'react';
import { Search, RotateCcw, Filter, Tag, AlertOctagon, ArrowDownUp } from 'lucide-react';

interface FeedbackFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  type: string;
  onTypeChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  priority: string;
  onPriorityChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (val: 'asc' | 'desc') => void;
  onReset: () => void;
}

export const FeedbackFilterBar: React.FC<FeedbackFilterBarProps> = ({
  search,
  onSearchChange,
  type,
  onTypeChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onReset,
}) => {
  const isFiltered =
    Boolean(search) ||
    type !== 'all' ||
    status !== 'all' ||
    priority !== 'all' ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc';

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
            placeholder="搜索反馈标题、内容描述、联系方式、设备 ID 或处理答复..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <div className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-xs text-slate-300">
            <Tag className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">
                全部类型
              </option>
              <option value="suggestion" className="bg-slate-900">
                💡 产品建议
              </option>
              <option value="bug" className="bg-slate-900">
                🐛 缺陷反馈
              </option>
              <option value="feature" className="bg-slate-900">
                ✨ 功能需求
              </option>
              <option value="complaint" className="bg-slate-900">
                📢 吐槽投诉
              </option>
              <option value="other" className="bg-slate-900">
                💬 其它反馈
              </option>
            </select>
          </div>

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
              <option value="pending" className="bg-slate-900">
                ⏳ 待处理
              </option>
              <option value="processing" className="bg-slate-900">
                🔄 处理中
              </option>
              <option value="resolved" className="bg-slate-900">
                ✅ 已解决
              </option>
              <option value="closed" className="bg-slate-900">
                📁 已关闭
              </option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-xs text-slate-300">
            <AlertOctagon className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={priority}
              onChange={(e) => onPriorityChange(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">
                全部优先级
              </option>
              <option value="urgent" className="bg-slate-900">
                🔴 紧急
              </option>
              <option value="high" className="bg-slate-900">
                🟠 高
              </option>
              <option value="normal" className="bg-slate-900">
                🔵 普通
              </option>
              <option value="low" className="bg-slate-900">
                ⚪ 低
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
                提交时间: 最新
              </option>
              <option value="createdAt-asc" className="bg-slate-900">
                提交时间: 最早
              </option>
              <option value="updatedAt-desc" className="bg-slate-900">
                更新时间: 最新
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
