'use client';

import React from 'react';
import { DeviceStats } from '@/types/device';
import { Smartphone, MessageSquare, Coins, CheckCircle2, UserPlus } from 'lucide-react';

interface DeviceStatsOverviewProps {
  stats: DeviceStats | null;
  onFilterStatus?: (status: 'all' | 'normal' | 'disabled') => void;
  onFilterWechat?: (wechatStatus: 'all' | 'bound' | 'unbound') => void;
  currentStatus?: string;
  currentWechatStatus?: string;
}

export const DeviceStatsOverview: React.FC<DeviceStatsOverviewProps> = ({
  stats,
  onFilterStatus,
  onFilterWechat,
  currentStatus = 'all',
  currentWechatStatus = 'all',
}) => {
  const total = stats?.total ?? 0;
  const boundWechat = stats?.boundWechatCount ?? 0;
  const totalPoints = stats?.totalPoints ?? 0;
  const normal = stats?.normalCount ?? 0;
  const todayNew = stats?.todayNewCount ?? 0;

  const cards = [
    {
      id: 'total',
      title: '总设备数',
      count: total,
      unit: '台',
      icon: Smartphone,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      activeBorder: 'ring-2 ring-indigo-500',
      onClick: () => {
        onFilterStatus?.('all');
        onFilterWechat?.('all');
      },
      isActive: currentStatus === 'all' && currentWechatStatus === 'all',
    },
    {
      id: 'bound',
      title: '已绑定微信',
      count: boundWechat,
      unit: '台',
      icon: MessageSquare,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      activeBorder: 'ring-2 ring-emerald-500',
      onClick: () => {
        onFilterWechat?.(currentWechatStatus === 'bound' ? 'all' : 'bound');
      },
      isActive: currentWechatStatus === 'bound',
    },
    {
      id: 'points',
      title: '设备总积分',
      count: totalPoints.toLocaleString(),
      unit: '分',
      icon: Coins,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      clickable: false,
    },
    {
      id: 'normal',
      title: '状态正常',
      count: normal,
      unit: '台',
      icon: CheckCircle2,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      activeBorder: 'ring-2 ring-cyan-500',
      onClick: () => {
        onFilterStatus?.(currentStatus === 'normal' ? 'all' : 'normal');
      },
      isActive: currentStatus === 'normal',
    },
    {
      id: 'today',
      title: '今日新增注册',
      count: todayNew,
      unit: '台',
      icon: UserPlus,
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
