'use client';

import React, { useState, useEffect } from 'react';
import { ConfigDocument, ConfigType, ConfigEnvironment } from '@/types/config';
import { X, Check, AlertCircle } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialConfig?: ConfigDocument | null;
  apiKey: string;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialConfig,
  apiKey,
}) => {
  const isEdit = Boolean(initialConfig?._id);

  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ConfigType>('string');
  const [value, setValue] = useState('');
  const [group, setGroup] = useState('default');
  const [appId, setAppId] = useState('all');
  const [environment, setEnvironment] = useState<ConfigEnvironment>('all');
  const [channel, setChannel] = useState('all');
  const [minVersionCode, setMinVersionCode] = useState<string>('');
  const [maxVersionCode, setMaxVersionCode] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState(true);

  const [jsonError, setJsonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setKey(initialConfig.key);
      setDescription(initialConfig.description || '');
      setType(initialConfig.type || 'string');
      setValue(initialConfig.value || '');
      setGroup(initialConfig.group || 'default');
      setAppId(initialConfig.appId || 'all');
      setEnvironment(initialConfig.environment || 'all');
      setChannel(initialConfig.channel || 'all');
      setMinVersionCode(
        initialConfig.minVersionCode !== undefined ? String(initialConfig.minVersionCode) : ''
      );
      setMaxVersionCode(
        initialConfig.maxVersionCode !== undefined ? String(initialConfig.maxVersionCode) : ''
      );
      setIsEnabled(initialConfig.isEnabled ?? true);
    } else {
      setKey('');
      setDescription('');
      setType('string');
      setValue('');
      setGroup('default');
      setAppId('all');
      setEnvironment('all');
      setChannel('all');
      setMinVersionCode('');
      setMaxVersionCode('');
      setIsEnabled(true);
    }
    setJsonError(null);
    setErrorMsg(null);
  }, [initialConfig, isOpen]);

  // Live JSON validation
  const handleValueChange = (newVal: string) => {
    setValue(newVal);
    if (type === 'json') {
      try {
        JSON.parse(newVal);
        setJsonError(null);
      } catch (err: any) {
        setJsonError(err.message || 'JSON 语法错误');
      }
    } else {
      setJsonError(null);
    }
  };

  const handleTypeChange = (newType: ConfigType) => {
    setType(newType);
    if (newType === 'boolean') {
      if (value !== 'true' && value !== 'false') {
        setValue('true');
      }
      setJsonError(null);
    } else if (newType === 'number') {
      if (isNaN(Number(value))) {
        setValue('0');
      }
      setJsonError(null);
    } else if (newType === 'json') {
      try {
        JSON.parse(value);
        setJsonError(null);
      } catch {
        setValue('{\n  "enabled": true\n}');
        setJsonError(null);
      }
    } else {
      setJsonError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!key.trim()) {
      setErrorMsg('配置键名 (key) 为必填项');
      return;
    }

    if (type === 'json') {
      try {
        JSON.parse(value);
      } catch {
        setErrorMsg('JSON 格式不合法，请检查语法');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        key: key.trim(),
        description: description.trim(),
        type,
        value,
        group: group.trim() || 'default',
        appId: appId.trim() || 'all',
        environment,
        channel: channel.trim() || 'all',
        minVersionCode: minVersionCode ? parseInt(minVersionCode, 10) : undefined,
        maxVersionCode: maxVersionCode ? parseInt(maxVersionCode, 10) : undefined,
        isEnabled,
      };

      if (isEdit && initialConfig?._id) {
        payload._id = initialConfig._id;
      }

      const res = await fetch('/api/configs', {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '保存配置失败');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '网络异常，提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              {isEdit ? '编辑远程配置项' : '新增远程配置项'}
            </h3>
            <p className="text-xs text-slate-400">
              面向 Android App 的动态参数配置，可按应用包名、环境、渠道和版本生效。
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center space-x-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Key & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">
                配置键名 (Key) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="例如: api_base_url 或 feature_dark_mode"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">功能说明 / 描述</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如: 控制新版首页信息流开关"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Type & Value */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                数据类型 (Type) 与 配置值 (Value) <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center space-x-1">
                {(['string', 'boolean', 'number', 'json'] as ConfigType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                      type === t
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Input by Type */}
            {type === 'boolean' ? (
              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="boolVal"
                    checked={value === 'true'}
                    onChange={() => setValue('true')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-emerald-400">true (开启)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="boolVal"
                    checked={value === 'false'}
                    onChange={() => setValue('false')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-rose-400">false (关闭)</span>
                </label>
              </div>
            ) : type === 'number' ? (
              <input
                type="number"
                value={value}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder="例如: 5000 或 3"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            ) : type === 'json' ? (
              <div>
                <textarea
                  value={value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  rows={4}
                  placeholder={`{\n  "retryCount": 3,\n  "timeoutMs": 5000\n}`}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs font-mono text-indigo-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                {jsonError && (
                  <p className="mt-1 text-[11px] text-rose-400 font-mono">
                    ⚠ JSON 语法错误: {jsonError}
                  </p>
                )}
              </div>
            ) : (
              <textarea
                value={value}
                onChange={(e) => handleValueChange(e.target.value)}
                rows={2}
                placeholder="输入字符串配置值..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            )}
          </div>

          {/* Group & Scope Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">配置分组 (Group)</label>
              <input
                type="text"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="例如: network 或 feature"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">App 包名 (appId)</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="all 或 com.example.app"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">运行环境</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as ConfigEnvironment)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">全环境 (all)</option>
                <option value="prod">生产环境 (prod)</option>
                <option value="beta">测试环境 (beta)</option>
                <option value="dev">开发环境 (dev)</option>
              </select>
            </div>
          </div>

          {/* Channel & Version Code Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">应用渠道 (Channel)</label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="all 或 googleplay, xiaomi"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">最低版本号 (minVersion)</label>
              <input
                type="number"
                value={minVersionCode}
                onChange={(e) => setMinVersionCode(e.target.value)}
                placeholder="留空为无限制"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">最高版本号 (maxVersion)</label>
              <input
                type="number"
                value={maxVersionCode}
                onChange={(e) => setMaxVersionCode(e.target.value)}
                placeholder="留空为无限制"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Is Enabled Switch */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div>
              <span className="text-xs font-medium text-slate-200">启用状态</span>
              <p className="text-[11px] text-slate-500">
                启用后 Android 客户端在请求配置时将立即返回该项生效值。
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{submitting ? '保存中...' : isEdit ? '更新配置' : '立即创建'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
