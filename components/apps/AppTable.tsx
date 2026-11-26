'use client';

import React, { useState } from 'react';
import { AppVersionDocument } from '@/types/app-version';
import {
  Download,
  Copy,
  Check,
  Edit,
  Trash2,
  AlertTriangle,
  FileCode,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PackageCheck,
  Layers,
  Hash,
} from 'lucide-react';

interface AppTableProps {
  versions: AppVersionDocument[];
  isLoading: boolean;
  onEdit: (version: AppVersionDocument) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: AppVersionDocument['status']) => void;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (newPage: number) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const AppTable: React.FC<AppTableProps> = ({
  versions,
  isLoading,
  onEdit,
  onDelete,
  onStatusChange,
  pagination,
  onPageChange,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 py-20 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <span className="mt-3 text-xs">正在载入版本列表...</span>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 py-16 text-slate-400">
        <Layers className="h-10 w-10 text-slate-600 mb-3" />
        <p className="text-sm font-medium text-slate-300">暂无版本记录</p>
        <p className="mt-1 text-xs text-slate-500">点击上方“发布新版本”开始上传 APK 并配置版本参数</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">应用信息</th>
              <th className="py-3 px-4">版本名称 / Code</th>
              <th className="py-3 px-4">安装包文件</th>
              <th className="py-3 px-4">更新策略</th>
              <th className="py-3 px-4">更新日志</th>
              <th className="py-3 px-4">状态</th>
              <th className="py-3 px-4 text-center">下载量</th>
              <th className="py-3 px-4">发布时间</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {versions.map((version) => {
              const isCopiedUrl = copiedKey === `url_${version._id}`;
              const isCopiedMd5 = copiedKey === `md5_${version._id}`;

              return (
                <tr
                  key={version._id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  {/* 应用标识与名称 */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200">
                      {version.appName || 'NextLog App'}
                    </div>
                    <div className="mt-0.5 flex items-center space-x-1.5 font-mono text-[11px] text-indigo-400">
                      <span>{version.appId}</span>
                    </div>
                    {version.channel && version.channel !== 'default' && (
                      <span className="mt-1 inline-block rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-300 border border-indigo-500/20">
                        {version.channel}
                      </span>
                    )}
                  </td>

                  {/* 版本号 */}
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm font-bold text-white">v{version.versionName}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 border border-slate-700">
                        Code: {version.versionCode}
                      </span>
                    </div>
                  </td>

                  {/* 安装包信息 */}
                  <td className="py-3 px-4">
                    <div className="max-w-[200px] truncate font-mono text-[11px] text-slate-300" title={version.fileName || version.downloadUrl}>
                      {version.fileName || 'app-release.apk'}
                    </div>
                    <div className="mt-1 flex items-center space-x-2 text-[10px] text-slate-400">
                      <span>{formatBytes(version.fileSize)}</span>
                      {version.fileMd5 && (
                        <button
                          onClick={() => handleCopy(version.fileMd5!, `md5_${version._id}`)}
                          className="flex items-center space-x-0.5 font-mono text-slate-500 hover:text-slate-300 transition"
                          title={`MD5: ${version.fileMd5} (点击复制)`}
                        >
                          <Hash className="h-3 w-3" />
                          <span>{version.fileMd5.substring(0, 6)}...</span>
                          {isCopiedMd5 && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                        </button>
                      )}
                    </div>
                    <div className="mt-1 flex items-center space-x-2">
                      <button
                        onClick={() => handleCopy(version.downloadUrl, `url_${version._id}`)}
                        className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                        title="复制 APK 下载链接"
                      >
                        {isCopiedUrl ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">已复制</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>复制链接</span>
                          </>
                        )}
                      </button>

                      <a
                        href={version._id ? `/api/apps/download/${version._id}` : version.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-0.5 text-[11px] text-slate-400 hover:text-white transition"
                        title="下载此版本 APK"
                      >
                        <Download className="h-3 w-3" />
                        <span>下载</span>
                      </a>
                    </div>
                  </td>

                  {/* 更新策略 (强更/最低版本) */}
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {version.forceUpdate ? (
                        <span className="inline-flex items-center space-x-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400 border border-rose-500/20">
                          <AlertTriangle className="h-3 w-3" />
                          <span>全员强制更新</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-700">
                          <span>普通可选更新</span>
                        </span>
                      )}

                      {version.minVersionCode != null && version.minVersionCode > 0 && (
                        <div className="text-[10px] text-amber-400 font-mono">
                          {'< '}Code {version.minVersionCode} 强制更新
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 更新日志摘要 */}
                  <td className="py-3 px-4 max-w-xs">
                    <p className="line-clamp-2 text-slate-400 whitespace-pre-line text-[11px]">
                      {version.changelog || '无更新日志说明'}
                    </p>
                  </td>

                  {/* 状态切换 */}
                  <td className="py-3 px-4">
                    <select
                      value={version.status}
                      onChange={(e) =>
                        version._id &&
                        onStatusChange(version._id, e.target.value as AppVersionDocument['status'])
                      }
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium focus:outline-none transition ${
                        version.status === 'published'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : version.status === 'draft'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      <option value="published">已发布</option>
                      <option value="draft">草稿</option>
                      <option value="archived">已下线</option>
                    </select>
                  </td>

                  {/* 下载量 */}
                  <td className="py-3 px-4 text-center font-mono font-medium text-slate-200">
                    {version.downloadCount || 0}
                  </td>

                  {/* 发布时间 */}
                  <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(version.createdAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  {/* 操作按钮 */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onEdit(version)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                        title="编辑版本信息"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => version._id && onDelete(version._id)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
                        title="删除版本记录"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页控制区 */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400 gap-2">
        <div>
          共 <span className="font-semibold text-white">{pagination.total}</span> 条记录 · 第{' '}
          <span className="font-semibold text-white">{pagination.page}</span> /{' '}
          <span className="font-semibold text-white">{pagination.totalPages}</span> 页
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>上一页</span>
          </button>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>下一页</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
