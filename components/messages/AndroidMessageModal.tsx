'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Terminal, Code2, Globe, Sparkles } from 'lucide-react';

interface AndroidMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidMessageModal: React.FC<AndroidMessageModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const curlExample = `curl -X GET "https://your-domain.com/api/messages/client?appId=com.example.app&userId=user_1001&versionCode=101&channel=googleplay"`;

  const queryByKeyCurl = `curl -X GET "https://your-domain.com/api/messages/client?key=splash_notice&appId=com.example.app&userId=user_1001"`;

  const markReadCurl = `curl -X POST "https://your-domain.com/api/messages/read" \\
  -H "Content-Type: application/json" \\
  -d '{"userId": "user_1001", "messageId": "65b0f1..."}'`;

  const h5UrlExamples = `// 1. 按 ID 打开指定公告详情（推荐）
val url = "https://your-domain.com/h5/messages/65b0f1234567890abcdef123?userId=user_1001"

// 2. 按固定 Key 打开公告（如开屏弹窗、用户隐私协议）
val url = "https://your-domain.com/h5/messages?key=splash_notice&userId=user_1001"

// 3. 适配原生沉浸式（隐藏 H5 顶栏、由 Android 原生提供标题栏与返回键）
val url = "https://your-domain.com/h5/messages/65b0f1...?userId=user_1001&hideHeader=true"

// 4. 指定浅色/暗色主题 (默认跟随系统自动切换)
val url = "https://your-domain.com/h5/messages/65b0f1...?theme=dark"`;

  const webViewActivityCode = `package com.example.app.ui

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * 嵌入 H5 公告页面的 Android Activity
 * 完美支持富文本、代码高亮、多级标题、表格排版与大图点击灯箱预览
 */
class AnnouncementActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        setupWebView()

        val noticeUrl = intent.getStringExtra(EXTRA_URL)
            ?: "https://your-domain.com/h5/messages"
        webView.loadUrl(noticeUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // 注入 Android 原生 JS 桥接对象
        webView.addJavascriptInterface(AndroidJsBridge(this), "Android")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url == null) return false
                // 非 http/https 自定义协议由外部 App 打开 (如 intent://, market://, weixin://)
                return if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (e: Exception) {
                        false
                    }
                } else {
                    false
                }
            }
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    /**
     * JS 交互接口：供 H5 公告页面直接触发原生事件
     */
    inner class AndroidJsBridge(private val context: Context) {

        /**
         * 响应底部 CTA 操作按钮或富文本内的跳转链接
         */
        @JavascriptInterface
        fun onActionClick(actionUrl: String, actionText: String) {
            runOnUiThread {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(actionUrl))
                    context.startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        /**
         * 响应 H5 顶栏返回/关闭按键
         */
        @JavascriptInterface
        fun closePage() {
            runOnUiThread {
                finish()
            }
        }

        /**
         * 当用户浏览后自动上报已读时同步本地未读角标
         */
        @JavascriptInterface
        fun onMessageRead(messageId: String) {
            // 在此更新 App 内部的小红点或未读计数
        }
    }

    companion object {
        private const val EXTRA_URL = "extra_announcement_url"

        fun start(context: Context, url: String) {
            val intent = Intent(context, AnnouncementActivity::class.java).apply {
                putExtra(EXTRA_URL, url)
            }
            context.startActivity(intent)
        }
    }
}`;

  const jsonResponseExample = `{
  "success": true,
  "unreadCount": 1,
  "popupMessage": {
    "_id": "65b0f1234567890abcdef123",
    "key": "splash_notice",
    "title": "重要维护升级通知",
    "content": "我们将于今晚 02:00 进行云服务升级维护，预计耗时 1 小时。",
    "type": "announcement",
    "priority": "high",
    "isPopup": true,
    "actionUrl": "https://example.com/notice/1",
    "actionText": "查看详情"
  },
  "data": [
    {
      "_id": "65b0f1234567890abcdef123",
      "key": "splash_notice",
      "title": "重要维护升级通知",
      "content": "我们将于今晚 02:00 进行云服务升级维护...",
      "type": "announcement",
      "isRead": false,
      "publishAt": "2026-11-24T08:00:00.000Z"
    }
  ]
}`;

  const kotlinSdkCode = `package com.example.app.message

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

data class AppMessage(
    val id: String,
    val key: String = "",
    val title: String,
    val content: String,
    val type: String,
    val priority: String,
    val isPopup: Boolean,
    val actionUrl: String,
    val actionText: String,
    val isRead: Boolean
)

object MessageCenterManager {

    private const val HOST = "https://your-domain.com"
    private val client = OkHttpClient()

    /**
     * 按 key 精确拉取单条公告详情 (如 splash_notice, user_agreement 等)
     */
    suspend fun fetchMessageByKey(
        key: String,
        appId: String = "all",
        userId: String = ""
    ): AppMessage? = withContext(Dispatchers.IO) {
        try {
            val url = "$HOST/api/messages/client?key=$key&appId=$appId&userId=$userId"
            val request = Request.Builder().url(url).get().build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext null
            val json = JSONObject(response.body?.string() ?: return@withContext null)
            val data = json.optJSONObject("data") ?: return@withContext null
            AppMessage(
                id = data.optString("_id"),
                key = data.optString("key"),
                title = data.optString("title"),
                content = data.optString("content"),
                type = data.optString("type"),
                priority = data.optString("priority"),
                isPopup = data.optBoolean("isPopup", false),
                actionUrl = data.optString("actionUrl"),
                actionText = data.optString("actionText"),
                isRead = data.optBoolean("isRead", false)
            )
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * 拉取客户端消息列表与启动弹窗
     */
    suspend fun fetchMessages(
        appId: String,
        userId: String,
        versionCode: Int,
        channel: String = "official"
    ): Pair<List<AppMessage>, AppMessage?> = withContext(Dispatchers.IO) {
        try {
            val url = "$HOST/api/messages/client?appId=$appId&userId=$userId&versionCode=$versionCode&channel=$channel"
            val request = Request.Builder().url(url).get().build()
            val response = client.newCall(request).execute()

            if (!response.isSuccessful) return@withContext Pair(emptyList(), null)
            val json = JSONObject(response.body?.string() ?: return@withContext Pair(emptyList(), null))

            val list = mutableListOf<AppMessage>()
            val dataArray = json.optJSONArray("data") ?: JSONArray()
            for (i in 0 until dataArray.length()) {
                val item = dataArray.getJSONObject(i)
                list.add(
                    AppMessage(
                        id = item.optString("_id"),
                        key = item.optString("key"),
                        title = item.optString("title"),
                        content = item.optString("content"),
                        type = item.optString("type"),
                        priority = item.optString("priority"),
                        isPopup = item.optBoolean("isPopup", false),
                        actionUrl = item.optString("actionUrl"),
                        actionText = item.optString("actionText"),
                        isRead = item.optBoolean("isRead", false)
                    )
                )
            }

            var popupMsg: AppMessage? = null
            val popupObj = json.optJSONObject("popupMessage")
            if (popupObj != null) {
                popupMsg = AppMessage(
                    id = popupObj.optString("_id"),
                    key = popupObj.optString("key"),
                    title = popupObj.optString("title"),
                    content = popupObj.optString("content"),
                    type = popupObj.optString("type"),
                    priority = popupObj.optString("priority"),
                    isPopup = true,
                    actionUrl = popupObj.optString("actionUrl"),
                    actionText = popupObj.optString("actionText"),
                    isRead = false
                )
            }

            Pair(list, popupMsg)
        } catch (e: Exception) {
            e.printStackTrace()
            Pair(emptyList(), null)
        }
    }

    /**
     * 标记消息为已读
     */
    suspend fun markAsRead(userId: String, messageId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val bodyJson = JSONObject().apply {
                put("userId", userId)
                put("messageId", messageId)
            }
            val reqBody = bodyJson.toString().toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$HOST/api/messages/read")
                .post(reqBody)
                .build()

            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: Exception) {
            false
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
              <h3 className="text-base font-semibold text-white">Android 消息中心接入指南</h3>
              <p className="text-xs text-slate-400">
                支持系统公告、H5 富文本页面嵌入、启动强弹窗、版本升级引导与已读状态自动同步
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
          {/* Highlight Section: H5 WebView Embed */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-400">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <span>🔥 官方推荐：Android WebView 嵌入 H5 富文本公告页面</span>
                    <span className="rounded bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 border border-emerald-500/30">
                      最新增加
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    零客户端渲染负担，完美呈现标题、列表、代码高亮、表格、点击大图灯箱预览，自适应深浅色模式与 JS 桥接交互
                  </p>
                </div>
              </div>
            </div>

            {/* H5 URL Formats */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span>H5 页面 URL 规范与参数说明：</span>
                <button
                  onClick={() => handleCopy(h5UrlExamples, 10)}
                  className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  {copiedIndex === 10 ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>复制 URL 示例</span>
                </button>
              </div>
              <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-300 overflow-x-auto">
                {h5UrlExamples}
              </pre>

              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-[11px] border border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2">参数</th>
                      <th className="p-2">说明</th>
                      <th className="p-2">示例</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 text-slate-300 font-mono">
                    <tr>
                      <td className="p-2 text-indigo-300">id</td>
                      <td className="p-2 font-sans">公告文档唯一 ObjectId（可直接作为路径 /h5/messages/&#123;id&#125;）</td>
                      <td className="p-2">65b0f123...</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-indigo-300">key</td>
                      <td className="p-2 font-sans">公告自定义英文唯一标识（常用于开屏公告、协议、活动）</td>
                      <td className="p-2">splash_notice</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-indigo-300">userId</td>
                      <td className="p-2 font-sans">客户端当前登录用户 ID（传入后页面打开时自动调用已读上报）</td>
                      <td className="p-2">user_1001</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-indigo-300">theme</td>
                      <td className="p-2 font-sans">强制主题风格：dark (暗黑)、light (浅色)、auto (跟随系统)</td>
                      <td className="p-2">dark</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-indigo-300">hideHeader</td>
                      <td className="p-2 font-sans">是否隐藏 H5 自带的顶部导航条（适合由原生 Toolbar 控制的场景）</td>
                      <td className="p-2">true</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-indigo-300">hideAction</td>
                      <td className="p-2 font-sans">是否隐藏 H5 自带的底部吸底操作按钮</td>
                      <td className="p-2">true</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Android Activity WebView Code */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span>Android WebView 容器集成源码 (AnnouncementActivity.kt)：</span>
                <button
                  onClick={() => handleCopy(webViewActivityCode, 11)}
                  className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  {copiedIndex === 11 ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>复制 Activity 源码</span>
                </button>
              </div>
              <pre className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
                {webViewActivityCode}
              </pre>
            </div>
          </div>

          {/* Step 1: Client Query */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>1. 客户端获取消息列表接口 (HTTP GET)</span>
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
              携带 <code>userId</code> 参数时系统将自动计算每条消息的 <code>isRead</code> 已读状态及当前总未读数 <code>unreadCount</code>。
            </p>
          </div>

          {/* Step 1.1: Query by Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span>1.1 按 Key 精确拉取单条公告详情 (HTTP GET)</span>
              </h4>
              <button
                onClick={() => handleCopy(queryByKeyCurl, 4)}
                className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
              >
                {copiedIndex === 4 ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>复制 cURL</span>
              </button>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-cyan-300 overflow-x-auto">
              {queryByKeyCurl}
            </pre>
          </div>

          {/* Step 2: Mark As Read */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>2. 标记已读接口 (HTTP POST)</span>
              </h4>
              <button
                onClick={() => handleCopy(markReadCurl, 2)}
                className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
              >
                {copiedIndex === 2 ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>复制 cURL</span>
              </button>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-300 overflow-x-auto">
              {markReadCurl}
            </pre>
          </div>

          {/* Step 3: Response Example */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white">3. 消息列表 JSON 返回数据结构示例</h4>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-amber-300 overflow-x-auto max-h-48">
              {jsonResponseExample}
            </pre>
          </div>

          {/* Step 4: Kotlin SDK */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                <Code2 className="h-4 w-4 text-indigo-400" />
                <span>4. 原生网络请求管理器 (MessageCenterManager.kt)</span>
              </h4>
              <button
                onClick={() => handleCopy(kotlinSdkCode, 3)}
                className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
              >
                {copiedIndex === 3 ? (
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
