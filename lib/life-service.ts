// ── Prisma 版：待办 / 笔记 / 习惯 / 设置 / 反馈 CRUD ──
import { prisma } from "./db";
import type { TodoItem, TodoDraft, Note, NoteDraft, Habit, HabitDraft, HabitWithStreak, HabitLog, UserSettings, Feedback, BriefingData } from "./types";

// ═══ Todo ═══
export async function getAllTodos(): Promise<TodoItem[]> {
  const rows = await prisma.todo.findMany({ orderBy: [{ priority: "desc" }, { createdAt: "asc" }] });
  return rows.map(toTodo);
}

export async function createTodo(draft: TodoDraft): Promise<TodoItem> {
  const row = await prisma.todo.create({
    data: {
      title: draft.title, description: draft.description ?? null,
      completed: false, priority: draft.priority || 0,
      dueDate: draft.dueDate ?? null, listName: draft.listName || "默认",
      tags: JSON.stringify(draft.tags || []),
    },
  });
  return toTodo(row);
}

export async function toggleTodo(id: string): Promise<TodoItem | null> {
  const existing = await prisma.todo.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.todo.update({ where: { id }, data: { completed: !existing.completed } });
  return toTodo(row);
}

export async function deleteTodo(id: string): Promise<void> {
  await prisma.todo.delete({ where: { id } });
}

// ═══ Note ═══
export async function getAllNotes(): Promise<Note[]> {
  const rows = await prisma.note.findMany({ orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }] });
  return rows.map(toNote);
}

export async function createNote(draft: NoteDraft): Promise<Note> {
  const row = await prisma.note.create({
    data: {
      title: draft.title, content: draft.content,
      tags: JSON.stringify(draft.tags || []), pinned: draft.pinned,
    },
  });
  return toNote(row);
}

export async function updateNote(id: string, draft: NoteDraft): Promise<Note | null> {
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.note.update({
    where: { id },
    data: { title: draft.title, content: draft.content, tags: JSON.stringify(draft.tags || []), pinned: draft.pinned },
  });
  return toNote(row);
}

export async function deleteNote(id: string): Promise<void> {
  await prisma.note.delete({ where: { id } });
}

// ═══ Habit ═══
export async function getAllHabits(): Promise<HabitWithStreak[]> {
  const rows = await prisma.habit.findMany({ where: { archived: false }, orderBy: { createdAt: "asc" } });
  const habits = rows.map(toHabit);
  return Promise.all(habits.map(addStreak));
}

export async function createHabit(draft: HabitDraft): Promise<Habit> {
  const row = await prisma.habit.create({
    data: { name: draft.name, icon: draft.icon, frequency: draft.frequency, targetCount: draft.targetCount, color: draft.color },
  });
  return toHabit(row);
}

export async function checkHabit(habitId: string): Promise<{ ok: boolean; streak: number }> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  try {
    await prisma.habitLog.create({
      data: { habitId, date: today, count: 1 },
    });
    const streak = await calcStreak(habitId, today);
    return { ok: true, streak };
  } catch {
    return { ok: false, streak: 0 };
  }
}

export async function archiveHabit(id: string): Promise<void> {
  await prisma.habit.update({ where: { id }, data: { archived: true } });
}

// ═══ Settings ═══
export async function getSettings(): Promise<UserSettings> {
  let row = await prisma.userSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    row = await prisma.userSettings.create({
      data: { id: "default" },
    });
  }
  return {
    theme: (row.theme as UserSettings["theme"]) || "system",
    timezone: row.timezone, morningBriefingTime: row.morningBriefingTime,
    defaultReminderMinutes: JSON.parse(row.defaultReminderMinutes),
    workingHoursStart: row.workingHoursStart, workingHoursEnd: row.workingHoursEnd,
    weekStartDay: row.weekStartDay,
  };
}

export async function updateSettings(s: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings();
  const merged = { ...current, ...s };
  await prisma.userSettings.upsert({
    where: { id: "default" },
    update: {
      theme: merged.theme, timezone: merged.timezone, morningBriefingTime: merged.morningBriefingTime,
      defaultReminderMinutes: JSON.stringify(merged.defaultReminderMinutes),
      workingHoursStart: merged.workingHoursStart, workingHoursEnd: merged.workingHoursEnd,
      weekStartDay: merged.weekStartDay,
    },
    create: { id: "default", theme: merged.theme, timezone: merged.timezone, morningBriefingTime: merged.morningBriefingTime, defaultReminderMinutes: JSON.stringify(merged.defaultReminderMinutes), workingHoursStart: merged.workingHoursStart, workingHoursEnd: merged.workingHoursEnd, weekStartDay: merged.weekStartDay },
  });
  return merged;
}

// ═══ Feedback ═══
export async function submitFeedback(f: { rating: number; message?: string; category?: string; userAgent?: string }): Promise<Feedback> {
  const cat = (f.category as Feedback["category"]) || "other";
  const row = await prisma.feedback.create({
    data: { rating: f.rating, message: f.message || "", category: cat, userAgent: f.userAgent || "" },
  });
  return { id: row.id, rating: row.rating, message: row.message || "", category: row.category as Feedback["category"], userAgent: row.userAgent || "", createdAt: row.createdAt.toISOString(), resolved: row.resolved };
}

// ═══ Briefing ═══
export async function generateBriefing(): Promise<BriefingData> {
  const [events, todos, habits] = await Promise.all([
    (await import("./events-service")).getAll(),
    getAllTodos(),
    getAllHabits(),
  ]);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const todayEvents = events.filter(e => e.startsAt.slice(0, 10) === today);
  const pendingTodos = todos.filter(t => !t.completed);

  const occupied = todayEvents.map(e => [new Date(e.startsAt).getTime(), new Date(e.endsAt).getTime()] as const).sort((a,b)=>a[0]-b[0]);
  const slots: string[] = [];
  let cursor = new Date(`${today}T09:00`).getTime();
  const endTime = new Date(`${today}T18:00`).getTime();
  for (const [a,b] of occupied) {
    if (a - cursor >= 30 * 60_000) slots.push(`${new Date(cursor).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}–${new Date(a).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}`);
    cursor = Math.max(cursor, b);
  }
  if (endTime - cursor >= 30 * 60_000) slots.push(`${new Date(cursor).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}–18:00`);

  return {
    date: new Date().toLocaleDateString("zh-CN", { year:"numeric", month:"long", day:"numeric", weekday:"long" }),
    greeting: getGreeting(),
    eventCount: todayEvents.length,
    upcomingEvents: todayEvents.slice(0, 5),
    todoCount: todos.length,
    pendingTodoCount: pendingTodos.length,
    habits: habits.slice(0, 5),
    freeSlots: slots,
  };
}

// ── Mappers ──
function toTodo(r: { id:string; title:string; description:string|null; completed:boolean; priority:number; dueDate:string|null; listName:string; tags:string; createdAt:Date; updatedAt:Date }): TodoItem {
  return { id:r.id, title:r.title, description:r.description??undefined, completed:r.completed, priority:r.priority, dueDate:r.dueDate??undefined, listName:r.listName, tags:JSON.parse(r.tags||"[]"), createdAt:r.createdAt.toISOString(), updatedAt:r.updatedAt.toISOString() };
}
function toNote(r: { id:string; title:string; content:string; tags:string; pinned:boolean; createdAt:Date; updatedAt:Date }): Note {
  return { id:r.id, title:r.title, content:r.content, tags:JSON.parse(r.tags||"[]"), pinned:r.pinned, createdAt:r.createdAt.toISOString(), updatedAt:r.updatedAt.toISOString() };
}
function toHabit(r: { id:string; name:string; icon:string; frequency:string; targetCount:number; color:string; archived:boolean; createdAt:Date }): Habit {
  return { id:r.id, name:r.name, icon:r.icon, frequency:r.frequency as Habit["frequency"], targetCount:r.targetCount, color:r.color, archived:r.archived, createdAt:r.createdAt.toISOString() };
}

async function addStreak(h: Habit): Promise<HabitWithStreak> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const td = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId: h.id, date: today } } });
  const todayDone = !!td;
  const streak = await calcStreak(h.id, today);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const count = await prisma.habitLog.count({
    where: { habitId: h.id, date: { gte: weekStart.toLocaleDateString("en-CA") } },
  });
  return { ...h, streak, todayDone, weekProgress: `${count}/${h.targetCount}` };
}

async function calcStreak(habitId: string, today: string): Promise<number> {
  const logs = await prisma.habitLog.findMany({ where: { habitId }, orderBy: { date: "desc" }, select: { date: true } });
  const dates = new Set(logs.map(l => l.date));
  let streak = 0;
  const check = new Date(today);
  while (dates.has(check.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }))) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，注意休息 🌙";
  if (h < 9) return "早上好！新的一天开始了 ☀️";
  if (h < 12) return "上午好！精力充沛地开始吧 💪";
  if (h < 14) return "中午好！别忘了吃午饭 🍜";
  if (h < 18) return "下午好！继续加油 🚀";
  return "晚上好！回顾一下今天的收获吧 🌆";
}
