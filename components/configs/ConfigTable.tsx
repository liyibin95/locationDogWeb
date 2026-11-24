'use client';

import React, { useState } from 'react';
import { ConfigDocument } from '@/types/config';
import {
  Copy,
  Check,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Plus,
  Eye,
  X,
} from 'lucide-react';

interface ConfigTableProps {
  configs: ConfigDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  isLoading: boolean;
  onOpenCreate: () => void;
  onEditConfig: (config: ConfigDocument) => void;
  onDeleteConfig: (id: string) => Promise<boolean>;
  onToggleStatus: (config: ConfigDocument) => Promise<boolean>;
}

export const ConfigTable: React.FC<ConfigTableProps> = ({
  configs,
  pagination,
  onPageChange,
  isLoading,
  onOpenCreate,
  onEditConfig,
  onDeleteConfig,
  onToggleStatus,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewConfig, setPreviewConfig] = useState<ConfigDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除此配置项吗？删除后客户端将无法再读取该配置。')) {
      return;
    }
    setDeletingId(id);
    try {
      await onDeleteConfig(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'boolean':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'number':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'json':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/40';
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400">
            <tr>
              <th className="px-4 py-3">配置键名 (Key) 与说明</th>
              <th className="px-4 py-3">类型 / 配置值 (Value)</th>
              <th className="px-4 py-3">分组 / 适用范围 (App & 环境)</th>
              <th className="px-4 py-3 text-center">状态</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                    <span>加载配置中...</span>
                  </div>
                </td>
              </tr>
            ) : configs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-3">
                    <div className="rounded-full bg-slate-800/80 p-3 text-slate-400">
                      <Sliders className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium text-slate-300">暂无配置项</div>
                    <p className="text-xs text-slate-500">
                      尚未创建任何远程配置项。配置中心可供 Android App 动态拉取开关、网关域名、版本策略等。
                    </p>
                    <button
                      onClick={onOpenCreate}
                      className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>创建首个配置</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              configs.map((config) => {
                const id = config._id || config.key;
                const isCopied = copiedKey === id;
                const isDeleting = deletingId === id;

                return (
                  <tr
                    key={id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Key & Description */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-medium text-white">{config.key}</span>
                        <button
                          onClick={() => handleCopy(config.key, id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-indigo-400 transition"
                          title="复制键名"
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      {config.description ? (
                        <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
                          {config.description}
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-600 italic">无描述</span>
                      )}
                    </td>

                    {/* Type & Value */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium border ${getTypeBadge(
                            config.type
                          )}`}
                        >
                          {config.type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span
                          className="font-mono text-xs text-slate-200 truncate block max-w-[200px]"
                          title={config.value}
                        >
                          {config.type === 'boolean' ? (
                            config.value === 'true' ? (
                              <span className="text-emerald-400 font-bold">true</span>
                            ) : (
                              <span className="text-rose-400 font-bold">false</span>
                            )
                          ) : (
                            config.value
                          )}
                        </span>
                        {config.type === 'json' && (
                          <button
                            onClick={() => setPreviewConfig(config)}
                            className="text-slate-400 hover:text-indigo-400 transition"
                            title="查看完整 JSON"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Group & Targeting */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700">
                          {config.group || 'default'}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                            config.appId === 'all'
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                          }`}
                        >
                          App: {config.appId}
                        </span>
                        {config.environment !== 'all' && (
                          <span className="rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 text-[10px]">
                            {config.environment}
                          </span>
                        )}
                        {config.channel && config.channel !== 'all' && (
                          <span className="rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 text-[10px]">
                            渠道:{config.channel}
                          </span>
                        )}
                        {(config.minVersionCode || config.maxVersionCode) && (
                          <span className="rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 text-[10px]">
                            v:{config.minVersionCode || 0}~{config.maxVersionCode || '∞'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Toggle */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => onToggleStatus(config)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium transition cursor-pointer border ${
                          config.isEnabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                        }`}
                        title={config.isEnabled ? '点击停用' : '点击启用'}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                            config.isEnabled ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                        ></span>
                        {config.isEnabled ? '已启用' : '已停用'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onEditConfig(config)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                          title="编辑配置"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(config._id!)}
                          disabled={isDeleting}
                          className="rounded p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition disabled:opacity-50"
                          title="删除配置"
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
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
          <div>
            共 <span className="font-semibold text-white">{pagination.total}</span> 条配置，第{' '}
            <span className="font-semibold text-white">{pagination.page}</span> /{' '}
            <span>{pagination.totalPages}</span> 页
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>上一页</span>
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <span>下一页</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* JSON Preview Modal */}
      {previewConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{previewConfig.key}</h3>
                <p className="text-xs text-slate-400">{previewConfig.description || 'JSON 配置详情'}</p>
              </div>
              <button
                onClick={() => setPreviewConfig(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-indigo-300 border border-slate-800">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(previewConfig.value), null, 2);
                } catch {
                  return previewConfig.value;
                }
              })()}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setPreviewConfig(null)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
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
