'use client';

import React, { useState } from 'react';
import { Check, Copy, Database, ShieldCheck, Terminal, X, Smartphone } from 'lucide-react';

interface ApiDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
}

export const ApiDocModal: React.FC<ApiDocModalProps> = ({
  isOpen,
  onClose,
  apiKey,
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'apps' | 'configs' | 'messages' | 'curl' | 'js' | 'python' | 'vercel'>('android');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentKey = apiKey || 'next-log-secret-key-2026';

  const snippets = {
    android: `// ==========================================
// Android (Kotlin) 统一调用指南
// ==========================================

// 1. 配置中心 (Remote Config): 启动时拉取配置并生效
val configUrl = "http://localhost:3000/api/configs/client?appId=com.example.app&env=prod&versionCode=101&channel=googleplay"
// 返回直接解析好的键值对 JSON:
// { "success": true, "configs": { "feature_dark_mode": true, "max_retry": 3, "api_host": "..." } }

// 2. 消息与公告中心 (Message Center): 拉取最新通知与启动弹窗
val messageUrl = "http://localhost:3000/api/messages/client?appId=com.example.app&userId=user_1001&versionCode=101"
// 返回消息列表及启动弹窗 popupMessage:
// { "success": true, "unreadCount": 1, "popupMessage": { "title": "升级通知", ... }, "data": [...] }

// 3. 消息标记已读 (HTTP POST):
// URL: http://localhost:3000/api/messages/read
// Body: { "userId": "user_1001", "messageId": "65b0f..." }

// 4. 版本更新检测 (App Update Check):
// URL: http://localhost:3000/api/apps/check-update?appId=default&versionCode=100
// 返回: { "success": true, "hasUpdate": true, "forceUpdate": false, "latestVersion": { "downloadUrl": "...", ... } }

// 5. 日志中心上报 (Log Center HTTP POST):
// URL: http://localhost:3000/api/logs
// Header: x-api-key: ${currentKey}
// Body: { "level": "info", "service": "android-app", "message": "应用冷启动完成", "details": { "device": "Pixel 7" } }`,

    apps: `# ==========================================
# App 版本管理与更新检测 API
# ==========================================

# 1. Android 客户端查询版本更新 (GET)
curl "http://localhost:3000/api/apps/check-update?appId=default&versionCode=100&versionName=1.0.0"

# 2. Android 客户端查询版本更新 (POST)
curl -X POST "http://localhost:3000/api/apps/check-update" \\
  -H "Content-Type: application/json" \\
  -d '{
    "appId": "default",
    "versionCode": 100,
    "versionName": "1.0.0",
    "channel": "official"
  }'

# 3. 安装包下载与累计计数
curl -L "http://localhost:3000/api/apps/download/<VERSION_ID>"

# 4. 发布新版本 (需携带管理凭证)
curl -X POST "http://localhost:3000/api/apps/versions" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${currentKey}" \\
  -d '{
    "appId": "default",
    "appName": "NextLog Android",
    "versionName": "1.2.0",
    "versionCode": 10200,
    "downloadUrl": "https://example.com/app-v1.2.0.apk",
    "changelog": "1. 优化体验\\n2. 修复闪退",
    "forceUpdate": false,
    "status": "published"
  }'`,

    configs: `# ==========================================
# 配置中心 (Remote Config) API 接口
# ==========================================

# 1. Android 客户端拉取配置 (公开接口，按包名/环境/版本号智能合并)
curl "http://localhost:3000/api/configs/client?appId=com.example.app&env=prod&versionCode=101&channel=googleplay"

# 2. 管理员查询配置列表 (带分页与搜索)
curl "http://localhost:3000/api/configs?group=network&page=1&limit=20"

# 3. 创建新配置项 (需鉴权)
curl -X POST "http://localhost:3000/api/configs" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${currentKey}" \\
  -d '{
    "key": "feature_new_ui",
    "description": "控制新首页UI灰度",
    "type": "boolean",
    "value": "true",
    "group": "feature_toggle",
    "appId": "com.example.app",
    "environment": "prod",
    "isEnabled": true
  }'

# 4. 更新配置项 (需鉴权)
curl -X PUT "http://localhost:3000/api/configs" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${currentKey}" \\
  -d '{
    "_id": "<CONFIG_ID>",
    "value": "false",
    "isEnabled": false
  }'`,

    messages: `# ==========================================
# 消息中心 (Message Center) API 接口
# ==========================================

# 1. Android 客户端获取未读消息与启动弹窗
curl "http://localhost:3000/api/messages/client?appId=com.example.app&userId=user_888&versionCode=105&channel=official"

# 2. 客户端标记消息为已读
curl -X POST "http://localhost:3000/api/messages/read" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "user_888",
    "messageId": "<MESSAGE_ID>"
  }'

# 3. 创建/发布新公告或更新提示 (需鉴权)
curl -X POST "http://localhost:3000/api/messages" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${currentKey}" \\
  -d '{
    "title": "版本更新提示 v2.5.0",
    "content": "全新暗黑模式与流畅动画现已上线！",
    "type": "upgrade",
    "priority": "high",
    "targetType": "all",
    "appId": "com.example.app",
    "isPopup": true,
    "actionUrl": "https://example.com/download/app.apk",
    "actionText": "立即升级",
    "status": "published"
  }'`,

    curl: `# 1. 新增日志（需携带 x-api-key 或 Authorization 进行鉴权）
curl -X POST "http://localhost:3000/api/logs" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${currentKey}" \\
  -d '{
    "level": "info",
    "service": "order-service",
    "message": "用户创建订单成功",
    "tags": ["order", "payment"],
    "details": {
      "orderId": "ORD-2026-9901",
      "amount": 299.9,
      "currency": "CNY"
    }
  }'

# 2. 查询日志（支持按级别、服务、关键词和时间过滤）
curl "http://localhost:3000/api/logs?level=error&search=订单&page=1&limit=20"

# 3. 删除单条日志（需鉴权）
curl -X DELETE "http://localhost:3000/api/logs?id=<LOG_ID>" \\
  -H "x-api-key: ${currentKey}"`,

    js: `// Node.js / Browser (Fetch API)
async function sendLog() {
  const response = await fetch('/api/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${currentKey}',
    },
    body: JSON.stringify({
      level: 'error',
      service: 'payment-gateway',
      message: '第三方支付回调超时',
      tags: ['payment', 'timeout'],
      details: {
        gateway: 'wechat_pay',
        retryCount: 3
      }
    })
  });

  const result = await response.json();
  console.log('Log result:', result);
}`,

    python: `import requests

# 发送日志到 NextLog (带鉴权)
url = "http://localhost:3000/api/logs"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${currentKey}"
}
payload = {
    "level": "warn",
    "service": "cron-worker",
    "message": "定时任务执行耗时超过阈值",
    "tags": ["cron", "performance"],
    "details": {
        "jobName": "cleanup_temp_files",
        "durationSeconds": 45.2
    }
}

response = requests.post(url, json=payload, headers=headers)
print("Status:", response.status_code)
print("Response:", response.json())`,

    vercel: `# Vercel MongoDB 配置指南：

1. 在 Vercel 控制台（vercel.com）进入你的项目。
2. 点击顶部导航栏的 "Storage" 或 "Integrations"。
3. 选择 "MongoDB Atlas"（Vercel 官方集成的 MongoDB 数据库）。
4. 点击 "Connect" 将其与项目绑定，Vercel 会自动为项目注入环境变量：
   - MONGODB_URI: mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/next_log?retryWrites=true&w=majority
5. 在 Vercel 项目的 "Settings" -> "Environment Variables" 中添加：
   - LOG_API_KEY: 设置你的接口鉴权密钥（例如：${currentKey}）
6. 点击重新部署 (Redeploy)，项目即可在 Vercel 无服务器环境中稳定运行！`
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">API 调用与 Android 对接说明</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start space-x-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
            <Smartphone className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-400">Android App 专属支持</span>
              <p className="mt-0.5 text-slate-400">
                配置中心支持按应用包名、环境及版本号动态下发；消息中心支持启动弹窗与已读状态。
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-400">接口鉴权与安全防护</span>
              <p className="mt-0.5 text-slate-400">
                写接口强制校验 <code className="text-white">x-api-key</code> 或 Session 会话，读接口专为移动端低延迟缓存设计。
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex items-center justify-between border-b border-slate-800 overflow-x-auto">
          <div className="flex space-x-1">
            {[
              { id: 'android', label: 'Android 对接' },
              { id: 'apps', label: '版本管理 API' },
              { id: 'configs', label: '配置中心 API' },
              { id: 'messages', label: '消息中心 API' },
              { id: 'curl', label: '日志 cURL' },
              { id: 'js', label: 'JS / TS' },
              { id: 'python', label: 'Python' },
              { id: 'vercel', label: 'Vercel 部署' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => copyToClipboard(snippets[activeTab])}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white pb-2 whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">已复制</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>复制代码</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content */}
        <div className="mt-3">
          <pre className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-indigo-300">
            {snippets[activeTab]}
          </pre>
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
