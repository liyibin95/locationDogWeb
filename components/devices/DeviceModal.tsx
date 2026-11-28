'use client';

import React, { useState, useEffect } from 'react';
import { DeviceDocument, DeviceStatus } from '@/types/device';
import {
  X,
  Check,
  AlertCircle,
  Smartphone,
  Sparkles,
  MessageSquare,
  Coins,
  Info,
} from 'lucide-react';

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

  // 新增模式：按设备 ID 新增 或 按微信 ID 新增
  const [createMode, setCreateMode] = useState<'byDeviceId' | 'byWechatId'>('byDeviceId');

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
      setBrand('');
      setModel('');
      setOsVersion('');
      setWechatId('');
      setPoints(0);
      setStatus('normal');
      setRemark('');
      setCreatedAt(new Date().toISOString().slice(0, 16));
      setCreateMode('byDeviceId');
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
    } else if (deviceId.trim()) {
      setDeviceInfo(`Android 设备 (${deviceId.trim().slice(-6)})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 校验规则：
    // 1. 若按微信 ID 新增：wechatId 必填，其它字段均选填！
    // 2. 若按设备 ID 新增：deviceId 必填，deviceInfo 为空时会自动生成默认值。
    if (!isEdit && createMode === 'byWechatId') {
      if (!wechatId.trim()) {
        setErrorMsg('请填写微信 ID (wechatId)');
        return;
      }
    } else {
      if (!deviceId.trim() && !wechatId.trim()) {
        setErrorMsg('请填写设备 ID (deviceId) 或微信 ID (wechatId)');
        return;
      }
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
        points: Math.floor(numPoints),
        status,
      };

      if (deviceId.trim()) payload.deviceId = deviceId.trim();
      if (wechatId.trim()) payload.wechatId = wechatId.trim();
      if (deviceInfo.trim()) payload.deviceInfo = deviceInfo.trim();
      if (brand.trim()) payload.brand = brand.trim();
      if (model.trim()) payload.model = model.trim();
      if (osVersion.trim()) payload.osVersion = osVersion.trim();
      if (remark.trim()) payload.remark = remark.trim();

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
                {isEdit ? '编辑设备档案' : '新增设备 / 微信用户档案'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEdit
                  ? '修改设备信息、微信绑定与积分设置'
                  : '支持按设备 ID 新增或按微信 ID 新增，灵活建立用户与设备档案'}
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

          {/* Mode Selector for Creating */}
          {!isEdit && (
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setCreateMode('byDeviceId')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-xs font-semibold transition ${
                  createMode === 'byDeviceId'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>按设备 ID 新增</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('byWechatId')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-xs font-semibold transition ${
                  createMode === 'byWechatId'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>按微信 ID 新增 (其它字段选填)</span>
              </button>
            </div>
          )}

          {/* Hint for Wechat ID mode */}
          {!isEdit && createMode === 'byWechatId' && (
            <div className="flex items-start space-x-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">按微信 ID 新增模式说明：</span>
                <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                  只需输入微信 ID 即可快速入库，设备 ID 及硬件字段可完全不传。后续当该微信用户使用设备时，可通过修改绑定关系接口或客户端上报自动绑定设备。
                </p>
              </div>
            </div>
          )}

          {/* If byWechatId mode, show Wechat ID field at the top */}
          {(!isEdit && createMode === 'byWechatId') && (
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                <span className="flex items-center space-x-1">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  <span>微信 ID (wechatId) <span className="text-rose-400">*</span></span>
                </span>
              </label>
              <input
                type="text"
                value={wechatId}
                onChange={(e) => setWechatId(e.target.value)}
                placeholder="例如 wx_openid_123456 或微信号"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
          )}

          {/* 1. Device ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                设备 ID (deviceId){' '}
                {(!isEdit && createMode === 'byWechatId') ? (
                  <span className="text-slate-500 font-normal">(选填)</span>
                ) : (
                  <span className="text-rose-400">*</span>
                )}
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
              placeholder={
                !isEdit && createMode === 'byWechatId'
                  ? '选填，稍后可绑定或留空'
                  : '例如 3a7f9b8c01d4e5f2 或 ANDROID_ID / OAID'
              }
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required={isEdit || createMode === 'byDeviceId'}
            />
          </div>

          {/* 2. Brand, Model & OS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                品牌 <span className="text-slate-500 font-normal">(选填)</span>
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Xiaomi / Huawei / vivo..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                型号 <span className="text-slate-500 font-normal">(选填)</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="例如 23013RK75C"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                系统版本 <span className="text-slate-500 font-normal">(选填)</span>
              </label>
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
                设备信息 (deviceInfo){' '}
                <span className="text-slate-500 font-normal">(选填，留空自动生成)</span>
              </label>
              <button
                type="button"
                onClick={handleAutoFillDeviceInfo}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
              >
                自动填充描述
              </button>
            </div>
            <input
              type="text"
              value={deviceInfo}
              onChange={(e) => setDeviceInfo(e.target.value)}
              placeholder="例如 Xiaomi Redmi K60 (Android 14) 或留空使用默认描述"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* 4. Wechat ID & Points (shown for byDeviceId mode or edit mode) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(isEdit || createMode === 'byDeviceId') && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center space-x-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                    <span>绑定的微信 ID <span className="text-slate-500 font-normal">(选填)</span></span>
                  </span>
                </label>
                <input
                  type="text"
                  value={wechatId}
                  onChange={(e) => setWechatId(e.target.value)}
                  placeholder="微信 OpenID / 微信号"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
            <div className={!isEdit && createMode === 'byWechatId' ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                <span className="flex items-center space-x-1">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span>初始积分数量 (points)</span>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">状态</label>
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
              placeholder="可选备注说明，如：微信推广渠道、测试机、展厅样机等"
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
                  <span>
                    {isEdit
                      ? '保存修改'
                      : createMode === 'byWechatId'
                      ? '确认新增微信档案'
                      : '立即创建设备'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
