'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { DeviceStatsOverview } from '@/components/devices/DeviceStatsOverview';
import { DeviceFilterBar } from '@/components/devices/DeviceFilterBar';
import { DeviceTable } from '@/components/devices/DeviceTable';
import { DeviceModal } from '@/components/devices/DeviceModal';
import { DevicePointsModal } from '@/components/devices/DevicePointsModal';
import { AndroidDeviceModal } from '@/components/devices/AndroidDeviceModal';
import { DeviceDocument, DeviceStats } from '@/types/device';
import { CheckCircle2, AlertCircle, Smartphone, Plus } from 'lucide-react';

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceDocument[]>([]);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [wechatStatus, setWechatStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceDocument | null>(null);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [pointsTargetDevice, setPointsTargetDevice] = useState<DeviceDocument | null>(null);
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
      const res = await fetch('/api/devices/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch {
      // Ignore background stats fetch errors
    }
  }, []);

  // Fetch Devices
  const fetchDevices = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      params.set('page', String(pageToLoad));
      params.set('limit', '20');

      if (search.trim()) params.set('search', search.trim());
      if (status && status !== 'all') params.set('status', status);
      if (wechatStatus && wechatStatus !== 'all') params.set('wechatStatus', wechatStatus);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);

      try {
        const res = await fetch(`/api/devices?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setDevices(data.data);
          setPagination(data.pagination);
        } else {
          setErrorMessage(data.error || '获取设备列表失败');
        }
      } catch (err: any) {
        setErrorMessage(err.message || '网络连接异常或数据库未连接');
      } finally {
        setIsLoading(false);
      }
    },
    [search, status, wechatStatus, sortBy, sortOrder]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDevices(1);
      fetchStats();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDevices, fetchStats]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('all');
    setWechatStatus('all');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  // Toggle status
  const handleToggleStatus = async (device: DeviceDocument): Promise<boolean> => {
    const nextStatus = device.status === 'normal' ? 'disabled' : 'normal';
    try {
      const res = await fetch('/api/devices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          _id: device._id,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(
          `设备 ${device.deviceId} 状态已更新为：${nextStatus === 'normal' ? '正常' : '已禁用'}`
        );
        fetchDevices(pagination.page);
        fetchStats();
        return true;
      } else {
        setErrorMessage(data.error || '切换状态失败');
        return false;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络异常');
      return false;
    }
  };

  // Delete device
  const handleDeleteDevice = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/devices?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('设备记录已成功删除');
        fetchDevices(pagination.page);
        fetchStats();
        return true;
      } else {
        setErrorMessage(data.error || '删除设备失败');
        return false;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '删除请求失败');
      return false;
    }
  };

  return (
    <AdminLayout
      title="设备管理"
      subtitle="Android 终端设备硬件信息、微信绑定关系及用户积分管理"
      breadcrumbs={[{ label: '应用服务管理' }, { label: '设备管理' }]}
      onOpenCreate={() => {
        setEditingDevice(null);
        setIsModalOpen(true);
      }}
      createButtonText="新增设备"
      onOpenApiDocs={() => setIsAndroidDocOpen(true)}
      apiKey={apiKey}
      onUpdateApiKey={handleUpdateApiKey}
      onRefresh={() => {
        fetchDevices(pagination.page);
        fetchStats();
      }}
      isLoading={isLoading}
    >
      {/* Banner header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Android 设备管理中心</h2>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              Devices & Points Hub
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            集中管理 Android 客户端硬件档案、微信 OpenID 绑定、积分账户充值与扣减，并控制设备授权状态。
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
              setEditingDevice(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>新增设备</span>
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
      <DeviceStatsOverview
        stats={stats}
        onFilterStatus={(s) => setStatus(s)}
        onFilterWechat={(ws) => setWechatStatus(ws)}
        currentStatus={status}
        currentWechatStatus={wechatStatus}
      />

      {/* Filter Bar */}
      <DeviceFilterBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        wechatStatus={wechatStatus}
        onWechatStatusChange={setWechatStatus}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onReset={handleResetFilters}
      />

      {/* Devices Table */}
      <DeviceTable
        devices={devices}
        pagination={pagination}
        onPageChange={(page) => fetchDevices(page)}
        isLoading={isLoading}
        onOpenCreate={() => {
          setEditingDevice(null);
          setIsModalOpen(true);
        }}
        onEditDevice={(device) => {
          setEditingDevice(device);
          setIsModalOpen(true);
        }}
        onOpenPointsModal={(device) => {
          setPointsTargetDevice(device);
          setIsPointsModalOpen(true);
        }}
        onDeleteDevice={handleDeleteDevice}
        onToggleStatus={handleToggleStatus}
      />

      {/* Create / Edit Modal */}
      <DeviceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDevice(null);
        }}
        onSuccess={() => {
          showSuccess(editingDevice ? '设备信息已成功更新' : '新设备已成功添加');
          fetchDevices(pagination.page);
          fetchStats();
        }}
        initialDevice={editingDevice}
        apiKey={apiKey}
      />

      {/* Points Adjustment Modal */}
      <DevicePointsModal
        isOpen={isPointsModalOpen}
        onClose={() => {
          setIsPointsModalOpen(false);
          setPointsTargetDevice(null);
        }}
        onSuccess={() => {
          showSuccess('设备积分已成功更新');
          fetchDevices(pagination.page);
          fetchStats();
        }}
        device={pointsTargetDevice}
        apiKey={apiKey}
      />

      {/* Android SDK Documentation Modal */}
      <AndroidDeviceModal
        isOpen={isAndroidDocOpen}
        onClose={() => setIsAndroidDocOpen(false)}
      />
    </AdminLayout>
  );
}
