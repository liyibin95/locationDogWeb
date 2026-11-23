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

### 3. 获取统计概览 (`GET /api/logs/stats`)

返回总条数、各级别分布以及活跃服务统计。

---

## 🛠️ 项目目录结构

```
next-log/
├── app/
│   ├── api/
│   │   └── logs/
│   │       ├── route.ts          # GET (查询日志) & POST (新增日志，带鉴权)
│   │       └── stats/
│   │           └── route.ts      # GET (统计卡片数据聚合)
│   ├── globals.css               # 全局样式与暗黑主题
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 日志控制台主界面
├── components/
│   ├── Navbar.tsx                # 顶部导航、刷新、API Key 与文档入口
│   ├── StatsOverview.tsx         # 统计卡片组件
│   ├── LogFilterBar.tsx          # 搜索、级别、服务及时间筛选器
│   ├── LogTable.tsx              # 日志数据列表、展开详情及分页
│   ├── CreateLogModal.tsx        # 新增日志与鉴权调试弹窗
│   └── ApiDocModal.tsx           # 接口调用指南与部署说明
├── lib/
│   ├── auth.ts                   # 接口鉴权中间件 (API Key 校验)
│   └── mongodb.ts                # MongoDB 客户端单例与自动索引管理
├── types/
│   └── log.ts                    # TypeScript 类型定义
├── .env.example                  # 环境变量配置模板
├── .env.local                    # 本地环境变量
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔒 安全建议

1. **生产环境强密钥**：请为 `LOG_API_KEY` 设置高强度随机字符串（如通过 `openssl rand -hex 32` 生成）。
2. **多系统隔离**：支持以逗号分隔配置多个有效 API Key（例如 `LOG_API_KEY=key_service_a,key_service_b`），实现不同调用方的密钥分发与吊销。
3. **网络与白名单**：在 Vercel 中使用 MongoDB Atlas 时，建议在 MongoDB Atlas 控制台的 Network Access 中配置安全 IP 策略。
