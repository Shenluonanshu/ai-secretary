# 知行 AI 秘书（MVP）

## 本地启动

```powershell
npm.cmd install
npm.cmd run dev
```

访问 `http://localhost:3000`。日程数据保存在 `data/events.json`（首次保存时自动创建）。

## 已实现

- 手动创建、删除、查看日程，含时区、提醒、简单重复规则及冲突提示。
- 中文自然语言日期解析：今天、明天、后天、下周几、月日、上下午及全天事件。
- 语音转写后的确认保存交互（当前为本地演示转写入口）。
- 可替换的 API 边界：`/api/parse`、`/api/events`、`/api/trip`。
- 旅行行程草案，可勾选后导入日历。

## 后续接入点

- 将 `lib/date-parser.ts` 替换或补充为 `LLMProvider` 实现；保留规则校验作为最终准入。
- 将语音入口替换为 `SpeechToTextProvider`，并把 JSON 存储替换为 PostgreSQL 与身份认证服务。
- 生产环境需增加 service worker、Web Push 订阅端点和后台提醒任务；浏览器通知权限已在页面预留。
