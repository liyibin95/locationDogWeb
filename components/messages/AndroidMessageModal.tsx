'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Terminal, Code2 } from 'lucide-react';

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
import androidx.appcompat.app.AlertDialog
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

    /**
     * 在 Android Activity 启动时弹窗展示通知
     */
    fun showPopupDialog(activity: Activity, userId: String, message: AppMessage) {
        activity.runOnUiThread {
            val builder = MaterialAlertDialogBuilder(activity)
                .setTitle(message.title)
                .setMessage(message.content)
                .setNegativeButton("我知道了") { dialog, _ ->
                    dialog.dismiss()
                }

            if (message.actionUrl.isNotEmpty()) {
                val btnText = if (message.actionText.isNotEmpty()) message.actionText else "前往查看"
                builder.setPositiveButton(btnText) { _, _ ->
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(message.actionUrl))
                    activity.startActivity(intent)
                }
            }

            builder.setOnDismissListener {
                // 弹窗关闭后自动标记为已读
                kotlinx.coroutines.GlobalScope.launch(Dispatchers.IO) {
                    markAsRead(userId, message.id)
                }
            }

            builder.show()
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
                支持系统公告、启动强弹窗、版本升级引导与已读状态自动同步
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
          {/* Step 1: Client Query */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>1. 客户端获取消息接口 (HTTP GET)</span>
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
                <span>1.1 按 Key 精确拉取公告详情 (如 splash_notice, user_agreement)</span>
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
            <p className="text-[11px] text-slate-400">
              适用于开屏弹窗、用户协议、隐私政策等需要通过固定 Key 精确获取单篇公告并渲染的业务场景。
            </p>
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
            <h4 className="text-xs font-semibold text-white">3. 返回数据结构示例</h4>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-amber-300 overflow-x-auto max-h-48">
              {jsonResponseExample}
            </pre>
          </div>

          {/* Step 4: Kotlin SDK */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                <Code2 className="h-4 w-4 text-indigo-400" />
                <span>4. Android Kotlin 完整集成代码 (MessageCenterManager.kt)</span>
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

          {/* Step 5: Android Markdown Rich Text Rendering */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
            <h4 className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-300">
              <Smartphone className="h-4 w-4 text-indigo-400" />
              <span>5. Android 端渲染 Markdown 富文本公告指南</span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              系统公告与消息正文已全面支持 Markdown 语法（标题、粗体、列表、引用、表格等）。Android 端推荐以下方案极简接入：
            </p>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                <span className="text-slate-400 block mb-1">// 方案 A: 经典 View / Material Dialog (依赖 io.noties.markwon:core:4.6.2)</span>
                <span className="text-indigo-300 block">val markwon = Markwon.create(context)</span>
                <span className="text-indigo-300 block">val messageTextView = dialogView.findViewById&lt;TextView&gt;(R.id.tv_message)</span>
                <span className="text-indigo-300 block">markwon.setMarkdown(messageTextView, message.content)</span>
              </div>
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                <span className="text-slate-400 block mb-1">// 方案 B: Jetpack Compose (依赖 dev.jeziellago:compose-markdown:0.5.6)</span>
                <span className="text-indigo-300 block">MarkdownText(</span>
                <span className="text-indigo-300 block">    markdown = message.content,</span>
                <span className="text-indigo-300 block">    color = MaterialTheme.colorScheme.onSurface</span>
                <span className="text-indigo-300 block">)</span>
              </div>
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
