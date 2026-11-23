'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Bug, CheckCircle2, Layers } from 'lucide-react';
import { LogStats, LogLevel } from '@/types/log';

interface StatsOverviewProps {
  stats: LogStats | null;
  currentLevel: LogLevel | 'all';
  onSelectLevel: (level: LogLevel | 'all') => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  currentLevel,
  onSelectLevel,
}) => {
  const cards = [
    {
      level: 'all' as const,
      label: '全部日志',
      count: stats?.total ?? 0,
      icon: Layers,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40',
      activeColor: 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/20',
    },
    {
      level: 'info' as const,
      label: 'INFO 正常',
      count: stats?.info ?? 0,
      icon: CheckCircle2,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10 border-sky-500/20 hover:border-sky-500/40',
      activeColor: 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/20',
    },
    {
      level: 'warn' as const,
      label: 'WARN 警告',
      count: stats?.warn ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
      activeColor: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/20',
    },
    {
      level: 'error' as const,
      label: 'ERROR 错误',
      count: stats?.error ?? 0,
      icon: AlertCircle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40',
      activeColor: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/20',
    },
    {
      level: 'debug' as const,
      label: 'DEBUG 调试',
      count: stats?.debug ?? 0,
      icon: Bug,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40',
      activeColor: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = currentLevel === card.level;

        return (
          <button
            key={card.level}
            onClick={() => onSelectLevel(card.level)}
            className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 ${
              card.bgColor
            } ${isActive ? card.activeColor : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.label}</span>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-white">
              {stats ? card.count.toLocaleString() : '-'}
            </div>
          </button>
        );
      })}
    </div>
  );
};
