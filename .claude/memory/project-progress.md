---
name: project-progress
description: 知行 AI 秘书 — 阶段一到五全部完成，接入 DeepSeek LLM，已具备生产级品质
metadata:
  type: project
---

## 当前进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段一：对话式 UI | ✅ | 微信式聊天界面，10 组件 |
| 阶段二：全能秘书 | ✅ | 待办/习惯/笔记/简报 |
| 增强：意图识别 | ✅ | 14 意图，正则+LLM 双层 |
| 增强：对话质感 | ✅ | DeepSeek LLM 生成回复 |
| 阶段三：国内适配 | ✅ | 国产浏览器检测+降级 |
| 阶段四：后端增强 | ✅ | Edge Web Push + Worker 定时 |
| 阶段五：工程化完善 | ✅ | 更新/反馈/引导/日志/离线 |
| 阶段六：高级功能 | ⏳ | 日历同步/小程序（远期） |

## 完整能力矩阵

### AI 对话（DeepSeek LLM）
- 回复不固定模板，每次实时生成，有温度有变化
- 配置：OPENAI_BASE_URL=https://api.deepseek.com/v1, LLM_MODEL=deepseek-chat
- 无 LLM 时自动降级模板回复
- 支持：问候/感谢/晚安/闲聊自然对话

### 意图识别（14 种）
创建日程 | 查询日程 | 删除日程 | 创建待办 | 查询待办 | 完成待办 | 创建习惯 | 习惯打卡 | 查询习惯 | 简报 | 空闲时间 | 创建笔记 | 帮助 | 闲聊

### 国内适配
- 浏览器检测：微信/UC/QQ/百度自动识别+降级提示
- 语音不可用 → 提示用系统输入法
- iOS → 添加到主屏幕引导
- DeepSeek API（国内直连）
- 隐私政策 & 用户协议

### 后端增强
- Edge-compatible Web Push（纯 Web Crypto，不依赖 web-push）
- Cloudflare Worker 定时任务（简报+提醒+过期清理）
- 双数据库模式（D1 + Prisma/SQLite）

### 工程化
- PWA 自动更新检测 & 刷新
- 更新日志弹窗（首次看到新版本）
- 反馈按钮（评分+文字）
- 新手引导（3步）
- 全局错误捕获 & 上报 /api/log
- IndexedDB 离线操作队列 & 网络恢复同步
- 暗色模式（浅/深/跟随系统）
- 数据导出

## 文件清单（新增/修改 ~50 个文件）

### 新增文件
| 文件 | 用途 |
|------|------|
| lib/types.ts | 类型扩展：ChatMessage/Todo/Note/Habit/HabitLog/Briefing/UserSettings/Feedback |
| lib/date-parser.ts | 修复「今晚/明早」标题清洗 |
| lib/intent-classifier.ts | 14 意图分类 + 实体提取 |
| lib/conversation.ts | AI 人格 + LLM 回复生成 |
| lib/feature-detect.ts | 浏览器检测 + 国产适配 |
| lib/push-edge.ts | Edge Web Push（Web Crypto） |
| lib/offline-queue.ts | IndexedDB 离线队列 |
| lib/logger.ts | 全局错误捕获上报 |
| lib/life-d1.ts | D1 CRUD（待办/习惯/笔记/简报/设置/反馈） |
| lib/life-service.ts | Prisma CRUD（同上） |
| hooks/useChat.ts | 对话状态 + localStorage 持久化 |
| components/ | ChatHeader/ChatMessageList/ChatMessage/EventCard/ChatInput/Drawer/BriefingCard/TodoCard/HabitRow/QuickActions/UpdateNotification/ChangelogModal/FeedbackButton/OnboardingGuide/ErrorBoundary |
| API 路由 (10个新) | /api/chat /api/todos /api/notes /api/habits /api/habits/log /api/briefing /api/settings /api/feedback /api/log /api/push/... |
| 页面 (5个新) | /calendar /settings /privacy /terms (改版: / /login) |
| workers/cron-handler.ts | CF Worker 定时推送 |
| migrations/002_life_secretary.sql | D1 6张新表迁移 |
| public/changelog.json | 版本日志 |

## 构建状态
- `npm run build` ✅ — 16 API 路由 + 20 页面
- `npx tsc --noEmit` ✅ — 源代码零错误
- GitHub: https://github.com/Shenluonanshu/ai-secretary

## Git 状态
- 本地 commit: e2f4cfb（阶段四+五）
- 待推送（GitHub 443 被墙，网络恢复后执行 `git push`）
- 上一个已推送 commit: 7b28bb3（阶段三）

## 运行时
- `npm run dev` → http://localhost:3000
- DeepSeek API key 已配置在 .env.local（受 .gitignore 保护）

## 用户偏好
- 始终中文交流 | 阶段完成推送 GitHub | 结束工作记录进度
- 国内可用 | 网页能打开能输入
