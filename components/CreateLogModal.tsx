'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Key, Send, X } from 'lucide-react';
import { LogLevel } from '@/types/log';

interface CreateLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultApiKey: string;
}

export const CreateLogModal: React.FC<CreateLogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultApiKey,
}) => {
  const [level, setLevel] = useState<LogLevel>('info');
  const [service, setService] = useState('user-service');
  const [message, setMessage] = useState('');
  const [tagsInput, setTagsInput] = useState('production, api');
  const [detailsJson, setDetailsJson] = useState('{\n  "userId": 10086,\n  "action": "login",\n  "durationMs": 42\n}');
  const [apiKey, setApiKey] = useState(defaultApiKey);

  const [isLoading, setIsLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<{
    status: number;
    success: boolean;
    data: any;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResponseResult(null);

    let parsedDetails: any = undefined;
    if (detailsJson.trim()) {
      try {
        parsedDetails = JSON.parse(detailsJson);
      } catch (err: any) {
        setResponseResult({
          status: 400,
          success: false,
          data: { error: `Details JSON 格式错误: ${err.message}` },
        });
        setIsLoading(false);
        return;
      }
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          level,
          service,
          message,
          tags,
          details: parsedDetails,
        }),
      });

      const data = await res.json();
      setResponseResult({
        status: res.status,
        success: res.ok,
        data,
      });

      if (res.ok) {
        onSuccess();
      }
    } catch (err: any) {
      setResponseResult({
        status: 500,
        success: false,
        data: { error: err.message || '请求发送失败' },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">新增日志记录</h3>
            <p className="text-xs text-slate-400">调用 POST /api/logs 接口，需通过 API Key 鉴权校验</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* API Key Input */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400">
              <Key className="h-3.5 w-3.5" />
              <span>接口鉴权 API Key (测试 401 请故意填错或留空)</span>
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="请输入与服务端配置一致的 LOG_API_KEY..."
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Level */}
            <div>
              <label className="block text-xs font-medium text-slate-300">日志级别 (Level)</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LogLevel)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="info">INFO - 正常</option>
                <option value="warn">WARN - 警告</option>
                <option value="error">ERROR - 错误</option>
                <option value="debug">DEBUG - 调试</option>
              </select>
            </div>

            {/* Service */}
            <div>
              <label className="block text-xs font-medium text-slate-300">所属服务 (Service)</label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="例如 auth-service, payment"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-slate-300">
              日志消息 (Message) <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="请输入具体的日志描述信息..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-300">标签 (逗号分隔)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Details JSON */}
          <div>
            <label className="block text-xs font-medium text-slate-300">
              附加详情 JSON (Details / Context)
            </label>
            <textarea
              rows={3}
              value={detailsJson}
              onChange={(e) => setDetailsJson(e.target.value)}
              placeholder="{}"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-[11px] font-mono text-emerald-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Response Inspector */}
          {responseResult && (
            <div
              className={`rounded-xl border p-3 text-xs ${
                responseResult.success
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-semibold">
                {responseResult.success ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                )}
                <span>
                  HTTP 状态码: {responseResult.status}{' '}
                  {responseResult.success ? '(写入成功)' : '(鉴权失败或参数错误)'}
                </span>
              </div>
              <pre className="mt-2 max-h-32 overflow-y-auto rounded bg-slate-950 p-2 font-mono text-[11px] text-slate-300">
                {JSON.stringify(responseResult.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs text-slate-400 hover:text-white transition"
            >
              关闭
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isLoading ? '提交中...' : '提交新增'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
