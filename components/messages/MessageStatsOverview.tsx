'use client';

import React from 'react';
import { MessageStats } from '@/types/message';
import { Bell, Send, FileEdit, AlertTriangle, MessageSquare } from 'lucide-react';

interface MessageStatsOverviewProps {
  stats: MessageStats | null;
  onFilterStatus?: (status: string) => void;
  currentStatus?: string;
}

export const MessageStatsOverview: React.FC<MessageStatsOverviewProps> = ({
  stats,
  onFilterStatus,
  currentStatus = 'all',
}) => {
  const total = stats?.total ?? 0;
  const published = stats?.published ?? 0;
  const draft = stats?.draft ?? 0;
  const popupCount = stats?.popupCount ?? 0;
  const alerts = stats?.alerts ?? 0;

  const cards = [
    {
      id: 'all',
      title: '消息与公告总数',
      count: total,
      icon: Bell,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      activeBorder: 'ring-2 ring-indigo-500',
    },
    {
      id: 'published',
      title: '已发布生效',
      count: published,
      icon: Send,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      activeBorder: 'ring-2 ring-emerald-500',
    },
    {
      id: 'draft',
      title: '草稿箱',
      count: draft,
      icon: FileEdit,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      activeBorder: 'ring-2 ring-amber-500',
    },
    {
      id: 'popup',
      title: 'App 启动弹窗',
      count: popupCount,
      icon: MessageSquare,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      clickable: false,
    },
    {
      id: 'alert',
      title: '紧急告警与通知',
      count: alerts,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      clickable: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isClickable = card.clickable !== false && onFilterStatus;
        const isSelected = currentStatus === card.id;

        return (
          <div
            key={card.id}
            onClick={() => {
              if (isClickable && onFilterStatus) {
                onFilterStatus(card.id);
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
              <span className="text-xs text-slate-500">条</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
