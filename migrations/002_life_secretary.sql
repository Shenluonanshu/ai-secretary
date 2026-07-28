-- 知行 AI 秘书 — 阶段二：全能生活秘书
-- 新增表：Todo / Note / Habit / HabitLog / UserSettings

-- ── 待办事项 ──
CREATE TABLE IF NOT EXISTS Todo (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  dueDate TEXT,
  listName TEXT DEFAULT '默认',
  tags TEXT DEFAULT '[]',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_todo_completed ON Todo(completed);
CREATE INDEX IF NOT EXISTS idx_todo_due ON Todo(dueDate);

-- ── 笔记 ──
CREATE TABLE IF NOT EXISTS Note (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_note_pinned ON Note(pinned);

-- ── 习惯定义 ──
CREATE TABLE IF NOT EXISTS Habit (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '✅',
  frequency TEXT NOT NULL DEFAULT 'daily',
  targetCount INTEGER DEFAULT 1,
  color TEXT DEFAULT '#4a5be7',
  archived INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 打卡记录 ──
CREATE TABLE IF NOT EXISTS HabitLog (
  id TEXT PRIMARY KEY,
  habitId TEXT NOT NULL REFERENCES Habit(id),
  date TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  note TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(habitId, date)
);

CREATE INDEX IF NOT EXISTS idx_habitlog_habit ON HabitLog(habitId);
CREATE INDEX IF NOT EXISTS idx_habitlog_date ON HabitLog(date);

-- ── 用户偏好 ──
CREATE TABLE IF NOT EXISTS UserSettings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  theme TEXT DEFAULT 'system',
  timezone TEXT DEFAULT 'Asia/Shanghai',
  morningBriefingTime TEXT DEFAULT '08:00',
  defaultReminderMinutes TEXT DEFAULT '[30]',
  workingHoursStart TEXT DEFAULT '09:00',
  workingHoursEnd TEXT DEFAULT '18:00',
  weekStartDay INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 用户反馈 ──
CREATE TABLE IF NOT EXISTS Feedback (
  id TEXT PRIMARY KEY,
  rating INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  category TEXT DEFAULT 'other',
  userAgent TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  resolved INTEGER NOT NULL DEFAULT 0
);
