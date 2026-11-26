'use client';

import React, { useState, useEffect } from 'react';
import { DeviceDocument } from '@/types/device';
import { X, Coins, Plus, Minus, Check, AlertCircle, Sparkles, Search, Loader2, Smartphone } from 'lucide-react';

interface DevicePointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  device: DeviceDocument | null;
  apiKey: string;
}

export const DevicePointsModal: React.FC<DevicePointsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  device,
  apiKey,
}) => {
  const [targetDeviceId, setTargetDeviceId] = useState<string>('');
  const [activeDevice, setActiveDevice] = useState<DeviceDocument | null>(device);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const [mode, setMode] = useState<'add' | 'sub' | 'set'>('add');
  const [amount, setAmount] = useState<string>('50');
  const [reason, setReason] = useState<string>('管理员手动调整');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (device) {
        setTargetDeviceId(device.deviceId);
        setActiveDevice(device);
      } else {
        setTargetDeviceId('');
        setActiveDevice(null);
      }
      setMode('add');
      setAmount('50');
      setReason('管理员手动调整');
      setErrorMsg(null);
      setQueryError(null);
    }
  }, [isOpen, device]);

  if (!isOpen) return null;

  const currentPoints = activeDevice?.points ?? 0;
  const numAmount = parseInt(amount, 10) || 0;

  let calculatedPoints = currentPoints;
  let changeDelta = 0;
  if (mode === 'add') {
    changeDelta = Math.max(0, numAmount);
    calculatedPoints = currentPoints + changeDelta;
  } else if (mode === 'sub') {
    changeDelta = -Math.min(currentPoints, Math.max(0, numAmount));
    calculatedPoints = Math.max(0, currentPoints - Math.max(0, numAmount));
  } else {
    calculatedPoints = Math.max(0, numAmount);
    changeDelta = calculatedPoints - currentPoints;
  }

  const handleQuickAdd = (val: number) => {
    setAmount(String(val));
  };

  // 根据 deviceId 在线查询设备信息与当前积分
  const handleQueryDevice = async (idToQuery = targetDeviceId) => {
    const cleanId = idToQuery.trim();
    if (!cleanId) {
      setQueryError('请输入设备 ID 进行查询');
      return;
    }

    setIsQuerying(true);
    setQueryError(null);
    try {
      const res = await fetch(`/api/devices/client?deviceId=${encodeURIComponent(cleanId)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.data) {
        setActiveDevice(null);
        setQueryError(data.error || '未找到该设备ID对应的档案，请检查输入或先上报设备');
        return;
      }

      setActiveDevice(data.data);
    } catch (err: any) {
      setQueryError(err.message || '查询设备网络请求异常');
      setActiveDevice(null);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanDeviceId = (activeDevice?.deviceId || targetDeviceId).trim();
    if (!cleanDeviceId) {
      setErrorMsg('设备ID不能为空');
      return;
    }

    if (numAmount < 0) {
      setErrorMsg('积分变动数值不能为负数');
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        deviceId: cleanDeviceId,
      };

      if (activeDevice?._id) {
        payload._id = activeDevice._id;
      }

      if (mode === 'add') {
        payload.pointsDelta = numAmount;
      } else if (mode === 'sub') {
        payload.pointsDelta = -numAmount;
      } else {
        payload.points = calculatedPoints;
      }

      if (reason.trim()) {
        payload.reason = reason.trim();
        payload.remark = activeDevice?.remark
          ? `${activeDevice.remark} [积分变更: ${reason.trim()}]`
          : `积分变更: ${reason.trim()}`;
      }

      const res = await fetch('/api/devices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '积分更新失败');
      }

      const changeSign = changeDelta >= 0 ? `+${changeDelta}` : `${changeDelta}`;
      const successTip = `设备 [${cleanDeviceId}] 积分修改成功：变动值 ${changeSign}，原积分 ${currentPoints}，现积分 ${calculatedPoints}（已记录日志）`;

      onSuccess(successTip);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '网络请求错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">调整设备积分</h3>
              <p className="text-xs text-slate-400">
                支持按设备 ID (deviceId) 调整积分，变动记录自动归档至系统日志
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Device ID Input / Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              目标设备 ID (deviceId)
            </label>
            {device ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs font-mono text-slate-200">
                <div className="flex items-center space-x-2 truncate">
                  <Smartphone className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{device.deviceId}</span>
                </div>
                {device.deviceInfo && (
                  <span className="text-[11px] text-slate-400 truncate ml-2 font-sans">
                    {device.deviceInfo}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={targetDeviceId}
                      onChange={(e) => {
                        setTargetDeviceId(e.target.value);
                        setQueryError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQueryDevice();
                        }
                      }}
                      placeholder="输入或粘贴设备唯一标识 (如 9a8b7c6d5e4f3210)"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQueryDevice()}
                    disabled={isQuerying || !targetDeviceId.trim()}
                    className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                  >
                    {isQuerying ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    <span>查询</span>
                  </button>
                </div>

                {queryError && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{queryError}</span>
                  </div>
                )}

                {activeDevice && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-[11px] text-emerald-300 flex items-center justify-between">
                    <span className="truncate">
                      已识别：{activeDevice.deviceInfo || activeDevice.deviceId}
                    </span>
                    <span className="font-mono font-bold ml-2">
                      当前: {activeDevice.points || 0} 分
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current & Forecast Points Preview */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <div>
              <span className="text-[10px] text-slate-400 block">修改前值</span>
              <div className="text-base font-bold text-slate-200 mt-0.5">
                {currentPoints.toLocaleString()}
              </div>
            </div>
            <div className="border-l border-slate-800 pl-2">
              <span className="text-[10px] text-slate-400 block">修改变动值</span>
              <div
                className={`text-base font-bold mt-0.5 ${
                  changeDelta > 0
                    ? 'text-emerald-400'
                    : changeDelta < 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {changeDelta > 0 ? `+${changeDelta}` : changeDelta}
              </div>
            </div>
            <div className="border-l border-slate-800 pl-2">
              <span className="text-[10px] text-slate-400 block">修改后值</span>
              <div className="text-base font-bold text-amber-400 mt-0.5">
                {calculatedPoints.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">变动方式</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`flex items-center justify-center space-x-1 rounded-lg py-2 text-xs font-medium border transition ${
                  mode === 'add'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>充值 / 奖励</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('sub')}
                className={`flex items-center justify-center space-x-1 rounded-lg py-2 text-xs font-medium border transition ${
                  mode === 'sub'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 font-semibold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Minus className="h-3.5 w-3.5" />
                <span>扣减 / 消费</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('set')}
                className={`flex items-center justify-center space-x-1 rounded-lg py-2 text-xs font-medium border transition ${
                  mode === 'set'
                    ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300 font-semibold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>直接修改</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {mode === 'set' ? '直接设定积分为' : '积分变动数量'}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />

            {/* Quick buttons */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {[10, 50, 100, 200, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="rounded-md border border-slate-800 bg-slate-950/90 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-700 hover:text-white transition"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">调整事由 (记录至系统日志)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：签到奖励、活动发放、客服补偿、异常消费扣除等"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-amber-600/30 hover:bg-amber-500 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>更新中...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>确认修改</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
