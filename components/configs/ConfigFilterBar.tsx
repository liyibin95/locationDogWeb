'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface ConfigFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  group: string;
  onGroupChange: (val: string) => void;
  appId: string;
  onAppIdChange: (val: string) => void;
  environment: string;
  onEnvironmentChange: (val: string) => void;
  isEnabled: string;
  onIsEnabledChange: (val: string) => void;
  onReset: () => void;
  availableGroups: string[];
  availableApps: string[];
}

export const ConfigFilterBar: React.FC<ConfigFilterBarProps> = ({
  search,
  onSearchChange,
  group,
  onGroupChange,
  appId,
  onAppIdChange,
  environment,
  onEnvironmentChange,
  isEnabled,
  onIsEnabledChange,
  onReset,
  availableGroups,
  availableApps,
}) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索配置键名 (key)、描述或分组..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filter controls */}
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

          {/* Group filter */}
          <select
            value={group}
            onChange={(e) => onGroupChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">全部分组</option>
            {availableGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Environment filter */}
          <select
            value={environment}
            onChange={(e) => onEnvironmentChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">所有环境</option>
            <option value="prod">生产环境 (prod)</option>
            <option value="beta">测试环境 (beta)</option>
            <option value="dev">开发环境 (dev)</option>
          </select>

          {/* Status filter */}
          <select
            value={isEnabled}
            onChange={(e) => onIsEnabledChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">所有状态</option>
            <option value="true">仅启用 (Active)</option>
            <option value="false">仅停用 (Inactive)</option>
          </select>

          {/* Reset button */}
          <button
            onClick={onReset}
            className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-2 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-white transition"
            title="重置全部筛选条件"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">重置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
