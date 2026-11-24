'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { ConfigStatsOverview } from '@/components/configs/ConfigStatsOverview';
import { ConfigFilterBar } from '@/components/configs/ConfigFilterBar';
import { ConfigTable } from '@/components/configs/ConfigTable';
import { ConfigModal } from '@/components/configs/ConfigModal';
import { AndroidConfigModal } from '@/components/configs/AndroidConfigModal';
import { ConfigDocument, ConfigStats } from '@/types/config';
import { CheckCircle2, AlertCircle, Smartphone, Plus } from 'lucide-react';

export default function ConfigsPage() {
  const [configs, setConfigs] = useState<ConfigDocument[]>([]);
  const [stats, setStats] = useState<ConfigStats | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const [appId, setAppId] = useState('all');
  const [environment, setEnvironment] = useState('all');
  const [isEnabled, setIsEnabled] = useState('all');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigDocument | null>(null);
  const [isAndroidDocOpen, setIsAndroidDocOpen] = useState(false);

  // API Key in localStorage for testing
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
      const res = await fetch('/api/configs/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch {
      // Ignore background stats fetch errors
    }
  }, []);

  // Fetch Configs
  const fetchConfigs = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      params.set('page', String(pageToLoad));
      params.set('limit', '20');

      if (search.trim()) params.set('search', search.trim());
      if (group && group !== 'all') params.set('group', group);
      if (appId && appId !== 'all') params.set('appId', appId);
      if (environment && environment !== 'all') params.set('environment', environment);
      if (isEnabled !== 'all') params.set('isEnabled', isEnabled);

      try {
        const res = await fetch(`/api/configs?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setConfigs(data.data);
          setPagination(data.pagination);
        } else {
          setErrorMessage(data.error || '获取配置列表失败');
        }
      } catch (err: any) {
        setErrorMessage(err.message || '网络连接异常或数据库未连接');
      } finally {
        setIsLoading(false);
      }
    },
    [search, group, appId, environment, isEnabled]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConfigs(1);
      fetchStats();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchConfigs, fetchStats]);

  const handleResetFilters = () => {
    setSearch('');
    setGroup('all');
    setAppId('all');
    setEnvironment('all');
    setIsEnabled('all');
  };

  // Toggle status (one-click enable/disable)
  const handleToggleStatus = async (config: ConfigDocument): Promise<boolean> => {
    try {
      const res = await fetch('/api/configs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          _id: config._id,
          isEnabled: !config.isEnabled,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`配置 "${config.key}" 已${!config.isEnabled ? '启用' : '停用'}`);
        fetchConfigs(pagination.page);
        fetchStats();
        return true;
      } else {
        setErrorMessage(data.error || '更新配置状态失败');
        return false;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络异常');
      return false;
    }
  };

  // Delete config
  const handleDeleteConfig = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/configs?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('配置项已成功删除');
        fetchConfigs(pagination.page);
        fetchStats();
        return true;
      } else {
        setErrorMessage(data.error || '删除配置失败');
        return false;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '删除请求失败');
      return false;
    }
  };

  const availableGroups = stats?.groups?.map((g) => g.name) || [];
  const availableApps = stats?.appIds?.map((a) => a.name) || [];

  return (
    <AdminLayout
      title="配置中心"
      subtitle="Android 远程参数配置、功能开关 (Feature Flags) 与多维度灰度下发"
      breadcrumbs={[{ label: '应用服务管理' }, { label: '配置中心' }]}
      onOpenCreate={() => {
        setEditingConfig(null);
        setIsModalOpen(true);
      }}
      createButtonText="新增配置"
      onOpenApiDocs={() => setIsAndroidDocOpen(true)}
      apiKey={apiKey}
      onUpdateApiKey={handleUpdateApiKey}
      onRefresh={() => {
        fetchConfigs(pagination.page);
        fetchStats();
      }}
      isLoading={isLoading}
    >
      {/* Banner header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-white">远程配置中心</h2>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              Android Remote Config
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            面向 Android App 提供轻量级远程动态参数配置、功能开关 (Feature Flags)、升级版本策略与域名下发。
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAndroidDocOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <Smartphone className="h-3.5 w-3.5 text-indigo-400" />
            <span>Android 接入指南</span>
          </button>
          <button
            onClick={() => {
              setEditingConfig(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>新增配置</span>
          </button>
        </div>
      </div>

      {/* Success toast */}
      {successToast && (
        <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error notification banner */}
      {errorMessage && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats Overview */}
      <ConfigStatsOverview
        stats={stats}
        onFilterEnabled={(status) => setIsEnabled(status)}
        currentStatus={isEnabled}
      />

      {/* Filter Bar */}
      <ConfigFilterBar
        search={search}
        onSearchChange={setSearch}
        group={group}
        onGroupChange={setGroup}
        appId={appId}
        onAppIdChange={setAppId}
        environment={environment}
        onEnvironmentChange={setEnvironment}
        isEnabled={isEnabled}
        onIsEnabledChange={setIsEnabled}
        onReset={handleResetFilters}
        availableGroups={availableGroups}
        availableApps={availableApps}
      />

      {/* Configs Table */}
      <ConfigTable
        configs={configs}
        pagination={pagination}
        onPageChange={(p) => fetchConfigs(p)}
        isLoading={isLoading}
        onOpenCreate={() => {
          setEditingConfig(null);
          setIsModalOpen(true);
        }}
        onEditConfig={(config) => {
          setEditingConfig(config);
          setIsModalOpen(true);
        }}
        onDeleteConfig={handleDeleteConfig}
        onToggleStatus={handleToggleStatus}
      />

      {/* Modals */}
      <ConfigModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingConfig(null);
        }}
        onSuccess={() => {
          fetchConfigs(pagination.page);
          fetchStats();
          showSuccess(editingConfig ? '配置更新成功' : '配置创建成功');
        }}
        initialConfig={editingConfig}
        apiKey={apiKey}
      />

      <AndroidConfigModal
        isOpen={isAndroidDocOpen}
        onClose={() => setIsAndroidDocOpen(false)}
      />
    </AdminLayout>
  );
}
