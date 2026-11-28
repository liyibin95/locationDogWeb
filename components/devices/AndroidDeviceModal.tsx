'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Terminal, Code2, Coins } from 'lucide-react';

interface AndroidDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidDeviceModal: React.FC<AndroidDeviceModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const curlReportExample = `curl -X POST "https://your-domain.com/api/devices/client" \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "9a8b7c6d5e4f3210",
    "deviceInfo": "Xiaomi 13 (Android 14)",
    "brand": "Xiaomi",
    "model": "2211133C",
    "osVersion": "14",
    "wechatId": "wx_openid_123456"
  }'`;

  const curlPointsExample = `curl -X PUT "https://your-domain.com/api/devices/client" \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "9a8b7c6d5e4f3210",
    "pointsDelta": 50,
    "reason": "每日签到奖励"
  }'`;

  const curlBindExample = `# 按设备 ID 绑定微信 ID（或合并独立微信档案并累计积分）
curl -X POST "https://your-domain.com/api/devices/bind" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: your-api-key" \\
  -d '{
    "mode": "byDeviceId",
    "deviceId": "9a8b7c6d5e4f3210",
    "wechatId": "wx_openid_123456",
    "mergePoints": true
  }'

# 或：按微信 ID 绑定设备 ID
curl -X POST "https://your-domain.com/api/devices/bind" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: your-api-key" \\
  -d '{
    "mode": "byWechatId",
    "wechatId": "wx_openid_123456",
    "deviceId": "9a8b7c6d5e4f3210"
  }'`;

  const kotlinSdkCode = `package com.example.app.device

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.provider.Settings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Android 设备管理与积分 SDK (DeviceManager)
 * 封装设备唯一标识提取、硬件信息采集、自动注册心跳、微信绑定及积分增减查询
 */
object DeviceManager {

    private const val HOST = "https://your-domain.com" // 替换为实际部署域名
    private val client = OkHttpClient()

    /**
     * 获取 Android 设备唯一识别码 (ANDROID_ID)
     */
    @SuppressLint("HardwareIds")
    fun getDeviceId(context: Context): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown_device"
    }

    /**
     * 获取设备硬件详细信息字符串
     */
    fun getDeviceInfo(): String {
        return "\${Build.MANUFACTURER} \${Build.MODEL} (Android \${Build.VERSION.RELEASE}, API \${Build.VERSION.SDK_INT})"
    }

    /**
     * 设备注册 / 心跳上报 / 微信绑定接口
     */
    suspend fun reportDevice(
        context: Context,
        wechatId: String? = null
    ): Result<DeviceProfile> = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("deviceId", getDeviceId(context))
                put("deviceInfo", getDeviceInfo())
                put("brand", Build.MANUFACTURER)
                put("model", Build.MODEL)
                put("osVersion", Build.VERSION.RELEASE)
                if (!wechatId.isNullOrBlank()) {
                    put("wechatId", wechatId)
                }
            }

            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url("\$HOST/api/devices/client")
                .post(body)
                .build()

            val response = client.newCall(request).execute()
            val resStr = response.body?.string() ?: ""
            val resJson = JSONObject(resStr)

            if (resJson.optBoolean("success")) {
                val data = resJson.getJSONObject("data")
                Result.success(
                    DeviceProfile(
                        deviceId = data.getString("deviceId"),
                        deviceInfo = data.getString("deviceInfo"),
                        wechatId = data.optString("wechatId"),
                        points = data.optInt("points", 0),
                        status = data.optString("status", "normal")
                    )
                )
            } else {
                Result.failure(Exception(resJson.optString("error", "上报失败")))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 查询本机当前设备信息与最新积分余额
     */
    suspend fun queryPoints(context: Context): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val deviceId = getDeviceId(context)
            val request = Request.Builder()
                .url("\$HOST/api/devices/client?deviceId=\$deviceId")
                .get()
                .build()

            val response = client.newCall(request).execute()
            val resStr = response.body?.string() ?: ""
            val resJson = JSONObject(resStr)

            if (resJson.optBoolean("success")) {
                val data = resJson.getJSONObject("data")
                val points = data.optInt("points", 0)
                Result.success(points)
            } else {
                Result.failure(Exception(resJson.optString("error", "查询失败")))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 按设备 ID 增加 / 扣减 / 变更积分（服务端自动审计修改前、修改后、修改值并入库日志）
     * @param pointsDelta 变更增量 (正数为增加，负数为扣减)
     * @param reason 调整原因（将自动归档到日志系统）
     */
    suspend fun updatePoints(
        context: Context,
        pointsDelta: Int,
        reason: String = "任务奖励"
    ): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("deviceId", getDeviceId(context))
                put("pointsDelta", pointsDelta)
                put("reason", reason)
            }

            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url("\$HOST/api/devices/client")
                .put(body)
                .build()

            val response = client.newCall(request).execute()
            val resStr = response.body?.string() ?: ""
            val resJson = JSONObject(resStr)

            if (resJson.optBoolean("success")) {
                val data = resJson.getJSONObject("data")
                val newPoints = data.optInt("points", 0)
                Result.success(newPoints)
            } else {
                Result.failure(Exception(resJson.optString("error", "积分修改失败")))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

data class DeviceProfile(
    val deviceId: String,
    val deviceInfo: String,
    val wechatId: String?,
    val points: Int,
    val status: String
)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Android 设备上报与积分接口接入指南</h3>
              <p className="text-xs text-slate-400">
                支持 Android App 自动提取设备 ID、硬件型号、系统版本上报与按设备 ID 调整积分
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs text-slate-300">
          {/* 1. Endpoint summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-indigo-400 font-semibold">
                <Terminal className="h-4 w-4" />
                <span>设备上报 / 绑定</span>
              </div>
              <div className="font-mono text-[11px] text-slate-200">
                <span className="text-emerald-400 font-bold">POST</span> /api/devices/client
              </div>
              <p className="text-[11px] text-slate-400">
                初次调用自动创建设备，后续调用更新硬件版本及心跳，可一并传递微信 OpenID 绑定。
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
                <Coins className="h-4 w-4" />
                <span>查询积分余额</span>
              </div>
              <div className="font-mono text-[11px] text-slate-200">
                <span className="text-cyan-400 font-bold">GET</span> /api/devices/client?deviceId=...
              </div>
              <p className="text-[11px] text-slate-400">
                客户端传入 deviceId 查询当前设备积分、微信绑定状态及设备是否正常。
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <Coins className="h-4 w-4" />
                <span>按设备ID调积分</span>
              </div>
              <div className="font-mono text-[11px] text-slate-200">
                <span className="text-amber-400 font-bold">PUT</span> /api/devices/client
              </div>
              <p className="text-[11px] text-slate-400">
                按 deviceId 增减或重设积分，系统自动记录修改前值、修改后值和变动值到日志集合。
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-violet-400 font-semibold">
                <Terminal className="h-4 w-4" />
                <span>修改绑定关系</span>
              </div>
              <div className="font-mono text-[11px] text-slate-200">
                <span className="text-violet-400 font-bold">POST</span> /api/devices/bind
              </div>
              <p className="text-[11px] text-slate-400">
                支持按设备 ID 绑定微信 ID，或按微信 ID 绑定设备 ID，支持独立记录自动合并。
              </p>
            </div>
          </div>

          {/* 2. cURL Example */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">设备与微信绑定关系接口 cURL 示例</span>
                <button
                  onClick={() => handleCopy(curlBindExample, 4)}
                  className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition"
                >
                  {copiedIndex === 4 ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedIndex === 4 ? '已复制' : '复制命令'}</span>
                </button>
              </div>
              <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
                {curlBindExample}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">客户端按设备 ID 调整积分 cURL 示例</span>
                <button
                  onClick={() => handleCopy(curlPointsExample, 1)}
                  className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition"
                >
                  {copiedIndex === 1 ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedIndex === 1 ? '已复制' : '复制命令'}</span>
                </button>
              </div>
              <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                {curlPointsExample}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">客户端硬件信息上报 cURL 示例</span>
                <button
                  onClick={() => handleCopy(curlReportExample, 2)}
                  className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition"
                >
                  {copiedIndex === 2 ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedIndex === 2 ? '已复制' : '复制命令'}</span>
                </button>
              </div>
              <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                {curlReportExample}
              </pre>
            </div>
          </div>

          {/* 3. Kotlin SDK implementation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Code2 className="h-4 w-4 text-indigo-400" />
                <span className="font-semibold text-slate-200">Kotlin 端开箱即用 SDK 代码</span>
              </div>
              <button
                onClick={() => handleCopy(kotlinSdkCode, 3)}
                className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition"
              >
                {copiedIndex === 3 ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedIndex === 3 ? '已复制' : '复制代码'}</span>
              </button>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-80">
              {kotlinSdkCode}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 px-6 py-3 bg-slate-900/60">
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
