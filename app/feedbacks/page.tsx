'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { FeedbackStatsOverview } from '@/components/feedbacks/FeedbackStatsOverview';
import { FeedbackFilterBar } from '@/components/feedbacks/FeedbackFilterBar';
import { FeedbackTable } from '@/components/feedbacks/FeedbackTable';
import { FeedbackModal } from '@/components/feedbacks/FeedbackModal';
import { FeedbackDetailModal } from '@/components/feedbacks/FeedbackDetailModal';
import { FeedbackDocument, FeedbackStats, FeedbackStatus } from '@/types/feedback';
import { CheckCircle2, AlertCircle, MessageSquareText, Plus, RefreshCw } from 'lucide-react';

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackDocument[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
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
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReplyMode, setIsReplyMode] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackDocument | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailFeedback, setDetailFeedback] = useState<FeedbackDocument | null>(null);

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
      const res = await fetch('/api/feedbacks/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch {
      // Ignore background stats fetch errors
    }
  }, []);

  // Fetch Feedbacks
  const fetchFeedbacks = useCallback(
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
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);

      try {
        const res = await fetch(`/api/feedbacks?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setFeedbacks(data.data);
          setPagination(data.pagination);
        } else {
          setErrorMessage(data.error || '获取意见反馈列表失败');
        }
      } catch (err: any) {
        setErrorMessage(err.message || '网络连接异常或数据库未连接');
      } finally {
        setIsLoading(false);
      }
    },
    [search, type, status, priority, sortBy, sortOrder]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeedbacks(1);
      fetchStats();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchFeedbacks, fetchStats]);

  const handleResetFilters = () => {
    setSearch('');
    setType('all');
    setStatus('all');
    setPriority('all');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  // Delete feedback
  const handleDeleteFeedback = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/feedbacks?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('反馈记录已成功删除');
        fetchFeedbacks(pagination.page);
        fetchStats();
        return true;
      } else {
        setErrorMessage(data.error || '删除反馈失败');
        return false;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '删除请求异常');
      return false;
    }
  };

  // Batch delete
  const handleBatchDelete = async (ids: string[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/feedbacks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ ids }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`已成功删除 ${data.deletedCount || ids.length} 条反馈`);
        fetchFeedbacks(pagination.page);
        fetchStats();
        return true;
      } else {
        setErrorMessage(data.error || '批量删除失败');
        return false;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '批量删除网络异常');
      return false;
    }
  };

  return (
    <AdminLayout
      title="意见反馈"
      subtitle="用户意见、功能建议、缺陷投诉收集与处理中心"
      breadcrumbs={[{ label: '应用服务管理' }, { label: '意见反馈' }]}
      onOpenCreate={() => {
        setEditingFeedback(null);
        setIsReplyMode(false);
        setIsModalOpen(true);
      }}
      createButtonText="新增反馈"
      apiKey={apiKey}
      onUpdateApiKey={handleUpdateApiKey}
      onRefresh={() => {
        fetchFeedbacks(pagination.page);
        fetchStats();
      }}
      isLoading={isLoading}
    >
      {/* Banner header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-white">意见与建议管理中心</h2>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              Feedbacks & Suggestions
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            集中受理 Android 客户端与终端用户提交的问题反馈、功能建议与缺陷投诉，支持在线答复与状态流转。
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              fetchFeedbacks(pagination.page);
              fetchStats();
            }}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>
          <button
            onClick={() => {
              setEditingFeedback(null);
              setIsReplyMode(false);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>新增反馈</span>
          </button>
        </div>
      </div>

      {/* Success toast */}
      {successToast && (
        <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error notification banner */}
      {errorMessage && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats Overview */}
      <FeedbackStatsOverview
        stats={stats}
        onFilterStatus={(s) => setStatus(s)}
        currentStatus={status}
      />

      {/* Filter Bar */}
      <FeedbackFilterBar
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onReset={handleResetFilters}
      />

      {/* Feedbacks Table */}
      <FeedbackTable
        feedbacks={feedbacks}
        pagination={pagination}
        onPageChange={(page) => fetchFeedbacks(page)}
        isLoading={isLoading}
        onOpenCreate={() => {
          setEditingFeedback(null);
          setIsReplyMode(false);
          setIsModalOpen(true);
        }}
        onEditFeedback={(item) => {
          setEditingFeedback(item);
          setIsReplyMode(false);
          setIsModalOpen(true);
        }}
        onReplyFeedback={(item) => {
          setEditingFeedback(item);
          setIsReplyMode(true);
          setIsModalOpen(true);
        }}
        onViewDetail={(item) => {
          setDetailFeedback(item);
          setIsDetailOpen(true);
        }}
        onDeleteFeedback={handleDeleteFeedback}
        onBatchDelete={handleBatchDelete}
      />

      {/* Create / Edit / Reply Modal */}
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFeedback(null);
          setIsReplyMode(false);
        }}
        onSuccess={() => {
          showSuccess(
            isReplyMode
              ? '反馈答复已成功记录并流转状态'
              : editingFeedback
              ? '反馈记录已成功更新'
              : '新增意见反馈已成功保存'
          );
          fetchFeedbacks(pagination.page);
          fetchStats();
        }}
        initialFeedback={editingFeedback}
        apiKey={apiKey}
        isReplyMode={isReplyMode}
      />

      {/* Detail Modal */}
      <FeedbackDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailFeedback(null);
        }}
        feedback={detailFeedback}
        onOpenReply={(item) => {
          setEditingFeedback(item);
          setIsReplyMode(true);
          setIsModalOpen(true);
        }}
      />
    </AdminLayout>
  );
}
