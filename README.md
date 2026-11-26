# NextLog - 基于 Next.js 与 MongoDB 的分布式日志服务

一个轻量、高性能、开箱即用的分布式日志系统，基于 **Next.js 14 (App Router)**、**TypeScript**、**Tailwind CSS** 与 **MongoDB (支持 Vercel 官方 MongoDB 集成)** 构建。

---

## 🌟 核心特性

- 🛡️ **页面访问密码防护**：前端日志管理看板支持访问密码拦截（中间件 + 安全 HttpOnly Cookie 会话），未授权无法访问控制台。
- 🔍 **多维度日志查询**：支持按**日志级别**（INFO / WARN / ERROR / DEBUG）、**服务名称**（Service）、**全文关键词**、**时间跨度**（今天、近7天、近30天、自定义范围）及**分页查询**。
- 🔐 **严格的接口鉴权**：新增日志接口（`POST /api/logs`）强制校验客户端携带的 `x-api-key` 或 `Authorization: Bearer <KEY>`，拒绝未授权请求（返回 HTTP 401）。
- 🗄️ **Vercel MongoDB 深度适配**：完美适配 Vercel Storage / Marketplace 集成的 MongoDB Atlas，在 Serverless 环境下复用连接池，并自动维护 `createdAt`、`level`、`service`、`message` 复合索引。
- 📊 **可视化统计看板**：内置各级别日志数量聚合、活跃服务统计与健康状态监控。
- 💻 **多语言 SDK / cURL 适配**：支持 cURL、JavaScript/TypeScript、Python 等主流语言快速对接采集。

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

修改 `.env.local` 中的配置：

```env
# MongoDB 连接字符串 (本地或 MongoDB Atlas)
# 格式: mongodb+srv://<用户名>:<密码>@<集群地址>/<数据库名>?retryWrites=true&w=majority
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/next_log?retryWrites=true&w=majority
MONGODB_DB=next_log

# 接口鉴权密钥 (可设置多个，用英文逗号分隔)
LOG_API_KEY=next-log-secret-key-2026

# 页面访问密码 (默认密码: admin123)
PAGE_PASSWORD=admin123
PAGE_AUTH_SECRET=next-log-session-secret-2026
```

### 3. 启动本地开发服务

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可查看日志管理后台。

---

## ☁️ Vercel 一键部署与 MongoDB 配置

### 步骤一：创建项目并绑定 MongoDB
1. 将本项目推送到 GitHub / GitLab。
2. 登录 [Vercel 控制台](https://vercel.com)，点击 **Add New...** -> **Project** 导入本项目。
3. 在项目页面点击顶部 **Storage** 标签，选择 **MongoDB Atlas** 点击 **Connect**（或已有集群点击链接），Vercel 会自动为项目注入环境变量 `MONGODB_URI`。

### 步骤二：配置鉴权密钥
1. 在 Vercel 项目的 **Settings** -> **Environment Variables** 中添加：
   - `LOG_API_KEY`: 自定义你的私密 API 鉴权密钥（例如 `my-super-secret-log-key-2026`）。
   - `MONGODB_DB`: 可选，默认为 `next_log`。
2. 点击 **Deploy** 完成部署。

---

## 📖 API 接口文档

### 1. 新增日志 (`POST /api/logs`)

> ⚠️ **鉴权要求**：该接口受鉴权保护。必须在请求头中携带有效密钥。

#### 请求头 (Headers)
| 头部字段 | 必填 | 示例 / 说明 |
| :--- | :---: | :--- |
| `Content-Type` | 是 | `application/json` |
| `x-api-key` | 二选一 | `next-log-secret-key-2026` |
| `Authorization` | 二选一 | `Bearer next-log-secret-key-2026` |

#### 请求体 (Body JSON)
| 字段名 | 类型 | 必填 | 说明 |
| :--- | :---: | :---: | :--- |
| `level` | string | 是 | 日志级别：`info`、`warn`、`error`、`debug` |
| `message` | string | 是 | 日志正文/概要描述 |
| `service` | string | 否 | 业务服务标识，如 `auth-service`、`payment`（默认: `default`） |
| `tags` | string[] | 否 | 标签数组，例如 `["payment", "alipay"]` |
| `details` | object | 否 | 任意自定义 JSON 结构化上下文（请求参数、堆栈等） |

#### cURL 示例
```bash
curl -X POST "https://your-domain.vercel.app/api/logs" \
  -H "Content-Type: application/json" \
  -H "x-api-key: next-log-secret-key-2026" \
  -d '{
    "level": "error",
    "service": "payment-service",
    "message": "支付网关扣款失败",
    "tags": ["payment", "failure"],
    "details": {
      "orderId": "ORD-20260321-001",
      "amount": 199.00,
      "errorCode": "INSUFFICIENT_FUNDS"
    }
  }'
```

#### 鉴权失败响应 (HTTP 401)
```json
{
  "success": false,
  "error": "缺少鉴权凭证：请在请求头中携带 x-api-key 或 Authorization: Bearer <API_KEY>"
}
```

#### 成功响应 (HTTP 201)
```json
{
  "success": true,
  "message": "日志记录成功",
  "data": {
    "_id": "664c1234567890abcdef1234",
    "level": "error",
    "message": "支付网关扣款失败",
    "service": "payment-service",
    "tags": ["payment", "failure"],
    "details": { "orderId": "ORD-20260321-001", "amount": 199.00 },
    "ip": "127.0.0.1",
    "userAgent": "curl/7.88.1",
    "createdAt": "2026-11-23T13:00:00.000Z"
  }
}
```

---

### 2. 查询日志 (`GET /api/logs`)

#### 查询参数 (Query Parameters)
| 参数名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `page` | number | 当前页码，默认 `1` |
| `limit` | number | 每页数量，默认 `20`，上限 `100` |
| `level` | string | 过滤级别：`all`、`info`、`warn`、`error`、`debug` |
| `service` | string | 按所属服务精确筛选 |
| `search` | string | 关键词模糊搜索（匹配 `message` 或 `service`） |
| `startDate`| string | 起始时间 (格式如: `2026-11-01`) |
| `endDate` | string | 截止时间 (格式如: `2026-11-23`) |

#### cURL 示例
```bash
curl "https://your-domain.vercel.app/api/logs?level=error&search=支付&page=1&limit=20"
```

#### 成功响应 (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "664c1234567890abcdef1234",
      "level": "error",
      "message": "支付网关扣款失败",
      "service": "payment-service",
      "tags": ["payment", "failure"],
      "details": { "orderId": "ORD-20260321-001" },
      "ip": "1.2.3.4",
      "userAgent": "Mozilla/5.0 ...",
      "createdAt": "2026-11-23T13:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 3. 删除日志 (`DELETE /api/logs`)

> ⚠️ **鉴权要求**：该接口受鉴权保护。支持页面登录 Cookie 或在请求头中携带 API Key。

#### 单条删除 (Query)
```bash
curl -X DELETE "https://your-domain.vercel.app/api/logs?id=664c1234567890abcdef1234" \
  -H "x-api-key: next-log-secret-key-2026"
```

#### 批量删除 (Body)
```bash
curl -X DELETE "https://your-domain.vercel.app/api/logs" \
  -H "Content-Type: application/json" \
  -H "x-api-key: next-log-secret-key-2026" \
  -d '{
    "ids": ["664c1234567890abcdef1234", "664c5678901234abcdef5678"]
  }'
```

#### 成功响应 (HTTP 200)
```json
{
  "success": true,
  "message": "成功删除 2 条日志",
  "deletedCount": 2
}
```

---

### 4. 获取统计概览 (`GET /api/logs/stats`)

返回总条数、各级别分布以及活跃服务统计。

---

## ⚙️ 配置中心 (Remote Config - 专为 Android App 打造)

面向 Android 应用的动态配置下发与功能开关 (Feature Flags) 服务。支持按**包名 (`appId`)**、**环境 (`prod`/`beta`/`dev`)**、**渠道 (`channel`)** 及**版本号区间 (`minVersionCode`/`maxVersionCode`)** 精细化灰度与生效。

### 1. Android 客户端拉取配置 (`GET /api/configs/client`)

客户端启动或后台轮询时调用，自动按特定包名、环境与版本优先级智能合并并直接返回类型转换后的键值对。

```bash
curl "https://your-domain.vercel.app/api/configs/client?appId=com.example.app&env=prod&versionCode=102&channel=googleplay"
```

#### 客户端响应数据 (JSON)
```json
{
  "success": true,
  "appId": "com.example.app",
  "environment": "prod",
  "configs": {
    "network_base_url": "https://api.example.com",
    "feature_dark_mode": true,
    "max_retry_times": 3,
    "upgrade_policy": {
      "minSupportedVersion": 100,
      "latestVersion": 105,
      "forceUpdate": false
    }
  },
  "version": 1732435200000,
  "count": 4
}
```

### 2. 配置管理接口 (CRUD)

- `GET /api/configs`: 管理员查询配置列表（支持按关键词、分组、应用包名、环境筛选和分页）
- `POST /api/configs`: 创建新配置（需鉴权）
- `PUT /api/configs`: 更新配置内容或一键启/停用（需鉴权）
- `DELETE /api/configs?id=<ID>`: 删除指定配置（需鉴权）

---

## 📬 消息中心 (Message Center - 专为 Android App 打造)

面向 Android 应用统一发布**系统维护公告 (Announcement)**、**通知消息 (Notification)**、**版本升级提示 (Upgrade)** 及**紧急告警 (Alert)**，支持启动强弹窗浮层以及精准的已读/未读状态追踪。

### 1. Android 客户端获取消息 (`GET /api/messages/client`)

```bash
curl "https://your-domain.vercel.app/api/messages/client?appId=com.example.app&userId=user_1001&versionCode=102&channel=official"
```

#### 客户端响应数据 (JSON)
```json
{
  "success": true,
  "unreadCount": 1,
  "popupMessage": {
    "_id": "6743210abcdef12345678901",
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
      "_id": "6743210abcdef12345678901",
      "title": "重要维护升级通知",
      "content": "我们将于今晚 02:00 进行云服务升级维护...",
      "type": "announcement",
      "priority": "high",
      "isPopup": true,
      "actionUrl": "https://example.com/notice/1",
      "actionText": "查看详情",
      "isRead": false,
      "publishAt": "2026-11-24T08:00:00.000Z"
    }
  ]
}
```

### 2. 标记消息为已读 (`POST /api/messages/read`)

```bash
curl -X POST "https://your-domain.vercel.app/api/messages/read" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_1001",
    "messageId": "6743210abcdef12345678901"
  }'
```

### 3. 消息管理接口 (CRUD) 与 Markdown 富文本

- `GET /api/messages`: 管理员查询消息列表（支持按类型、优先级、状态筛选和分页）
- `POST /api/messages`: 新建/发布消息或公告（需鉴权）
- `PUT /api/messages`: 编辑消息正文、跳转动作或切换草稿/发布状态（需鉴权）
- `DELETE /api/messages?id=<ID>`: 删除消息（需鉴权）
- `POST /api/upload`: 上传大于 64KB 图片至 **Vercel Blob Store**，返回全球加速 CDN URL

#### 🖼️ 富文本图片双轨存储策略
消息公告正文全面支持 Markdown 语法与图片插入（支持直接 `Ctrl+V` 粘贴剪贴板截图、拖拽图片文件或工具栏按钮选择）：
- **小图 (≤ 64 KB)**：自动转为 **Base64 Data URI** 内联嵌入，零额外网络请求、免占用云存储配额。
- **大图 (> 64 KB)**：自动异步上传至 **Vercel Blob Store** 并以 CDN 链接插入；如未配置 Vercel Blob Token，可一键降级为 Base64 嵌入，保障业务不中断。

---

### 4. App 版本管理与客户端更新检测

#### ① Android 客户端检查更新 (`GET /api/apps/check-update`)
- **请求参数**：
  - `appId`: 应用包名或标识（默认 `default`，例如 `com.example.app`）
  - `versionCode`: 客户端当前安装的版本号（整数，例如 `100`）
  - `versionName`: 客户端当前版本名（例如 `1.0.0`，可选）
  - `channel`: 发布渠道（例如 `official`、`googleplay`，可选）
- **返回响应**：
  - `hasUpdate`: 是否存在新版本（当 `最新 versionCode > 当前 versionCode` 时为 `true`）
  - `forceUpdate`: 是否需要强制更新（最新版本标记为强制更新，或当前客户端版本低于 `minVersionCode` 时自动触发强更）
  - `latestVersion`: 包含最新版本的版本名、版本号、APK 下载链接 (`downloadUrl`)、自动累计计数的下载链接 (`trackDownloadUrl`)、文件大小、MD5 完整性哈希与更新日志 (`changelog`)。

#### ② Android 安装包上传 (`POST /api/apps/upload`)
- 支持直接上传打包好的 `.apk` 安装包文件，服务端自动提取文件名、计算文件大小及 MD5 / SHA-256 哈希值，优先分发至 Vercel Blob 云存储或本地静态服务目录。

#### ③ 安装包下载并统计 (`GET /api/apps/download/[id]`)
- 自动递增该版本的 `downloadCount` 下载量计数器，并安全 302 重定向至实际安装包地址。

#### ④ 管理后台版本 CRUD (`/api/apps/versions`)
- 支持全生命周期版本发布、草稿、下线归档，强制升级策略配置，渠道灰度控制及历史下载报表。

---

## 🛠️ 项目目录结构

```
next-log/
├── app/
│   ├── api/
│   │   ├── auth/             # 页面登录/鉴权接口
│   │   ├── logs/             # 日志相关接口 (采集、查询、统计)
│   │   ├── configs/          # 配置中心接口 (管理 CRUD、统计)
│   │   │   └── client/       # Android 客户端专用配置同步接口
│   │   ├── upload/           # 图片上传接口 (Vercel Blob 集成)
│   │   ├── apps/             # App 版本管理接口 (发布、统计)
│   │   │   ├── check-update/ # Android 客户端版本检测与更新接口
│   │   │   ├── download/     # 安装包下载与累加计数接口
│   │   │   └── upload/       # APK 安装包上传接口
│   │   └── messages/         # 消息中心接口 (管理 CRUD、统计)
│   │       ├── client/       # Android 客户端专用拉取消息与弹窗接口
│   │       └── read/         # 客户端标记消息已读接口
│   ├── configs/              # 配置中心前端管理看板
│   ├── messages/             # 消息中心前端管理看板
│   │   └── create/           # 消息公告沉浸式 Markdown 编辑与实时双栏预览独立路由
│   ├── apps/                 # App 版本管理前端看板 (APK 上传、版本号与强更控制)
│   ├── devices/              # Android 设备管理看板
│   ├── feedbacks/            # 意见反馈管理看板
│   ├── login/                # 页面登录界面
│   ├── globals.css           # 全局样式与暗黑主题
│   ├── layout.tsx            # 根布局
│   └── page.tsx              # 日志管理控制台主界面
├── components/
│   ├── AdminLayout.tsx       # 后台管理系统主布局 (左侧可收缩菜单 + 顶部快捷栏)
│   ├── MarkdownRenderer.tsx  # 轻量级 Markdown 富文本与图片渲染组件
│   ├── apps/                 # App 版本管理组件 (概览卡片、表格、发布弹窗、Android指南)
│   ├── configs/              # 配置中心组件 (卡片、表格、编辑弹窗、Android指南)
│   ├── messages/             # 消息中心组件 (卡片、表格、真机预览、Android指南)
│   ├── devices/              # 设备管理组件
│   ├── feedbacks/            # 意见反馈组件
│   ├── LogTable.tsx          # 日志表格及详情展示
│   ├── LogFilterBar.tsx      # 日志多维筛选
│   ├── StatsOverview.tsx     # 日志统计看板
│   └── ApiDocModal.tsx       # 全功能统一 API 文档与 Android SDK 演示
├── lib/
│   ├── auth.ts               # 接口鉴权中间件 (API Key 校验)
│   ├── image-uploader.ts     # 图片尺寸判断与 Base64 / Vercel Blob 智能存储策略
│   ├── mongodb.ts            # MongoDB 连接池及日志/配置/消息/设备/版本索引管理
│   └── page-auth.ts          # 页面密码 Cookie 会话保护
├── types/
│   ├── app-version.ts        # App 版本管理 TypeScript 定义
│   ├── log.ts                # 日志相关 TypeScript 定义
│   ├── config.ts             # 配置中心 TypeScript 定义
│   └── message.ts            # 消息中心 TypeScript 定义
├── middleware.ts             # Next.js 路由保护与 API 白名单中间件
├── package.json
└── tailwind.config.ts
```
│   │   └── messages/         # 消息中心接口 (管理 CRUD、统计)
│   │       ├── client/       # Android 客户端专用拉取消息与弹窗接口
│   │       └── read/         # 客户端标记消息已读接口
│   ├── configs/              # 配置中心前端管理看板
│   ├── messages/             # 消息中心前端管理看板
│   ├── login/                # 页面登录界面
│   ├── globals.css           # 全局样式与暗黑主题
│   ├── layout.tsx            # 根布局
│   └── page.tsx              # 日志管理控制台主界面
├── components/
│   ├── Navbar.tsx            # 统一顶部导航栏 (日志 · 配置 · 消息联动)
│   ├── configs/              # 配置中心组件 (卡片、表格、编辑弹窗、Android指南)
│   ├── messages/             # 消息中心组件 (卡片、表格、编辑弹窗、真机预览、Android指南)
│   ├── LogTable.tsx          # 日志表格及详情展示
│   ├── LogFilterBar.tsx      # 日志多维筛选
│   ├── StatsOverview.tsx     # 日志统计看板
│   └── ApiDocModal.tsx       # 全功能统一 API 文档与 Android SDK 演示
├── lib/
│   ├── auth.ts               # 接口鉴权中间件 (API Key 校验)
│   ├── mongodb.ts            # MongoDB 连接池及日志/配置/消息索引管理
│   └── page-auth.ts          # 页面密码 Cookie 会话保护
├── types/
│   ├── log.ts                # 日志相关 TypeScript 定义
│   ├── config.ts             # 配置中心 TypeScript 定义
│   └── message.ts            # 消息中心 TypeScript 定义
├── middleware.ts             # Next.js 路由保护与 API 白名单中间件
├── package.json
└── tailwind.config.ts
```

---

## 🔒 安全建议

1. **生产环境强密钥**：请为 `LOG_API_KEY` 设置高强度随机字符串（如通过 `openssl rand -hex 32` 生成）。
2. **多系统隔离**：支持以逗号分隔配置多个有效 API Key（例如 `LOG_API_KEY=key_service_a,key_service_b`），实现不同调用方的密钥分发与吊销。
3. **网络与白名单**：在 Vercel 中使用 MongoDB Atlas 时，建议在 MongoDB Atlas 控制台的 Network Access 中配置安全 IP 策略。
