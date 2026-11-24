'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { StatsOverview } from '@/components/StatsOverview';
import { LogFilterBar } from '@/components/LogFilterBar';
import { LogTable } from '@/components/LogTable';
import { CreateLogModal } from '@/components/CreateLogModal';
import { ApiDocModal } from '@/components/ApiDocModal';
import { LogDocument, LogLevel, LogStats, PaginationMeta } from '@/types/log';
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

export default function Home() {
  const [logs, setLogs] = useState<LogDocument[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LogLevel | 'all'>('all');
  const [service, setService] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);

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

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/logs/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch {
      // Ignore background stats fetch errors
    }
  }, []);

  // Fetch Logs
  const fetchLogs = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      params.set('page', String(pageToLoad));
      params.set('limit', '20');

      if (level && level !== 'all') params.set('level', level);
      if (service.trim()) params.set('service', service.trim());
      if (search.trim()) params.set('search', search.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      try {
        const res = await fetch(`/api/logs?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setLogs(data.data);
          setPagination(data.pagination);
        } else {
          setErrorMessage(data.error || '获取日志失败');
        }
      } catch (err: any) {
        setErrorMessage(
          err.message || '网络连接异常或数据库未连接。请检查 .env.local 中的 MONGODB_URI 配置。'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [level, service, search, startDate, endDate]
  );

  // Trigger search on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(1);
      fetchStats();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLogs, fetchStats]);

  const handleResetFilters = () => {
    setSearch('');
    setLevel('all');
    setService('');
    setStartDate('');
    setEndDate('');
  };

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  // 单条删除日志
  const handleDeleteLog = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/logs?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('日志删除成功');
        fetchLogs(pagination.page);
        fetchStats();
        return true;
      } else {
        setErrorMessage(data.error || '删除日志失败');
        return false;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络请求异常，删除失败');
      return false;
    }
  };

  // 批量删除日志
  const handleBatchDelete = async (ids: string[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`批量删除成功，共删除 ${data.deletedCount ?? ids.length} 条日志`);
        fetchLogs(pagination.page);
        fetchStats();
        return true;
      } else {
        setErrorMessage(data.error || '批量删除日志失败');
        return false;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络请求异常，批量删除失败');
      return false;
    }
  };

  const availableServices = stats?.services.map((s) => s.name) || [];

  return (
    <AdminLayout
      title="日志中心"
      subtitle="多维度分布式日志查询、实时采集统计与健康监控"
      breadcrumbs={[{ label: '日志中心' }]}
      onOpenCreate={() => setIsCreateOpen(true)}
      createButtonText="新增日志"
      onOpenApiDocs={() => setIsApiDocsOpen(true)}
      apiKey={apiKey}
      onUpdateApiKey={handleUpdateApiKey}
      onRefresh={() => {
        fetchLogs(pagination.page);
        fetchStats();
      }}
      isLoading={isLoading}
    >
      {/* Success toast banner */}
      {successToast && (
        <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error notification banner if DB is not connected or error occurred */}
      {errorMessage && (
        <div className="flex items-start justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <div>
              <span className="font-semibold">提示信息：</span>
              <span>{errorMessage}</span>
            </div>
          </div>
          <button
            onClick={() => setIsApiDocsOpen(true)}
            className="flex items-center space-x-1 underline text-rose-300 hover:text-white"
          >
            <span>查看配置指南</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Stats Overview */}
      <StatsOverview
        stats={stats}
        currentLevel={level}
        onSelectLevel={(lvl) => setLevel(lvl)}
      />

      {/* Filter Bar */}
      <LogFilterBar
        search={search}
        onSearchChange={setSearch}
        level={level}
        onLevelChange={setLevel}
        service={service}
        onServiceChange={setService}
        startDate={startDate}
        endDate={endDate}
        onDateChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
        onReset={handleResetFilters}
        availableServices={availableServices}
      />

      {/* Log Table / List */}
      <LogTable
        logs={logs}
        pagination={pagination}
        onPageChange={(p) => fetchLogs(p)}
        isLoading={isLoading}
        onOpenCreate={() => setIsCreateOpen(true)}
        onDeleteLog={handleDeleteLog}
        onBatchDelete={handleBatchDelete}
      />

      {/* Modals */}
      <CreateLogModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          fetchLogs(1);
          fetchStats();
        }}
        defaultApiKey={apiKey}
      />

      <ApiDocModal
        isOpen={isApiDocsOpen}
        onClose={() => setIsApiDocsOpen(false)}
        apiKey={apiKey}
      />
    </AdminLayout>
  );
}
