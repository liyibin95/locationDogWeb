'use client';

import React from 'react';
import { FeedbackStats } from '@/types/feedback';
import { MessageSquareText, Clock, Loader2, CheckCircle2, Calendar } from 'lucide-react';

interface FeedbackStatsOverviewProps {
  stats: FeedbackStats | null;
  onFilterStatus?: (status: string) => void;
  currentStatus?: string;
}

export const FeedbackStatsOverview: React.FC<FeedbackStatsOverviewProps> = ({
  stats,
  onFilterStatus,
  currentStatus = 'all',
}) => {
  const total = stats?.total ?? 0;
  const pending = stats?.pendingCount ?? 0;
  const processing = stats?.processingCount ?? 0;
  const resolved = stats?.resolvedCount ?? 0;
  const todayNew = stats?.todayCount ?? 0;

  const cards = [
    {
      id: 'total',
      title: '总反馈量',
      count: total,
      unit: '条',
      icon: MessageSquareText,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      activeBorder: 'ring-2 ring-indigo-500',
      onClick: () => onFilterStatus?.('all'),
      isActive: currentStatus === 'all',
    },
    {
      id: 'pending',
      title: '待处理',
      count: pending,
      unit: '条',
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      activeBorder: 'ring-2 ring-amber-500',
      onClick: () => onFilterStatus?.(currentStatus === 'pending' ? 'all' : 'pending'),
      isActive: currentStatus === 'pending',
    },
    {
      id: 'processing',
      title: '处理中',
      count: processing,
      unit: '条',
      icon: Loader2,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      activeBorder: 'ring-2 ring-sky-500',
      onClick: () => onFilterStatus?.(currentStatus === 'processing' ? 'all' : 'processing'),
      isActive: currentStatus === 'processing',
    },
    {
      id: 'resolved',
      title: '已解决',
      count: resolved,
      unit: '条',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      activeBorder: 'ring-2 ring-emerald-500',
      onClick: () => onFilterStatus?.(currentStatus === 'resolved' ? 'all' : 'resolved'),
      isActive: currentStatus === 'resolved',
    },
    {
      id: 'today',
      title: '今日新增',
      count: todayNew,
      unit: '条',
      icon: Calendar,
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
        const isClickable = card.clickable !== false && Boolean(card.onClick);

        return (
          <div
            key={card.id}
            onClick={() => {
              if (isClickable && card.onClick) {
                card.onClick();
              }
            }}
            className={`flex flex-col justify-between rounded-xl border p-4 transition ${
              card.borderColor
            } ${card.bgColor} ${
              isClickable ? 'cursor-pointer hover:scale-[1.02]' : ''
            } ${card.isActive ? card.activeBorder : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <div className={`rounded-lg p-1.5 ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold tracking-tight text-white">{card.count}</span>
              <span className="text-xs text-slate-500">{card.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
