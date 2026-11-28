'use client';

import React, { useState } from 'react';
import { DeviceDocument } from '@/types/device';
import {
  Smartphone,
  Copy,
  Check,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Coins,
  MessageSquare,
  Clock,
  Plus,
  Eye,
  X,
  Sparkles,
  Link2,
} from 'lucide-react';

interface DeviceTableProps {
  devices: DeviceDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  isLoading: boolean;
  onOpenCreate: () => void;
  onEditDevice: (device: DeviceDocument) => void;
  onOpenPointsModal: (device: DeviceDocument) => void;
  onOpenBindModal?: (device: DeviceDocument) => void;
  onDeleteDevice: (id: string) => Promise<boolean>;
  onToggleStatus: (device: DeviceDocument) => Promise<boolean>;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices,
  pagination,
  onPageChange,
  isLoading,
  onOpenCreate,
  onEditDevice,
  onOpenPointsModal,
  onOpenBindModal,
  onDeleteDevice,
  onToggleStatus,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [detailDevice, setDetailDevice] = useState<DeviceDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDelete = async (device: DeviceDocument) => {
    const id = device._id;
    if (!id) return;

    const identifier = device.deviceId || device.wechatId || id;
    if (
      !window.confirm(
        `确定要删除记录 [${identifier}] 吗？\n当前积分：${device.points}，删除后数据不可恢复。`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      await onDeleteDevice(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (device: DeviceDocument) => {
    const id = device._id;
    if (!id) return;
    setTogglingId(id);
    try {
      await onToggleStatus(device);
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (dateVal: string | Date | undefined) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return String(dateVal);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400">
            <tr>
              <th className="px-4 py-3">设备唯一标识 (deviceId)</th>
              <th className="px-4 py-3">设备硬件 / 来源信息</th>
              <th className="px-4 py-3">绑定的微信 ID (wechatId)</th>
              <th className="px-4 py-3">注册时间</th>
              <th className="px-4 py-3 text-right">积分数量</th>
              <th className="px-4 py-3 text-center">状态</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                    <span>加载设备数据中...</span>
                  </div>
                </td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-3">
                    <div className="rounded-full bg-slate-800/80 p-3 text-slate-400">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium text-slate-300">暂无设备或微信记录</div>
                    <p className="text-xs text-slate-500">
                      还没有添加任何 Android 设备或微信用户档案。你可以按设备 ID 或微信 ID 手动录入，或通过客户端上报。
                    </p>
                    <button
                      onClick={onOpenCreate}
                      className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>添加首条记录</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              devices.map((device) => {
                const idStr = device._id || device.deviceId || device.wechatId || 'dev';
                const isCopied = copiedKey === idStr;
                const isWechatCopied = copiedKey === `wx-${idStr}`;
                const isNormal = device.status === 'normal';
                const hasDevice = Boolean(device.deviceId && device.deviceId.trim());
                const hasWechat = Boolean(device.wechatId && device.wechatId.trim());

                return (
                  <tr
                    key={idStr}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* 1. 设备 ID */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border shrink-0 ${
                            hasDevice
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          {hasDevice ? (
                            <div className="flex items-center space-x-1.5">
                              <span
                                className="font-mono font-medium text-slate-200 truncate max-w-[170px]"
                                title={device.deviceId}
                              >
                                {device.deviceId}
                              </span>
                              <button
                                onClick={() => handleCopy(device.deviceId!, idStr)}
                                className="text-slate-500 hover:text-slate-300 transition"
                                title="复制设备ID"
                              >
                                {isCopied ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <span className="inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/20">
                                未绑定设备
                              </span>
                              {onOpenBindModal && (
                                <button
                                  onClick={() => onOpenBindModal(device)}
                                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                                  title="点击为此微信绑定设备"
                                >
                                  去绑定
                                </button>
                              )}
                            </div>
                          )}
                          {device._id && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              DB: {device._id.slice(-6)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. 设备信息 */}
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200 truncate" title={device.deviceInfo}>
                          {device.deviceInfo || (hasDevice ? 'Android 设备' : '微信用户档案')}
                        </span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          {device.brand && (
                            <span className="inline-block rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400">
                              {device.brand}
                            </span>
                          )}
                          {device.osVersion && (
                            <span className="inline-block rounded bg-indigo-500/10 px-1.5 py-0.2 text-[10px] text-indigo-300">
                              {device.osVersion}
                            </span>
                          )}
                          {device.remark && (
                            <span className="text-[10px] text-slate-500 truncate" title={device.remark}>
                              · {device.remark}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. 绑定的微信 ID */}
                    <td className="px-4 py-3.5">
                      {hasWechat ? (
                        <div className="flex items-center space-x-1.5">
                          <div className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                            <MessageSquare className="h-3 w-3" />
                            <span className="font-mono">{device.wechatId}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(device.wechatId!, `wx-${idStr}`)}
                            className="text-slate-500 hover:text-slate-300 transition"
                            title="复制微信ID"
                          >
                            {isWechatCopied ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-500 text-[11px] italic">未绑定微信</span>
                          {onOpenBindModal && (
                            <button
                              onClick={() => onOpenBindModal(device)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline"
                              title="点击为此设备绑定微信"
                            >
                              去绑定
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 4. 注册时间 */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span className="text-[11px]">{formatDate(device.createdAt)}</span>
                      </div>
                    </td>

                    {/* 5. 积分数量 */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end space-x-1.5">
                        <div className="inline-flex items-center space-x-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                          <Coins className="h-3.5 w-3.5 text-amber-400" />
                          <span>{(device.points || 0).toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => onOpenPointsModal(device)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-amber-300 transition"
                          title="调整该记录积分"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* 6. 状态 */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggle(device)}
                        disabled={togglingId === device._id}
                        className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition ${
                          isNormal
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                        title="点击快速切换正常/禁用状态"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isNormal ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <span>{isNormal ? '正常' : '已禁用'}</span>
                      </button>
                    </td>

                    {/* 7. 操作 */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        {onOpenBindModal && (
                          <button
                            onClick={() => onOpenBindModal(device)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition"
                            title="修改绑定关系"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setDetailDevice(device)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                          title="查看详情"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onEditDevice(device)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition"
                          title="编辑记录"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(device)}
                          disabled={deletingId === device._id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
                          title="删除记录"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="text-xs text-slate-400">
          共 <span className="font-semibold text-slate-200">{pagination.total}</span> 条记录，
          当前第 <span className="font-semibold text-slate-200">{pagination.page}</span> /{' '}
          {pagination.totalPages || 1} 页
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>上一页</span>
          </button>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
            className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <span>下一页</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {detailDevice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setDetailDevice(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">设备与微信用户详情</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailDevice(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800/60">
                <span className="text-slate-400">数据库 ID:</span>
                <span className="col-span-2 font-mono text-slate-200">{detailDevice._id}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800/60">
                <span className="text-slate-400">设备唯一标识 (deviceId):</span>
                <span className="col-span-2 font-mono font-medium text-indigo-300">
                  {detailDevice.deviceId || (
                    <span className="text-amber-400/80 italic font-normal">暂未绑定设备</span>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800/60">
                <span className="text-slate-400">绑定的微信 ID:</span>
                <span className="col-span-2 text-slate-200">
                  {detailDevice.wechatId ? (
                    <span className="font-mono text-emerald-400">{detailDevice.wechatId}</span>
                  ) : (
                    <span className="text-slate-500 italic">未绑定微信</span>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800/60">
                <span className="text-slate-400">设备信息 / 来源:</span>
                <span className="col-span-2 text-slate-200">{detailDevice.deviceInfo || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800/60">
                <span className="text-slate-400">品牌 / 型号 / 系统:</span>
                <span className="col-span-2 text-slate-300">
                  {[detailDevice.brand, detailDevice.model, detailDevice.osVersion]
                    .filter(Boolean)
                    .join(' · ') || '未细分'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800/60">
                <span className="text-slate-400">当前积分:</span>
                <span className="col-span-2 font-bold text-amber-400">
                  {(detailDevice.points || 0).toLocaleString()} 分
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800/60">
                <span className="text-slate-400">运行状态:</span>
                <span className="col-span-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      detailDevice.status === 'normal'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {detailDevice.status === 'normal' ? '正常' : '已禁用'}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800/60">
                <span className="text-slate-400">注册时间:</span>
                <span className="col-span-2 text-slate-300">{formatDate(detailDevice.createdAt)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800/60">
                <span className="text-slate-400">最后活跃时间:</span>
                <span className="col-span-2 text-slate-300">{formatDate(detailDevice.updatedAt)}</span>
              </div>
              {detailDevice.remark && (
                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-slate-400">备注说明:</span>
                  <span className="col-span-2 text-slate-300">{detailDevice.remark}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              {onOpenBindModal && (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailDevice;
                    setDetailDevice(null);
                    onOpenBindModal(target);
                  }}
                  className="rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-600/30 transition"
                >
                  修改绑定关系
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const target = detailDevice;
                  setDetailDevice(null);
                  onEditDevice(target);
                }}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                编辑此记录
              </button>
              <button
                type="button"
                onClick={() => setDetailDevice(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
