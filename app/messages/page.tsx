'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { MessageStatsOverview } from '@/components/messages/MessageStatsOverview';
import { MessageFilterBar } from '@/components/messages/MessageFilterBar';
import { MessageTable } from '@/components/messages/MessageTable';
import { MessagePreviewModal } from '@/components/messages/MessagePreviewModal';
import { AndroidMessageModal } from '@/components/messages/AndroidMessageModal';
import { MessageDocument, MessageStats } from '@/types/message';
import { CheckCircle2, AlertCircle, Smartphone, Plus } from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageDocument[]>([]);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [appId, setAppId] = useState('all');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals (Preview & Guide)
  const [previewingMessage, setPreviewingMessage] = useState<MessageDocument | null>(null);
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
      const res = await fetch('/api/messages/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch {
      // Ignore background stats fetch errors
    }
  }, []);

  // Fetch Messages
  const fetchMessages = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      params.set('page', String(pageToLoad));
      params.set('limit', '20');

      if (search.trim()) params.set('search', search.trim());
      if (type && type !== 'all') params.set('type', type);
      if (status && status !== 'all') params.set('status', status);
      if (priority && priority !== 'all') params.set('priority', priority);
      if (appId && appId !== 'all') params.set('appId', appId);

      try {
        const res = await fetch(`/api/messages?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setMessages(data.data);
          setPagination(data.pagination);
        } else {
          setErrorMessage(data.error || '获取消息列表失败');
        }
      } catch (err: any) {
        setErrorMessage(err.message || '网络连接异常或数据库未连接');
      } finally {
        setIsLoading(false);
      }
    },
    [search, type, status, priority, appId]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMessages(1);
      fetchStats();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchMessages, fetchStats]);

  const handleResetFilters = () => {
    setSearch('');
    setType('all');
    setStatus('all');
    setPriority('all');
    setAppId('all');
  };

  const availableApps = useMemo(() => {
    const list = [
      ...(stats?.appIds?.map((a) => a.name) || []),
      ...messages.map((m) => m.appId),
    ];
    return Array.from(new Set(list)).filter((app) => Boolean(app && app !== 'all'));
  }, [stats?.appIds, messages]);

  // Toggle status (published <-> draft)
  const handleToggleStatus = async (message: MessageDocument): Promise<boolean> => {
    try {
      const nextStatus = message.status === 'published' ? 'draft' : 'published';
      const res = await fetch('/api/messages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          _id: message._id,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`消息 "${message.title}" 状态已更新为: ${nextStatus === 'published' ? '已发布' : '草稿'}`);
        fetchMessages(pagination.page);
        fetchStats();
        return true;
      } else {
        setErrorMessage(data.error || '更新消息状态失败');
        return false;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络异常');
      return false;
    }
  };

  // Delete message
  const handleDeleteMessage = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/messages?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('消息已成功删除');
        fetchMessages(pagination.page);
        fetchStats();
        return true;
      } else {
        setErrorMessage(data.error || '删除消息失败');
        return false;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '删除请求失败');
      return false;
    }
  };

  return (
    <AdminLayout
      title="消息中心"
      subtitle="Android 客户端公告下发、版本升级提示、站内通知与启动强弹窗"
      breadcrumbs={[{ label: '应用服务管理' }, { label: '消息中心' }]}
      onOpenCreate={() => router.push('/messages/create')}
      createButtonText="新建消息"
      onOpenApiDocs={() => setIsAndroidDocOpen(true)}
      apiKey={apiKey}
      onUpdateApiKey={handleUpdateApiKey}
      onRefresh={() => {
        fetchMessages(pagination.page);
        fetchStats();
      }}
      isLoading={isLoading}
    >
      {/* Banner header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-white">消息与通知中心</h2>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              Android Messages & Announcements
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            面向 Android App 客户端统一发布系统维护公告、版本更新提示、站内通知与启动强弹窗，支持已读状态追踪。
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
          <Link
            href="/messages/create"
            className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>新建消息</span>
          </Link>
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
      <MessageStatsOverview
        stats={stats}
        onFilterStatus={(st) => setStatus(st)}
        currentStatus={status}
      />

      {/* Filter Bar */}
      <MessageFilterBar
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        appId={appId}
        onAppIdChange={setAppId}
        onReset={handleResetFilters}
        availableApps={availableApps}
      />

      {/* Message Table */}
      <MessageTable
        messages={messages}
        pagination={pagination}
        onPageChange={(p) => fetchMessages(p)}
        isLoading={isLoading}
        onOpenCreate={() => router.push('/messages/create')}
        onEditMessage={(msg) => router.push(`/messages/create?id=${msg._id}`)}
        onDeleteMessage={handleDeleteMessage}
        onToggleStatus={handleToggleStatus}
        onPreviewMessage={(msg) => setPreviewingMessage(msg)}
      />

      {/* Modals (Preview & Guide) */}
      <MessagePreviewModal
        message={previewingMessage}
        onClose={() => setPreviewingMessage(null)}
      />

      <AndroidMessageModal
        isOpen={isAndroidDocOpen}
        onClose={() => setIsAndroidDocOpen(false)}
      />
    </AdminLayout>
  );
}
