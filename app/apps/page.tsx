'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { AppStatsOverview } from '@/components/apps/AppStatsOverview';
import { AppFilterBar } from '@/components/apps/AppFilterBar';
import { AppTable } from '@/components/apps/AppTable';
import { AppVersionModal } from '@/components/apps/AppVersionModal';
import { AndroidAppDocModal } from '@/components/apps/AndroidAppDocModal';
import { AppVersionDocument, AppVersionStats } from '@/types/app-version';
import { CheckCircle2, AlertCircle, Package } from 'lucide-react';

export default function AppsPage() {
  const [versions, setVersions] = useState<AppVersionDocument[]>([]);
  const [stats, setStats] = useState<AppVersionStats | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [sortBy, setSortBy] = useState('versionCode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AppVersionDocument | null>(null);
  const [isAndroidDocOpen, setIsAndroidDocOpen] = useState(false);

  // API Key in localStorage
  const [apiKey, setApiKey] = useState('next-log-secret-key-2026');

  useEffect(() => {
    const savedKey = localStorage.getItem('next_log_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleUpdateApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('next_log_api_key', key);
  };

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/apps/versions/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch {
      // 忽略统计接口异常
    }
  }, []);

  // Fetch Versions
  const fetchVersions = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      params.set('page', String(pageToLoad));
      params.set('limit', '20');

      if (search.trim()) params.set('search', search.trim());
      if (status && status !== 'all') params.set('status', status);
      if (channel && channel !== 'all') params.set('channel', channel);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);

      try {
        const res = await fetch(`/api/apps/versions?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setVersions(data.data);
          setPagination(data.pagination);
        } else {
          setErrorMessage(data.error || '获取版本列表失败');
        }
      } catch (err: any) {
        setErrorMessage(err.message || '网络连接异常或数据库未连接');
      } finally {
        setIsLoading(false);
      }
    },
    [search, status, channel, sortBy, sortOrder]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVersions(1);
      fetchStats();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchVersions, fetchStats]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('all');
    setChannel('all');
    setSortBy('versionCode');
    setSortOrder('desc');
  };

  // 快捷切换状态
  const handleStatusChange = async (id: string, newStatus: AppVersionDocument['status']) => {
    try {
      const res = await fetch('/api/apps/versions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          _id: id,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showSuccess('版本状态已成功更新');
        fetchVersions(pagination.page);
        fetchStats();
      } else {
        setErrorMessage(data.error || '更新状态失败');
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络异常');
    }
  };

  // 删除版本
  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除此 App 版本记录吗？此操作不可逆。')) {
      return;
    }

    try {
      const res = await fetch(`/api/apps/versions?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey,
        },
      });

      const data = await res.json();
      if (data.success) {
        showSuccess('版本记录已成功删除');
        fetchVersions(pagination.page);
        fetchStats();
      } else {
        setErrorMessage(data.error || '删除失败');
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络异常');
    }
  };

  const handleEdit = (version: AppVersionDocument) => {
    setEditingVersion(version);
    setIsModalOpen(true);
  };

  return (
    <AdminLayout
      title="版本管理"
      subtitle="Android 打包安装包上传、版本号控制、强制升级策略与新版本分发"
      breadcrumbs={[{ label: '应用服务管理' }, { label: '版本管理' }]}
      onOpenCreate={() => {
        setEditingVersion(null);
        setIsModalOpen(true);
      }}
      createButtonText="发布新版本"
      showCreateButton={true}
      onOpenApiDocs={() => setIsAndroidDocOpen(true)}
      apiKey={apiKey}
      onUpdateApiKey={handleUpdateApiKey}
      onRefresh={() => {
        fetchVersions(pagination.page);
        fetchStats();
      }}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {/* Toast 成功提示 */}
        {successToast && (
          <div className="fixed top-16 right-4 z-50 flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/90 px-4 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successToast}</span>
          </div>
        )}

        {/* 错误提示 */}
        {errorMessage && (
          <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 underline hover:text-rose-200"
            >
              忽略
            </button>
          </div>
        )}

        {/* 1. 统计卡片 */}
        <AppStatsOverview
          stats={stats}
          onFilterStatus={(s) => setStatus(s)}
          currentStatus={status}
        />

        {/* 2. 筛选过滤栏 */}
        <AppFilterBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          channel={channel}
          onChannelChange={setChannel}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          onReset={handleResetFilters}
        />

        {/* 3. 版本数据表格 */}
        <AppTable
          versions={versions}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          pagination={pagination}
          onPageChange={(newPage) => fetchVersions(newPage)}
        />

        {/* 4. 新建/编辑版本弹窗 */}
        <AppVersionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingVersion={editingVersion}
          onSuccess={(msg) => {
            showSuccess(msg);
            fetchVersions(1);
            fetchStats();
          }}
          apiKey={apiKey}
        />

        {/* 5. Android 客户端接入指南弹窗 */}
        <AndroidAppDocModal
          isOpen={isAndroidDocOpen}
          onClose={() => setIsAndroidDocOpen(false)}
        />
      </div>
    </AdminLayout>
  );
}
