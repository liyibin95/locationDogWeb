'use client';

import React from 'react';
import { Calendar, Filter, RotateCcw, Search } from 'lucide-react';
import { LogLevel } from '@/types/log';

interface LogFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  level: LogLevel | 'all';
  onLevelChange: (level: LogLevel | 'all') => void;
  service: string;
  onServiceChange: (service: string) => void;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  onReset: () => void;
  availableServices: string[];
}

export const LogFilterBar: React.FC<LogFilterBarProps> = ({
  search,
  onSearchChange,
  level,
  onLevelChange,
  service,
  onServiceChange,
  startDate,
  endDate,
  onDateChange,
  onReset,
  availableServices,
}) => {
  const setQuickDate = (days: number | null) => {
    if (days === null) {
      onDateChange('', '');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    onDateChange(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
  };

  const isFiltered = search !== '' || level !== 'all' || service !== '' || startDate !== '' || endDate !== '';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm shadow-sm space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索消息内容或服务..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Level filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <select
            value={level}
            onChange={(e) => onLevelChange(e.target.value as LogLevel | 'all')}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition appearance-none cursor-pointer"
          >
            <option value="all">所有日志级别 (ALL)</option>
            <option value="info">INFO - 正常日志</option>
            <option value="warn">WARN - 警告日志</option>
            <option value="error">ERROR - 错误异常</option>
            <option value="debug">DEBUG - 调试信息</option>
          </select>
        </div>

        {/* Service filter */}
        <div>
          <input
            list="services-list"
            type="text"
            value={service}
            onChange={(e) => onServiceChange(e.target.value)}
            placeholder="按服务名过滤 (如 auth, api)..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
          <datalist id="services-list">
            {availableServices.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {/* Date range quick selector */}
        <div className="flex items-center space-x-1 sm:col-span-2 lg:col-span-1">
          <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <button
            type="button"
            onClick={() => setQuickDate(0)}
            className={`flex-1 rounded-md py-1.5 text-xs transition border ${
              startDate && startDate === endDate
                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            今天
          </button>
          <button
            type="button"
            onClick={() => setQuickDate(7)}
            className="flex-1 rounded-md border border-slate-700 bg-slate-800 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
          >
            近7天
          </button>
          <button
            type="button"
            onClick={() => setQuickDate(30)}
            className="flex-1 rounded-md border border-slate-700 bg-slate-800 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
          >
            近30天
          </button>
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
              title="重置所有筛选"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Pickers when set or customized */}
      {(startDate || endDate) && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
          <span>自定义时间：</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onDateChange(e.target.value, endDate)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
          />
          <span>至</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange(startDate, e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
          />
          <button
            type="button"
            onClick={() => onDateChange('', '')}
            className="text-xs text-indigo-400 hover:underline"
          >
            清除时间
          </button>
        </div>
      )}
    </div>
  );
};
