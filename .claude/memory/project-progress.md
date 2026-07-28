---
name: project-progress
description: 知行 AI 秘书项目升级进度追踪 — 2026-07-28 阶段一完成
metadata:
  type: project
---

## 当前进度

- **阶段一：对话式 UI 重构** ✅ 已完成 (2026-07-28)
- **阶段二：全能生活秘书功能** ⏳ 待开始
- **阶段三：国内适配** ⏳ 待开始
- **阶段四：后端增强** ⏳ 待开始
- **阶段五：工程化完善** ⏳ 待开始
- **阶段六：高级功能** ⏳ 远期

## 阶段一变更清单

### 新建文件（20 个）
- 组件：ChatHeader / ChatMessageList / ChatMessage / EventCard / ChatInput / Drawer / BriefingCard / TodoCard / HabitRow / QuickActions
- Hook：hooks/useChat.ts
- API：app/api/chat/route.ts
- 页面：app/calendar/page.tsx / app/settings/page.tsx / app/privacy/page.tsx / app/terms/page.tsx
- 其他：public/changelog.json

### 修改文件（6 个）
- lib/types.ts — 新增 ChatMessage、TodoItem、Note、Habit、HabitLog、BriefingData、UserSettings、Feedback 类型
- app/globals.css — 移动端优先重写，暗色模式就绪，聊天 UI 全部样式
- app/page.tsx — 从仪表盘布局重写为纯对话式聊天界面
- app/layout.tsx — 简化，暗色模式防闪烁脚本
- lib/date-parser.ts — 修复「今晚/明早/后天晚上」等日期+时段连写识别
- app/api/events/route.ts — 移除 edge runtime 声明（兼容本地 Prisma）
- app/api/push/subscribe/route.ts — 同上

### 当前运行时状态
- 开发服务器：`npm run dev` → http://localhost:3000
- 上次问题：Edge Runtime + Prisma 6.19 不兼容 → 已通过移除 `runtime = "edge"` 修复
- 上次问题：智能引号污染代码 → 已重写 date-parser.ts 修复
- 「今晚六点出去买菜」→ 正确解析为今天 18:00-19:00 ✅

### 待修复的小问题
- 标题清洗未移除"今晚/明早"前缀（如「今晚 出去买菜」应显示「出去买菜」）

## 下次继续工作时的起点
1. 阅读 [[project-progress]] 了解当前进度
2. 阅读 .claude/plans/abstract-bouncing-stallman.md 了解完整方案
3. 运行 `npm run dev` 启动本地环境
4. 选择下一阶段开始实施

## GitHub 仓库
- 远程：https://github.com/Shenluonanshu/ai-secretary.git
- 分支：master
- Git 用户：沈洛南书

## 用户偏好
- 始终用中文交流
- 每阶段完成后推送到 GitHub
- 结束工作时记录进度
- 网页在国内能打开、能输入
