-- 知行 AI 秘书 — D1 数据库迁移
CREATE TABLE IF NOT EXISTS Event (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  startsAt TEXT NOT NULL,
  endsAt TEXT NOT NULL,
  allDay INTEGER NOT NULL DEFAULT 0,
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  reminders TEXT NOT NULL DEFAULT '[30]',
  recurrence TEXT NOT NULL DEFAULT 'none',
  source TEXT NOT NULL DEFAULT 'manual',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_starts ON Event(startsAt);
CREATE INDEX IF NOT EXISTS idx_event_source ON Event(source);

CREATE TABLE IF NOT EXISTS PushSubscription (
  id TEXT PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  keys TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
