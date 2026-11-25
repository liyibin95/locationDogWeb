'use client';

import React, { useState, useEffect } from 'react';
import { DeviceDocument, DeviceStatus } from '@/types/device';
import { X, Check, AlertCircle, Smartphone, Sparkles, MessageSquare, Coins } from 'lucide-react';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDevice?: DeviceDocument | null;
  apiKey: string;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDevice,
  apiKey,
}) => {
  const isEdit = Boolean(initialDevice?._id);

  const [deviceId, setDeviceId] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [brand, setBrand] = useState('Xiaomi');
  const [model, setModel] = useState('');
  const [osVersion, setOsVersion] = useState('Android 14');
  const [wechatId, setWechatId] = useState('');
  const [points, setPoints] = useState<number | string>(0);
  const [status, setStatus] = useState<DeviceStatus>('normal');
  const [createdAt, setCreatedAt] = useState('');
  const [remark, setRemark] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialDevice) {
      setDeviceId(initialDevice.deviceId || '');
      setDeviceInfo(initialDevice.deviceInfo || '');
      setBrand(initialDevice.brand || '');
      setModel(initialDevice.model || '');
      setOsVersion(initialDevice.osVersion || 'Android 14');
      setWechatId(initialDevice.wechatId || '');
      setPoints(initialDevice.points ?? 0);
      setStatus(initialDevice.status || 'normal');
      setRemark(initialDevice.remark || '');
      if (initialDevice.createdAt) {
        try {
          const d = new Date(initialDevice.createdAt);
          setCreatedAt(d.toISOString().slice(0, 16));
        } catch {
          setCreatedAt('');
        }
      } else {
        setCreatedAt('');
      }
    } else {
      setDeviceId('');
      setDeviceInfo('');
      setBrand('Xiaomi');
      setModel('');
      setOsVersion('Android 14');
      setWechatId('');
      setPoints(0);
      setStatus('normal');
      setRemark('');
      setCreatedAt(new Date().toISOString().slice(0, 16));
    }
    setErrorMsg(null);
  }, [initialDevice, isOpen]);

  if (!isOpen) return null;

  // 生成一个模拟的 Android ID (16 位十六进制)
  const generateMockAndroidId = () => {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setDeviceId(result);
  };

  // 根据品牌、型号自动组装设备信息说明
  const handleAutoFillDeviceInfo = () => {
    const parts = [brand, model, osVersion ? `(${osVersion})` : ''].filter(Boolean);
    if (parts.length > 0) {
      setDeviceInfo(parts.join(' '));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!deviceId.trim()) {
      setErrorMsg('请填写设备 ID (deviceId)');
      return;
    }

    if (!deviceInfo.trim()) {
      setErrorMsg('请填写设备信息 (deviceInfo)');
      return;
    }

    const numPoints = Number(points);
    if (isNaN(numPoints) || numPoints < 0) {
      setErrorMsg('积分数量必须为大于或等于 0 的整数');
      return;
    }

    setSubmitting(true);

    try {
      const url = '/api/devices';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: any = {
        deviceId: deviceId.trim(),
        deviceInfo: deviceInfo.trim(),
        brand: brand.trim(),
        model: model.trim(),
        osVersion: osVersion.trim(),
        wechatId: wechatId.trim(),
        points: Math.floor(numPoints),
        status,
        remark: remark.trim(),
      };

      if (isEdit) {
        payload._id = initialDevice!._id;
        if (createdAt) payload.createdAt = new Date(createdAt).toISOString();
      } else {
        if (createdAt) payload.createdAt = new Date(createdAt).toISOString();
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '保存设备失败');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEdit ? '编辑 Android 设备' : '新增 Android 设备'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEdit
                  ? '修改设备信息、微信绑定与积分设置'
                  : '手动录入 Android 设备档案或分配初始积分'}
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

          {/* 1. Device ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                设备 ID (deviceId) <span className="text-rose-400">*</span>
              </label>
              {!isEdit && (
                <button
                  type="button"
                  onClick={generateMockAndroidId}
                  className="inline-flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>生成随机 Android ID</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="例如 3a7f9b8c01d4e5f2 或 ANDROID_ID / OAID"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* 2. Brand, Model & OS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">品牌</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Xiaomi / Huawei / vivo..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">型号</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="例如 23013RK75C"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">系统版本</label>
              <input
                type="text"
                value={osVersion}
                onChange={(e) => setOsVersion(e.target.value)}
                placeholder="Android 14 (API 34)"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 3. Device Info (Summary) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                设备信息 (deviceInfo) <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleAutoFillDeviceInfo}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
              >
                根据品牌型号自动填充
              </button>
            </div>
            <input
              type="text"
              value={deviceInfo}
              onChange={(e) => setDeviceInfo(e.target.value)}
              placeholder="例如 Xiaomi Redmi K60 (Android 14) 或 Snapdragon 8+ / 12GB+256GB"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* 4. Wechat ID & Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                <span className="flex items-center space-x-1">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  <span>绑定的微信 ID</span>
                </span>
              </label>
              <input
                type="text"
                value={wechatId}
                onChange={(e) => setWechatId(e.target.value)}
                placeholder="微信 OpenID / 微信号 (选填)"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                <span className="flex items-center space-x-1">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span>积分数量 (points)</span>
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 5. Status & Registration Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">设备状态</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DeviceStatus)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="normal">正常 (可正常上报与消费积分)</option>
                <option value="disabled">已禁用 (禁止登录与积分消费)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">注册时间</label>
              <input
                type="datetime-local"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 6. Remark */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">备注说明</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="可选的备注说明，如：测试机、展厅样机、内测用户等"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

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
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{isEdit ? '保存修改' : '立即创建'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
