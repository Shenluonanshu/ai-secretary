---
name: project-progress
description: 知行 AI 秘书 v1.0 — 浏览器基础款发布
metadata:
  type: project
---

## v1.0 发布 — 浏览器基础款

- **版本号**: v1.0
- **发布日期**: 2026-07-28
- **GitHub**: https://github.com/Shenluonanshu/ai-secretary
- **标签**: `v1.0`

## 版本定位

面向手机浏览器的 AI 生活秘书 PWA，对话式交互，国内可用。

## 功能矩阵

### 💬 AI 对话
- DeepSeek LLM 驱动的自然语言对话
- 14 种意图识别（正则初筛 + LLM 兜底）
- AI 人格：温暖简洁的口语化回复
- 无 LLM 时自动降级模板

### 📅 日程管理
- 自然语言创建：「明天下午三点开会」
- 冲突检测 + 空闲时段建议
- 节假日自动识别提醒
- 月历视图 + 点击查看详情
- CRUD 闭环（创建/确认/编辑/删除）

### ✅ 待办事项
- 自然语言创建：「记一下，下班买牛奶」
- 优先级排序 + 过期红色标记
- 完成/未完成切换

### 🏃 习惯追踪
- 创建习惯 + 每日打卡
- 连续天数统计 + 本周进度

### 📊 数据总览
- 日历周视图表格
- 晚间回顾卡片（18点后自动切换）
- 每日简报 + 节假日倒计时
- 统计卡片（日程/待办/习惯）

### 🎤 语音输入
- Web Speech API 持续聆听
- 说话间隙自动重连（不怕停顿）
- 结果先填入输入框确认

### 📱 PWA 体验
- 安装到桌面（Android/iOS）
- 离线使用（Service Worker 缓存 + IndexedDB 离线队列）
- 暗色模式（浅/深/跟随系统）
- 移动端键盘适配
- 动态问候标题（早/午/晚）

### 🌐 国内适配
- DeepSeek API（国内直连）
- 国产浏览器检测 + 降级提示
- 隐私政策 + 用户协议
- 节假日数据（2026 全年）

### 🔧 工程化
- PWA 自动更新检测
- 更新日志弹窗
- 用户反馈（评分+文字）
- 新手引导（3步）
- 全局错误捕获上报
- 数据导入/导出（JSON）
- 对话历史持久化
- Edge Web Push（纯 Web Crypto）
- Cloudflare Worker 定时推送
- D1 + Prisma/SQLite 双模式

## 技术数据

- TypeScript: 零错误
- 构建: 23 页面 + 19 API 路由
- 组件: 20+ 个
- Hooks: 5 个
- 数据库: 10 张表

## 部署

- Cloudflare Pages: `9002365b.ai-secretary-1o5.pages.dev`
- Vercel: `ai-secretary-bice.vercel.app`
- 自定义域名: `nanshu.secretary.top`（DNS 等待中）
- GitHub: `Shenluonanshu/ai-secretary`

## 运行

```bash
npm run dev    # http://localhost:3000
npm run build  # 生产构建
```
