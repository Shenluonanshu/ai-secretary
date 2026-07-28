// ── 日程事件 ──
export type Source = "manual" | "text" | "voice" | "trip";
export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  timezone: string;
  reminders: number[];
  recurrence: "none" | "daily" | "weekly" | "monthly";
  source: Source;
  createdAt: string;
};
export type EventDraft = Omit<CalendarEvent, "id" | "createdAt">;

// ── 旅行 ──
export type TripItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  selected: boolean;
};

// ── 聊天消息 ──
export type MessageRole = "user" | "assistant" | "system";
export type MessageType =
  | "text"
  | "event_card"
  | "event_list"
  | "overview"
  | "todo_card"
  | "habit_card"
  | "briefing"
  | "quick_actions"
  | "divider"
  | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: string;
  event?: CalendarEvent;
  events?: CalendarEvent[];
  todo?: TodoItem;
  todos?: TodoItem[];
  habit?: HabitWithStreak;
  habits?: HabitWithStreak[];
  briefing?: BriefingData;
  actions?: QuickAction[];
}

export interface QuickAction {
  label: string;
  intent: string;
  icon?: string;
}

// ── 待办事项 ──
export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: number; // 0=普通 1=重要 2=紧急
  dueDate?: string;
  listName: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type TodoDraft = Omit<TodoItem, "id" | "createdAt" | "updatedAt">;

// ── 笔记 ──
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NoteDraft = Omit<Note, "id" | "createdAt" | "updatedAt">;

// ── 习惯 ──
export interface Habit {
  id: string;
  name: string;
  icon: string;
  frequency: "daily" | "weekly" | "monthly";
  targetCount: number;
  color: string;
  archived: boolean;
  createdAt: string;
}

export interface HabitWithStreak extends Habit {
  streak: number;
  todayDone: boolean;
  weekProgress: string; // "3/5"
}

export type HabitDraft = Omit<Habit, "id" | "createdAt" | "archived">;

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  count: number;
  note?: string;
  createdAt: string;
}

// ── 早安简报 ──
export interface BriefingData {
  date: string;
  greeting: string;
  eventCount: number;
  upcomingEvents: CalendarEvent[];
  todoCount: number;
  pendingTodoCount: number;
  habits: HabitWithStreak[];
  freeSlots: string[];
  suggestion?: string;
  holidayCountdown?: string;
  upcomingHolidays?: { date: string; name: string }[];
}

// ── 用户设置 ──
export interface UserSettings {
  theme: "light" | "dark" | "system";
  timezone: string;
  morningBriefingTime: string;
  defaultReminderMinutes: number[];
  workingHoursStart: string;
  workingHoursEnd: string;
  weekStartDay: number;
}

// ── 反馈 ──
export interface Feedback {
  id: string;
  rating: number;
  message: string;
  category: "bug" | "feature" | "other";
  userAgent: string;
  createdAt: string;
  resolved: boolean;
}
