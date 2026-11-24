'use client';

import React, { useState } from 'react';
import { Check, Copy, Database, ShieldCheck, Terminal, X } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'curl' | 'js' | 'python' | 'vercel'>('curl');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentKey = apiKey || 'your-secret-api-key';

  const snippets = {
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
  -H "x-api-key: ${currentKey}"

# 4. 批量删除日志（需鉴权）
curl -X DELETE "http://localhost:3000/api/logs" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${currentKey}" \\
  -d '{
    "ids": ["<LOG_ID_1>", "<LOG_ID_2>"]
  }'`,

    js: `// Node.js / Browser (Fetch API)
async function sendLog() {
  const response = await fetch('/api/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${currentKey}', // 鉴权 Header
    },
    body: JSON.stringify({
      level: 'error',
      service: 'payment-gateway',
      message: '第三方支付回调超时',
      tags: ['payment', 'timeout'],
      details: {
        gateway: 'wechat_pay',
        retryCount: 3,
        errorStack: 'TimeoutError: Connection timed out after 5000ms'
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
            <h3 className="text-base font-bold text-white">API 调用与部署说明</h3>
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
          <div className="flex items-start space-x-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-400">接口鉴权规范 (Auth)</span>
              <p className="mt-0.5 text-slate-400">
                新增日志要求携带 <code className="text-white">x-api-key</code> 或{' '}
                <code className="text-white">Authorization: Bearer &lt;KEY&gt;</code> 请求头，验证未通过直接拒绝写入并返回 401。
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
            <Database className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-sky-400">Vercel MongoDB 数据库</span>
              <p className="mt-0.5 text-slate-400">
                基于官方 MongoDB 驱动并在 Serverless 环境复用连接池，自动为时间、日志级别及服务建立高效索引。
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex space-x-1">
            {[
              { id: 'curl', label: 'cURL' },
              { id: 'js', label: 'JavaScript' },
              { id: 'python', label: 'Python' },
              { id: 'vercel', label: 'Vercel 部署说明' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-xs font-medium transition border-b-2 ${
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
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white pb-2"
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
