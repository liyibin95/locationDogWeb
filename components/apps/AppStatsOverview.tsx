'use client';

import React from 'react';
import { AppVersionStats } from '@/types/app-version';
import { Package, Download, AlertTriangle, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';

interface AppStatsOverviewProps {
  stats: AppVersionStats | null;
  onFilterStatus?: (status: string) => void;
  currentStatus?: string;
}

export const AppStatsOverview: React.FC<AppStatsOverviewProps> = ({
  stats,
  onFilterStatus,
  currentStatus = 'all',
}) => {
  const total = stats?.total ?? 0;
  const published = stats?.publishedCount ?? 0;
  const totalDownloads = stats?.totalDownloads ?? 0;
  const forceUpdate = stats?.forceUpdateCount ?? 0;
  const activeApps = stats?.activeAppsCount ?? 0;
  const latestName = stats?.latestVersionName;
  const latestCode = stats?.latestVersionCode;

  const cards = [
    {
      id: 'total',
      title: '总版本记录',
      count: total,
      unit: '个',
      icon: Package,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      activeBorder: 'ring-2 ring-indigo-500',
      onClick: () => onFilterStatus?.('all'),
      isActive: currentStatus === 'all',
      clickable: true,
    },
    {
      id: 'latest',
      title: '最新上线版本',
      count: latestName ? `v${latestName}` : '暂无',
      subtext: latestCode ? `(Code: ${latestCode})` : undefined,
      unit: '',
      icon: Sparkles,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      activeBorder: 'ring-2 ring-emerald-500',
      onClick: () => onFilterStatus?.('published'),
      isActive: currentStatus === 'published',
      clickable: true,
    },
    {
      id: 'downloads',
      title: '累计下载总量',
      count: totalDownloads.toLocaleString(),
      unit: '次',
      icon: Download,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      clickable: false,
    },
    {
      id: 'forceUpdate',
      title: '强制更新版本',
      count: forceUpdate,
      unit: '个',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      clickable: false,
    },
    {
      id: 'apps',
      title: '管理应用数量',
      count: activeApps,
      unit: '款',
      icon: Smartphone,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      clickable: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={card.clickable ? card.onClick : undefined}
            className={`relative overflow-hidden rounded-xl border ${card.borderColor} ${card.bgColor} p-4 transition-all duration-200 ${
              card.clickable ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''
            } ${card.isActive ? card.activeBorder : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <div className={`rounded-lg p-1.5 ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-1.5">
              <span className={`text-xl font-bold tracking-tight ${card.color}`}>
                {card.count}
              </span>
              {card.unit && <span className="text-xs text-slate-400">{card.unit}</span>}
              {card.subtext && <span className="text-xs text-slate-400 font-mono">{card.subtext}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
