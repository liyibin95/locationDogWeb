'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Terminal, Code2 } from 'lucide-react';

interface AndroidConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidConfigModal: React.FC<AndroidConfigModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const curlExample = `curl -X GET "https://your-domain.com/api/configs/client?appId=com.example.app&env=prod&versionCode=101&channel=googleplay"`;

  const jsonResponseExample = `{
  "success": true,
  "appId": "com.example.app",
  "environment": "prod",
  "configs": {
    "network_base_url": "https://api.example.com",
    "feature_dark_mode": true,
    "max_retry_times": 3,
    "app_upgrade_info": {
      "minVersion": 100,
      "latestVersion": 105,
      "forceUpdate": false,
      "downloadUrl": "https://example.com/app.apk"
    }
  },
  "version": 1732435200000,
  "count": 4
}`;

  const kotlinSdkCode = `package com.example.app.config

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

/**
 * Android 远程配置管理器 (RemoteConfigManager)
 * 支持启动拉取、本地 SharedPreferences 离线缓存、类型安全读取与默认兜底
 */
object RemoteConfigManager {

    private const val PREFS_NAME = "remote_config_cache"
    private const val HOST = "https://your-domain.com" // 替换为你的部署地址

    private lateinit var prefs: SharedPreferences
    private val memoryCache = mutableMapOf<String, Any>()

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        // 从本地持久化缓存恢复至内存
        prefs.all.forEach { (k, v) ->
            if (v != null) memoryCache[k] = v
        }
    }

    /**
     * 向服务端同步最新配置并更新本地持久化缓存
     */
    suspend fun fetchAndActivate(
        appId: String,
        environment: String = "prod",
        versionCode: Int,
        channel: String = "official"
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val url = "$HOST/api/configs/client?appId=$appId&env=$environment&versionCode=$versionCode&channel=$channel"
            val request = Request.Builder()
                .url(url)
                .get()
                .build()

            val client = OkHttpClient()
            val response = client.newCall(request).execute()

            if (!response.isSuccessful) return@withContext false
            val bodyString = response.body?.string() ?: return@withContext false

            val root = JSONObject(bodyString)
            if (!root.optBoolean("success", false)) return@withContext false

            val configsObj = root.optJSONObject("configs") ?: return@withContext false
            val editor = prefs.edit()

            configsObj.keys().forEach { key ->
                val value = configsObj.get(key)
                memoryCache[key] = value
                when (value) {
                    is Boolean -> editor.putBoolean(key, value)
                    is Int -> editor.putInt(key, value)
                    is Long -> editor.putLong(key, value)
                    is Double -> editor.putFloat(key, value.toFloat())
                    else -> editor.putString(key, value.toString())
                }
            }
            editor.apply()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    // --- 类型安全读取方法 ---

    fun getBoolean(key: String, defaultValue: Boolean = false): Boolean {
        return (memoryCache[key] as? Boolean)
            ?: prefs.getBoolean(key, defaultValue)
    }

    fun getString(key: String, defaultValue: String = ""): String {
        return (memoryCache[key] as? String)
            ?: prefs.getString(key, defaultValue)
            ?: defaultValue
    }

    fun getInt(key: String, defaultValue: Int = 0): Int {
        return (memoryCache[key] as? Number)?.toInt()
            ?: prefs.getInt(key, defaultValue)
    }

    fun getJSONObject(key: String): JSONObject? {
        val raw = memoryCache[key] ?: prefs.getString(key, null) ?: return null
        return try {
            if (raw is JSONObject) raw else JSONObject(raw.toString())
        } catch (e: Exception) {
            null
        }
    }
}
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-lg bg-indigo-500/10 p-2 border border-indigo-500/20 text-indigo-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Android 配置中心接入指南</h3>
              <p className="text-xs text-slate-400">
                支持开箱即用的 Kotlin RemoteConfigManager，支持离线持久化与自动兜底
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Step 1: API Endpoint */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>1. 客户端拉取接口 (HTTP GET)</span>
              </h4>
              <button
                onClick={() => handleCopy(curlExample, 1)}
                className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
              >
                {copiedIndex === 1 ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>复制 cURL</span>
              </button>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-indigo-300 overflow-x-auto">
              {curlExample}
            </pre>
            <p className="text-[11px] text-slate-400">
              支持参数：<code>appId</code> (包名), <code>env</code> (prod/beta/dev), <code>versionCode</code> (应用版本号), <code>channel</code> (渠道名), <code>group</code> (分组可选)。
            </p>
          </div>

          {/* Step 2: JSON Response Structure */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white">2. 返回数据示例 (直接按 Key 解析)</h4>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-300 overflow-x-auto max-h-48">
              {jsonResponseExample}
            </pre>
          </div>

          {/* Step 3: Kotlin SDK */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                <Code2 className="h-4 w-4 text-indigo-400" />
                <span>3. Android Kotlin 完整集成代码 (RemoteConfigManager.kt)</span>
              </h4>
              <button
                onClick={() => handleCopy(kotlinSdkCode, 2)}
                className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
              >
                {copiedIndex === 2 ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>复制代码</span>
              </button>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
              {kotlinSdkCode}
            </pre>
          </div>

          {/* Usage example */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
            <h5 className="text-xs font-semibold text-indigo-300">💡 客户端使用示范：</h5>
            <div className="text-xs text-slate-300 font-mono space-y-1">
              <p>// 1. Application onCreate 中初始化</p>
              <p className="text-slate-400">RemoteConfigManager.init(this)</p>
              <p>// 2. 启动页或后台协程中异步拉取</p>
              <p className="text-slate-400">
                lifecycleScope.launch &#123; RemoteConfigManager.fetchAndActivate(packageName, &quot;prod&quot;, BuildConfig.VERSION_CODE) &#125;
              </p>
              <p>// 3. 业务代码中即时读取</p>
              <p className="text-slate-400">
                val isDarkMode = RemoteConfigManager.getBoolean(&quot;feature_dark_mode&quot;, false)
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
