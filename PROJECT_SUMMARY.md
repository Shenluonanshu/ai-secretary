# 知行 AI 秘书 — 项目全景总结

> 最后更新：2026-07-28 · 当前阶段：**阶段一已完成 ✅** | [升级方案](./.claude/plans/abstract-bouncing-stallman.md)

---

## 一、项目概览

| 项目 | 详情 |
|------|------|
| **名称** | 知行 AI 秘书（ZhiXing AI Secretary） |
| **类型** | Next.js 15 PWA（渐进式 Web 应用） |
| **用途** | 个人日程管理 — 自然语言创建事件、语音录入、智能提醒、旅行规划 |
| **Git 仓库** | 分支 `master` |

---

## 二、技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | Next.js (App Router) | 15.3 |
| **UI 库** | React | 19 |
| **语言** | TypeScript | 5.8 |
| **CSS** | 全局 CSS（手动编写，内联样式 + CSS 自定义属性） | — |
| **本地数据库** | SQLite (Prisma ORM) | Prisma 6 |
| **云数据库** | Cloudflare D1 | — |
| **运行时** | Edge Runtime（所有 API 路由） | — |
| **PWA** | Service Worker + Web App Manifest | manifest v3 |
| **语音识别** | Web Speech API / OpenAI Whisper | — |
| **推送通知** | Web Push API + VAPID | web-push 3.6 |
| **认证** | JWT (HMAC-SHA256, Web Crypto API) | jose 6.2 |
| **AI 解析** | 规则引擎 + 可选 OpenAI GPT-4o-mini | openai 6.49 |

---

## 三、部署架构

### 三套部署方案并存：

| 平台 | 状态 | 地址 | 数据库 |
|------|------|------|--------|
| **Vercel** | ✅ 已部署 | `ai-secretary-bice.vercel.app` | SQLite (Prisma) |
| **Cloudflare Pages** | ✅ 已部署 | `9002365b.ai-secretary-1o5.pages.dev` | D1 (`ai-secretary-db`) |
| **自定义域名** | ⚠️ DNS 等待中 | `nanshu.secretary.top` | — |

### 双模式运行时切换

代码通过 `onCloudflare()` 检测运行环境（`lib/cf.ts`），自动切换数据层：
- **非 CF 环境** → `lib/db.ts` + `lib/events-service.ts`（Prisma + SQLite）
- **CF 环境** → `lib/d1-client.ts` + `lib/events-d1.ts`（D1 原生绑定）

Cloudflare Pages 还有备用的 Functions 入口（`functions/api/*.ts`），当 Next.js App Router 路由不工作时作为兜底。

---

## 四、数据库设计

### Event 表（日程事件）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `title` | TEXT | 事件标题 |
| `description` | TEXT? | 备注 |
| `startsAt` | DATETIME | 开始时间 |
| `endsAt` | DATETIME | 结束时间 |
| `allDay` | BOOLEAN | 全天事件 |
| `timezone` | TEXT | 时区（默认 Asia/Shanghai） |
| `reminders` | JSON TEXT | 提醒分钟数组，如 `[30, 60]` |
| `recurrence` | TEXT | 重复：none/daily/weekly/monthly |
| `source` | TEXT | 来源：manual/text/voice/trip |
| `createdAt` | DATETIME | 创建时间 |

### PushSubscription 表（推送订阅）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (UUID) | 主键 |
| `endpoint` | TEXT (UNIQUE) | 浏览器推送端点 |
| `keys` | JSON TEXT | p256dh + auth 密钥对 |

---

## 五、API 路由一览（7 个）

| 路由 | 方法 | 功能 |
|------|------|------|
| `POST /api/auth` | POST | 密码验证 → 返回 JWT（30天有效） |
| `/api/events` | GET/POST/PUT/DELETE | 事件增删改查 + 时间冲突检测 |
| `POST /api/parse` | POST | 自然语言 → 结构化事件（AI/规则） |
| `POST /api/trip` | POST | 旅行行程草案生成（基于日期循环） |
| `POST /api/transcribe` | POST | 音频上传 → Whisper 转写 |
| `/api/push/subscribe` | POST/DELETE | 注册/取消 Web Push 订阅 |
| `GET /api/push/check` | GET | 获取 VAPID 公钥 / 提醒状态 |

---

## 六、核心功能模块

### 1. 自然语言事件解析（`lib/llm/`）

采用**策略模式**，通过环境变量 `LLM_PROVIDER` 切换：

- **rule-based**（默认）：纯本地正则引擎，零延迟，支持中文日期/时间表达
  - 今天/明天/后天、X月X日、下周X
  - 上午/下午/晚上/中午 + 数字/中文数字时间
  - 全天事件、每天/每周/每月重复
- **openai**：调用 GPT-4o-mini（兼容 OpenAI API），通过 System Prompt 约束 JSON 输出

### 2. 语音录入（`lib/speech/`）

两种提供者，通过 localStorage 切换：

- **WebSpeech**（默认）：浏览器内置语音识别 API，离线可用，支持中文
- **Whisper**：录音 → 上传 `/api/transcribe` → OpenAI Whisper API 转写

### 3. 智能提醒（`hooks/useNotifications.ts`）

纯客户端实现：
- 读取每个事件的所有 `reminders[]` 分钟值
- 为每个提醒设置 `setTimeout`
- 通过浏览器 Notification API 弹出系统通知
- 组件卸载时自动清理所有定时器

### 4. Web Push 通知（`lib/push.ts` + `components/PushManager.tsx`）

- Service Worker (`sw.js`) 监听 `push` 事件，弹出带操作按钮的通知
- `PushManager` 组件在后台自动订阅、向服务器注册
- 支持通知点击 → 聚焦 / 打开应用窗口
- **注意**：服务端推送（`web-push` 库）需要 Node.js 运行时，Edge Runtime 不支持，当前仅客户端 `setTimeout` 提醒在生产环境生效

### 5. 空闲时间检测（`hooks/useFreeSlots.ts`）

- 选择日期后，扫描当天 9:00-18:00 内已占用时段
- 找出 ≥30 分钟的空闲间隙，展示可安排时间段
- 点击空闲时段可直接创建"专注时间"事件

### 6. 旅行行程规划（`TripPlanner` 组件）

- 输入目的地、日期范围、偏好
- POST `/api/trip` → 按天生成上午/下午两个时段草案
- 可勾选/取消每个时段
- 一键导入选中的行程到日历

### 7. PWA 安装引导（`InstallPrompt` 组件）

- Android/Chrome：捕获 `beforeinstallprompt` 事件，弹出安装按钮
- iOS/Safari：检测后显示"分享→添加到主屏幕"引导
- 已安装后自动隐藏

---

## 七、前端组件树

```
RootLayout (layout.tsx)
├── AuthGuard (路由守卫，未登录重定向到 /login)
│   └── SpeechProvider (语音上下文)
│       ├── Sidebar (桌面侧边导航)
│       ├── Main Content (page.tsx)
│       │   ├── Header (导出数据 / 开启提醒)
│       │   ├── MetricsPanel (今日事件数 / 7天事件数 / 今日空闲时间)
│       │   ├── Workspace
│       │   │   ├── Main Column
│       │   │   │   ├── AIAssistant (AI 录入 + 语音按钮)
│       │   │   │   ├── EventForm (手动创建/编辑表单)
│       │   │   │   └── EventList (日程列表 + 搜索 + 过滤)
│       │   │   └── Right Column
│       │   │       ├── FreeSlotsPanel (空闲时间)
│       │   │       └── TripPlanner (旅行规划)
│       │   ├── Toast (全局提示)
│       │   ├── PushManager (静默推送订阅)
│       │   ├── BottomNav (底部导航栏)
│       │   └── InstallPrompt (PWA 安装引导)
│       └── LoginPage (登录页)
```

---

## 八、认证机制

- **方式**：密码（passphrase）→ JWT
- **存储**：`localStorage.auth_token`
- **加密**：HMAC-SHA256，Web Crypto API（Edge 兼容）
- **有效期**：30 天
- **守卫**：`AuthGuard` 组件 + `authFetch()` 自动附带 `Authorization: Bearer` 头
- **默认密码**：`admin`（`wrangler.toml` / `.env.local` 中配置）

---

## 九、已知待办 / 问题

| 项目 | 状态 | 详情 |
|------|------|------|
| 自定义域名 | ⚠️ 等待 .top 注册局 NS 委派 | Cloudflare 面板显示已保护，DNS 层尚未生效 |
| 服务端推送 | ⚠️ Edge Runtime 限制 | `web-push` 依赖 Node crypto，CF 上不可用；当前仅客户端 setTimeout 提醒 |
| API 路由无认证检查 | ⚠️ 待加固 | 当前 `POST/PUT/DELETE /api/events` 路由未校验 JWT |
| LLM 默认规则引擎 | ℹ️ 设计选择 | 生产环境设为 `rule-based`，可切换 OpenAI |
| 重复事件展开 | ❌ 未实现 | recurrence 字段存在但前端未展开重复实例 |

---

## 十、开发命令速查

```bash
npm run dev              # 本地开发
npm run build            # 标准构建
npm run cf:build         # Cloudflare Pages 构建
npm run cf:deploy        # 构建 + 部署到 CF Pages
npm run cf:db:migrate    # 执行 D1 迁移
npm run db:push          # Prisma 同步 SQLite 表结构
npm run db:migrate       # JSON → 数据库迁移
npm run check            # TypeScript 类型检查
```

---

## 十一、架构决策要点

- **Edge-first 设计**：所有 API 路由使用 `runtime = "edge"`，避免 Node.js 依赖
- **双部署兼容**：同一套代码可部署到 Vercel（Serverless）和 Cloudflare Pages（Pages Functions + D1）
- **无外部认证库**：自定义 JWT，仅用 Web Crypto API，确保 Edge 兼容
- **工厂/策略模式**：LLM 解析和语音识别均采用可插拔提供者模式，通过环境变量运行时切换
- **SQLite + D1 双数据库**：Prisma 用于本地开发，D1 原生 SQL 用于 Cloudflare，通过 `onCloudflare()` 自动检测
- **单 CSS 文件**：所有样式集中在一个 globals.css 中（约 300 行），使用 CSS 自定义属性实现主题化
- **紧凑代码组织**：16 个 lib 源文件、13 个组件、7 个 API 路由、3 个 hooks
