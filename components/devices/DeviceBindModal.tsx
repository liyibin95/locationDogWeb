'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Link2,
  Unlink,
  Check,
  AlertCircle,
  Smartphone,
  MessageSquare,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import { DeviceDocument } from '@/types/device';

interface DeviceBindModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  apiKey: string;
  initialDevice?: DeviceDocument | null;
  defaultMode?: 'byDeviceId' | 'byWechatId';
}

export const DeviceBindModal: React.FC<DeviceBindModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  apiKey,
  initialDevice,
  defaultMode = 'byDeviceId',
}) => {
  const [bindMode, setBindMode] = useState<'byDeviceId' | 'byWechatId'>('byDeviceId');
  const [deviceId, setDeviceId] = useState('');
  const [wechatId, setWechatId] = useState('');
  const [action, setAction] = useState<'bind' | 'unbind'>('bind');
  const [mergePoints, setMergePoints] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialDevice) {
      setDeviceId(initialDevice.deviceId || '');
      setWechatId(initialDevice.wechatId || '');
      // 如果只有微信ID没有设备ID，默认打开按微信ID绑定设备模式
      if (!initialDevice.deviceId && initialDevice.wechatId) {
        setBindMode('byWechatId');
      } else {
        setBindMode(defaultMode);
      }
    } else {
      setDeviceId('');
      setWechatId('');
      setBindMode(defaultMode);
    }
    setAction('bind');
    setErrorMsg(null);
  }, [initialDevice, defaultMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanDeviceId = deviceId.trim();
    const cleanWechatId = wechatId.trim();

    if (bindMode === 'byDeviceId') {
      if (!cleanDeviceId) {
        setErrorMsg('请填写设备 ID (deviceId)');
        return;
      }
      if (action === 'bind' && !cleanWechatId) {
        setErrorMsg('请填写要绑定的微信 ID (wechatId)');
        return;
      }
    } else {
      if (!cleanWechatId) {
        setErrorMsg('请填写微信 ID (wechatId)');
        return;
      }
      if (action === 'bind' && !cleanDeviceId) {
        setErrorMsg('请填写要绑定的设备 ID (deviceId)');
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        mode: bindMode,
        deviceId: cleanDeviceId,
        wechatId: cleanWechatId,
        action,
        mergePoints,
        force: true,
      };

      const res = await fetch('/api/devices/bind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '修改绑定关系失败');
      }

      onSuccess(data.message || '绑定关系修改成功');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '网络请求错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">修改设备与微信绑定关系</h3>
              <p className="text-xs text-slate-400">
                支持按设备 ID 绑定微信 ID，或按微信 ID 绑定设备 ID
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Switch Tabs */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setBindMode('byDeviceId');
                setErrorMsg(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-md text-xs font-semibold transition ${
                bindMode === 'byDeviceId'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>按设备 ID 绑定微信</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBindMode('byWechatId');
                setErrorMsg(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-md text-xs font-semibold transition ${
                bindMode === 'byWechatId'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>按微信 ID 绑定设备</span>
            </button>
          </div>

          {/* Action (Bind / Unbind) selection */}
          <div className="flex items-center justify-between rounded-xl bg-slate-950/70 border border-slate-800 p-2 px-3">
            <span className="text-xs font-medium text-slate-300">操作类型</span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setAction('bind')}
                className={`flex items-center space-x-1 rounded-md px-3 py-1 text-xs font-medium transition ${
                  action === 'bind'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Link2 className="h-3 w-3" />
                <span>关联绑定</span>
              </button>
              <button
                type="button"
                onClick={() => setAction('unbind')}
                className={`flex items-center space-x-1 rounded-md px-3 py-1 text-xs font-medium transition ${
                  action === 'unbind'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Unlink className="h-3 w-3" />
                <span>解除绑定</span>
              </button>
            </div>
          </div>

          {/* Form Inputs */}
          {bindMode === 'byDeviceId' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center space-x-1">
                    <Smartphone className="h-3.5 w-3.5 text-indigo-400" />
                    <span>源设备 ID (deviceId) <span className="text-rose-400">*</span></span>
                  </span>
                </label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="例如 3a7f9b8c01d4e5f2"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center space-x-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                    <span>
                      {action === 'bind' ? '目标微信 ID (wechatId)' : '绑定的微信 ID (选填)'}{' '}
                      {action === 'bind' && <span className="text-rose-400">*</span>}
                    </span>
                  </span>
                </label>
                <input
                  type="text"
                  value={wechatId}
                  onChange={(e) => setWechatId(e.target.value)}
                  placeholder={
                    action === 'bind' ? '输入要绑定的微信号或 OpenID' : '留空或填写原微信 ID'
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required={action === 'bind'}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center space-x-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                    <span>源微信 ID (wechatId) <span className="text-rose-400">*</span></span>
                  </span>
                </label>
                <input
                  type="text"
                  value={wechatId}
                  onChange={(e) => setWechatId(e.target.value)}
                  placeholder="例如 wx_openid_123456"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center space-x-1">
                    <Smartphone className="h-3.5 w-3.5 text-indigo-400" />
                    <span>
                      {action === 'bind' ? '目标设备 ID (deviceId)' : '绑定的设备 ID (选填)'}{' '}
                      {action === 'bind' && <span className="text-rose-400">*</span>}
                    </span>
                  </span>
                </label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder={
                    action === 'bind' ? '输入要绑定的目标设备唯一标识' : '留空或填写原设备 ID'
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required={action === 'bind'}
                />
              </div>
            </div>
          )}

          {/* Merge points toggle */}
          {action === 'bind' && (
            <div className="flex items-center justify-between rounded-xl bg-slate-950/70 border border-slate-800 p-3">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-300">
                  <span className="font-semibold block text-slate-200">自动合并两端积分</span>
                  <span className="text-slate-400">
                    若设备和微信此前为两条独立记录，绑定时将合并并累计两者的积分总和。
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={mergePoints}
                  onChange={(e) => setMergePoints(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center space-x-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 ${
                action === 'unbind'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>处理中...</span>
                </>
              ) : (
                <>
                  {action === 'unbind' ? (
                    <Unlink className="h-3.5 w-3.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>{action === 'unbind' ? '确认解除绑定' : '确认更新绑定'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
