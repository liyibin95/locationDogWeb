'use client';

import React, { useState, useEffect } from 'react';
import { DeviceDocument } from '@/types/device';
import { X, Coins, Plus, Minus, Check, AlertCircle, Sparkles } from 'lucide-react';

interface DevicePointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
  const [mode, setMode] = useState<'add' | 'sub' | 'set'>('add');
  const [amount, setAmount] = useState<string>('50');
  const [reason, setReason] = useState<string>('管理员手动调整');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode('add');
      setAmount('50');
      setReason('管理员手动调整');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !device) return null;

  const currentPoints = device.points || 0;
  const numAmount = parseInt(amount, 10) || 0;

  let calculatedPoints = currentPoints;
  if (mode === 'add') {
    calculatedPoints = currentPoints + Math.max(0, numAmount);
  } else if (mode === 'sub') {
    calculatedPoints = Math.max(0, currentPoints - Math.max(0, numAmount));
  } else {
    calculatedPoints = Math.max(0, numAmount);
  }

  const handleQuickAdd = (val: number) => {
    setAmount(String(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numAmount < 0) {
      setErrorMsg('积分变动数值不能为负数');
      return;
    }

    setSubmitting(true);

    try {
      let payload: any = { _id: device._id };

      if (mode === 'add') {
        payload.pointsDelta = numAmount;
      } else if (mode === 'sub') {
        payload.pointsDelta = -numAmount;
      } else {
        payload.points = calculatedPoints;
      }

      if (reason.trim()) {
        payload.remark = device.remark
          ? `${device.remark} [积分变更: ${reason.trim()}]`
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

      onSuccess();
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
              <p className="text-xs text-slate-400 font-mono truncate max-w-[240px]">
                {device.deviceId}
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

          {/* Current & Forecast Points Preview */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
            <div>
              <span className="text-[11px] text-slate-400">当前剩余积分</span>
              <div className="text-lg font-bold text-slate-200 mt-0.5">
                {currentPoints.toLocaleString()}
              </div>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-[11px] text-slate-400">调整后预计积分</span>
              <div className="text-lg font-bold text-amber-400 mt-0.5">
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">调整事由</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：微信活动发放、新手奖励、异常扣减等"
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
                  <span>确认调整</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
