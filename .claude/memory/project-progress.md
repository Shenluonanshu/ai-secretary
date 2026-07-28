---
name: project-progress
description: 知行 AI 秘书项目升级进度 — 阶段一/二/三完成，已接入 DeepSeek LLM
metadata:
  type: project
---

## 当前进度

- **阶段一：对话式 UI 重构** ✅ 已完成 (2026-07-28)
- **阶段二：全能生活秘书功能** ✅ 已完成 (2026-07-28)
- **增强：意图识别升级** ✅ 已完成 — 正则初筛 + LLM 兜底，14 种意图
- **增强：对话自然度** ✅ 已完成 — DeepSeek LLM 生成带人格的回复
- **阶段三：国内适配** ✅ 已完成 (2026-07-28)
- **阶段四：后端增强** ⏳ 待开始
- **阶段五：工程化完善** ⏳ 待开始
- **阶段六：高级功能** ⏳ 远期

## 当前能力速览

### 意图识别（14 种）
用户说 → AI 理解 → 正确执行：
- 日程：「明天下午三点开会」「今晚六点出去买菜」
- 待办：「记一下买牛奶」「别忘了取快递」「我有个事要记」
- 习惯：「添加习惯：每天跑步」「跑步打卡」「查看习惯」
- 简报：「查看简报」「今天有什么安排」
- 闲聊：「你好」「晚安」「谢谢」「在吗」

### AI 对话（DeepSeek LLM）
- 回复不固定模板，每次实时生成
- 有温度、有 emoji、有关联上下文
- 无 LLM 时自动降级到模板回复
- 配置：OPENAI_BASE_URL=https://api.deepseek.com/v1

### 国内适配
- 浏览器检测：微信/UC/QQ/百度自动识别
- 国产浏览器降级提示：引导用系统浏览器打开
- 语音不可用 → 提示用输入法语音
- iOS → 分享菜单添加到主屏幕引导
- 隐私政策 & 用户协议页面
- DeepSeek API（国内直连，无需代理）

## 新增文件汇总

| 文件 | 用途 |
|------|------|
| lib/intent-classifier.ts | 14 种意图分类 + 实体提取 |
| lib/conversation.ts | AI 秘书人格 + LLM 回复生成 |
| lib/feature-detect.ts | 浏览器能力检测 + 国产浏览器适配 |
| lib/life-d1.ts | D1 版待办/笔记/习惯/简报 CRUD |
| lib/life-service.ts | Prisma 版同上 |
| components/ | ChatHeader/ChatMessageList/ChatMessage/EventCard/ChatInput/Drawer/BriefingCard/TodoCard/HabitRow/QuickActions |
| hooks/useChat.ts | 对话状态管理 |
| app/api/chat/route.ts | 统一对话入口 |
| app/api/todos|notes|habits|briefing|settings|feedback/ | 6 个新 API 路由 |
| migrations/002_life_secretary.sql | 6 张新表 D1 迁移 |
| 二级页面 | /calendar /settings /privacy /terms |

## GitHub
- 仓库：https://github.com/Shenluonanshu/ai-secretary
- 最新提交：7b28bb3（阶段三：国内适配）
- 已推送 ✅

## 下次继续起点
1. 阅读本文件了解进度
2. `npm run dev` 启动
3. 选择阶段四（后端增强）或阶段五（工程化完善）开始
