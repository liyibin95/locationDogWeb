'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Code2, Download, Smartphone, ShieldCheck } from 'lucide-react';

interface AndroidAppDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidAppDocModal: React.FC<AndroidAppDocModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const curlGetExample = `curl -X GET "https://your-domain.com/api/apps/check-update?appId=default&versionCode=100&versionName=1.0.0"`;

  const curlPostExample = `curl -X POST "https://your-domain.com/api/apps/check-update" \\
  -H "Content-Type: application/json" \\
  -d '{
    "appId": "default",
    "versionCode": 100,
    "versionName": "1.0.0",
    "channel": "official"
  }'`;

  const sampleJsonResponse = `{
  "success": true,
  "hasUpdate": true,
  "forceUpdate": false,
  "currentVersionCode": 100,
  "latestVersion": {
    "versionCode": 10200,
    "versionName": "1.2.0",
    "appId": "default",
    "appName": "NextLog Android",
    "downloadUrl": "https://your-domain.com/uploads/apps/1732612345_app-v1.2.0.apk",
    "trackDownloadUrl": "https://your-domain.com/api/apps/download/67458190012abc",
    "fileName": "app-v1.2.0.apk",
    "fileSize": 18456200,
    "fileMd5": "e10adc3949ba59abbe56e057f20f883e",
    "changelog": "1. 优化应用运行性能与网络连接\\n2. 修复已知异常与偶发崩溃",
    "forceUpdate": false,
    "minVersionCode": 90,
    "channel": "default",
    "publishTime": "2026-11-26T12:00:00.000Z"
  },
  "message": "发现新版本 1.2.0 (10200)"
}`;

  const kotlinUpdateManagerCode = `package com.example.app.updater

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.widget.Toast
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

/**
 * Android App 版本检测与自动下载安装管理器
 */
object AppUpdateManager {

    private const val HOST = "https://your-domain.com" // 替换为您部署的 NextLog 服务域名
    private val client = OkHttpClient()

    data class UpdateInfo(
        val hasUpdate: Boolean,
        val forceUpdate: Boolean,
        val versionName: String,
        val versionCode: Int,
        val downloadUrl: String,
        val changelog: String,
        val fileMd5: String?,
        val fileSize: Long
    )

    /**
     * 1. 检查版本更新
     */
    suspend fun checkUpdate(
        context: Context,
        appId: String = "default"
    ): Result<UpdateInfo?> = withContext(Dispatchers.IO) {
        try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val currentVersionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode
            }
            val currentVersionName = packageInfo.versionName ?: "1.0.0"

            val url = "$HOST/api/apps/check-update?appId=$appId&versionCode=$currentVersionCode&versionName=$currentVersionName"
            val request = Request.Builder().url(url).get().build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: return@withContext Result.failure(Exception("响应为空"))

            val json = JSONObject(responseBody)
            if (!json.optBoolean("success", false)) {
                return@withContext Result.failure(Exception(json.optString("error", "检查更新失败")))
            }

            val hasUpdate = json.optBoolean("hasUpdate", false)
            if (!hasUpdate) {
                return@withContext Result.success(null) // 无新版本
            }

            val forceUpdate = json.optBoolean("forceUpdate", false)
            val latest = json.getJSONObject("latestVersion")

            val info = UpdateInfo(
                hasUpdate = true,
                forceUpdate = forceUpdate,
                versionName = latest.optString("versionName", ""),
                versionCode = latest.optInt("versionCode", 0),
                downloadUrl = latest.optString("trackDownloadUrl", latest.optString("downloadUrl", "")),
                changelog = latest.optString("changelog", ""),
                fileMd5 = latest.optString("fileMd5", null),
                fileSize = latest.optLong("fileSize", 0)
            )

            Result.success(info)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 2. 展示更新弹窗
     */
    fun showUpdateDialog(context: Context, info: UpdateInfo) {
        val builder = AlertDialog.Builder(context)
            .setTitle("发现新版本 v\${info.versionName}")
            .setMessage("【更新内容】\\n\${info.changelog}")
            .setPositiveButton("立即更新") { _, _ ->
                downloadAndInstallApk(context, info)
            }

        if (info.forceUpdate) {
            builder.setCancelable(false) // 强制更新，禁止取消
        } else {
            builder.setNegativeButton("稍后提醒", null)
            builder.setCancelable(true)
        }

        builder.show()
    }

    /**
     * 3. 下载 APK 并调起系统安装器
     */
    fun downloadAndInstallApk(context: Context, info: UpdateInfo) {
        Toast.makeText(context, "正在后台下载安装包，请稍候...", Toast.LENGTH_SHORT).show()

        Thread {
            try {
                val request = Request.Builder().url(info.downloadUrl).build()
                val response = client.newCall(request).execute()
                val body = response.body ?: throw Exception("下载文件为空")

                val apkFile = File(context.getExternalFilesDir(null), "app_update_\${info.versionCode}.apk")
                val fos = FileOutputStream(apkFile)
                body.byteStream().use { input ->
                    fos.use { output ->
                        input.copyTo(output)
                    }
                }

                // 调起系统安装界面
                installApk(context, apkFile)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }

    private fun installApk(context: Context, apkFile: File) {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            val apkUri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                FileProvider.getUriForFile(context, "\${context.packageName}.fileprovider", apkFile)
            } else {
                Uri.fromFile(apkFile)
            }
            setDataAndType(apkUri, "application/vnd.android.package-archive")
        }
        context.startActivity(intent)
    }
}`;

  const manifestXmlSnippet = `<!-- AndroidManifest.xml 配置 FileProvider -->
<manifest ...>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />

    <application ...>
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>`;

  const filePathsXmlSnippet = `<!-- res/xml/file_paths.xml -->
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-files-path name="external_files" path="." />
</paths>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Android 客户端版本更新接入指南</h3>
              <p className="text-xs text-slate-400">
                支持查询版本是否更新、强更策略拦截、APK 下载进度与系统安装器调起
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
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs text-slate-300">
          {/* 接口说明卡片 */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-300 font-semibold text-sm">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span>更新接口规范与机制</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Android 客户端在应用启动或用户手动点击“检查更新”时，向服务端发送当前安装的 <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded">versionCode</code>。
              服务端自动检索最新发布的版本，当 <code className="text-emerald-400 font-mono">最新 versionCode &gt; 客户端 versionCode</code> 时，返回新版本信息及 APK 下载直链。
              若开启了<span className="text-rose-300">强制更新</span>或客户端版本低于 <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">minVersionCode</code>，弹窗禁止关闭。
            </p>
          </div>

          {/* 1. GET 示例 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">1. cURL GET 检查更新请求</span>
              <button
                onClick={() => handleCopy(curlGetExample, 1)}
                className="flex items-center space-x-1 text-slate-400 hover:text-white"
              >
                {copiedIndex === 1 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedIndex === 1 ? '已复制' : '复制命令'}</span>
              </button>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto">
              {curlGetExample}
            </pre>
          </div>

          {/* 2. POST 示例 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">2. cURL POST 检查更新请求 (支持携带渠道号)</span>
              <button
                onClick={() => handleCopy(curlPostExample, 2)}
                className="flex items-center space-x-1 text-slate-400 hover:text-white"
              >
                {copiedIndex === 2 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedIndex === 2 ? '已复制' : '复制命令'}</span>
              </button>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto">
              {curlPostExample}
            </pre>
          </div>

          {/* 3. 响应 JSON */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">3. 服务端响应数据结构 (JSON)</span>
              <button
                onClick={() => handleCopy(sampleJsonResponse, 3)}
                className="flex items-center space-x-1 text-slate-400 hover:text-white"
              >
                {copiedIndex === 3 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedIndex === 3 ? '已复制' : '复制 JSON'}</span>
              </button>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-emerald-400/90 overflow-x-auto">
              {sampleJsonResponse}
            </pre>
          </div>

          {/* 4. Kotlin 完整实现代码 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">4. Android Kotlin 完整更新管理器 (AppUpdateManager.kt)</span>
              <button
                onClick={() => handleCopy(kotlinUpdateManagerCode, 4)}
                className="flex items-center space-x-1 text-slate-400 hover:text-white"
              >
                {copiedIndex === 4 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedIndex === 4 ? '已复制' : '复制代码'}</span>
              </button>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-72">
              {kotlinUpdateManagerCode}
            </pre>
          </div>

          {/* 5. AndroidManifest & FileProvider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-300">5. AndroidManifest.xml 配置</span>
                <button
                  onClick={() => handleCopy(manifestXmlSnippet, 5)}
                  className="flex items-center space-x-1 text-slate-400 hover:text-white"
                >
                  {copiedIndex === 5 ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedIndex === 5 ? '已复制' : '复制'}</span>
                </button>
              </div>
              <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[10px] text-slate-400 overflow-x-auto">
                {manifestXmlSnippet}
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-300">6. res/xml/file_paths.xml</span>
                <button
                  onClick={() => handleCopy(filePathsXmlSnippet, 6)}
                  className="flex items-center space-x-1 text-slate-400 hover:text-white"
                >
                  {copiedIndex === 6 ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedIndex === 6 ? '已复制' : '复制'}</span>
                </button>
              </div>
              <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[10px] text-slate-400 overflow-x-auto">
                {filePathsXmlSnippet}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 px-6 py-3 bg-slate-900/80">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            关闭文档
          </button>
        </div>
      </div>
    </div>
  );
};
