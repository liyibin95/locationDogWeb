'use client';

import React from 'react';
import { ConfigStats } from '@/types/config';
import { Sliders, CheckCircle2, XCircle, Layers, Smartphone } from 'lucide-react';

interface ConfigStatsOverviewProps {
  stats: ConfigStats | null;
  onFilterEnabled?: (status: 'all' | 'true' | 'false') => void;
  currentStatus?: string;
}

export const ConfigStatsOverview: React.FC<ConfigStatsOverviewProps> = ({
  stats,
  onFilterEnabled,
  currentStatus = 'all',
}) => {
  const total = stats?.total ?? 0;
  const enabled = stats?.enabled ?? 0;
  const disabled = stats?.disabled ?? 0;
  const groupsCount = stats?.groups?.length ?? 0;
  const appsCount = stats?.appIds?.length ?? 0;

  const cards = [
    {
      id: 'all',
      title: '配置项总数',
      count: total,
      icon: Sliders,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      activeBorder: 'ring-2 ring-indigo-500',
    },
    {
      id: 'true',
      title: '已生效启用',
      count: enabled,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      activeBorder: 'ring-2 ring-emerald-500',
    },
    {
      id: 'false',
      title: '已停用禁用',
      count: disabled,
      icon: XCircle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      activeBorder: 'ring-2 ring-amber-500',
    },
    {
      id: 'groups',
      title: '配置分组数',
      count: groupsCount,
      icon: Layers,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      clickable: false,
    },
    {
      id: 'apps',
      title: '关联 App 目标',
      count: appsCount,
      icon: Smartphone,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/20',
      clickable: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isClickable = card.clickable !== false && onFilterEnabled;
        const isSelected = currentStatus === card.id;

        return (
          <div
            key={card.id}
            onClick={() => {
              if (isClickable && onFilterEnabled) {
                onFilterEnabled(card.id as any);
              }
            }}
            className={`flex flex-col justify-between rounded-xl border p-4 transition ${
              card.borderColor
            } ${card.bgColor} ${
              isClickable ? 'cursor-pointer hover:scale-[1.02]' : ''
            } ${isSelected ? card.activeBorder : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <div className={`rounded-lg p-1.5 ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold tracking-tight text-white">{card.count}</span>
              <span className="text-xs text-slate-500">项</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
