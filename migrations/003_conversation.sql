-- 知行 AI 秘书 — 阶段六：对话历史持久化
CREATE TABLE IF NOT EXISTS Conversation (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '新对话',
  messages TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
