// ── D1 版：待办 / 笔记 / 习惯 / 设置 / 反馈 CRUD ──
import { getDB } from "./d1-client";
import type { TodoItem, TodoDraft, Note, NoteDraft, Habit, HabitDraft, HabitWithStreak, HabitLog, UserSettings, Feedback, BriefingData } from "./types";

// ═══ Todo ═══
export async function getAllTodos(): Promise<TodoItem[]> {
  const db = getDB();
  const { results } = await db.prepare("SELECT * FROM Todo ORDER BY priority DESC, createdAt ASC").all<TodoRow>();
  return (results || []).map(toTodo);
}

export async function createTodo(draft: TodoDraft): Promise<TodoItem> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    "INSERT INTO Todo (id,title,description,completed,priority,dueDate,listName,tags,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)"
  ).bind(id, draft.title, draft.description||null, 0, draft.priority||0, draft.dueDate||null, draft.listName||"默认", JSON.stringify(draft.tags||[]), now, now).run();
  return { id, ...draft, completed: false, createdAt: now, updatedAt: now };
}

export async function toggleTodo(id: string): Promise<TodoItem | null> {
  const db = getDB();
  const existing = await db.prepare("SELECT * FROM Todo WHERE id=?1").bind(id).first<TodoRow>();
  if (!existing) return null;
  const newVal = existing.completed ? 0 : 1;
  await db.prepare("UPDATE Todo SET completed=?1, updatedAt=?2 WHERE id=?3").bind(newVal, new Date().toISOString(), id).run();
  return toTodo({ ...existing, completed: newVal });
}

export async function deleteTodo(id: string): Promise<void> {
  const db = getDB();
  await db.prepare("DELETE FROM Todo WHERE id=?1").bind(id).run();
}

// ═══ Note ═══
export async function getAllNotes(): Promise<Note[]> {
  const db = getDB();
  const { results } = await db.prepare("SELECT * FROM Note ORDER BY pinned DESC, updatedAt DESC").all<NoteRow>();
  return (results || []).map(toNote);
}

export async function createNote(draft: NoteDraft): Promise<Note> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    "INSERT INTO Note (id,title,content,tags,pinned,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7)"
  ).bind(id, draft.title, draft.content, JSON.stringify(draft.tags||[]), draft.pinned?1:0, now, now).run();
  return { id, ...draft, createdAt: now, updatedAt: now };
}

export async function updateNote(id: string, draft: NoteDraft): Promise<Note | null> {
  const db = getDB();
  const existing = await db.prepare("SELECT * FROM Note WHERE id=?1").bind(id).first<NoteRow>();
  if (!existing) return null;
  const now = new Date().toISOString();
  await db.prepare(
    "UPDATE Note SET title=?1,content=?2,tags=?3,pinned=?4,updatedAt=?5 WHERE id=?6"
  ).bind(draft.title, draft.content, JSON.stringify(draft.tags||[]), draft.pinned?1:0, now, id).run();
  return { id, ...draft, createdAt: existing.createdAt, updatedAt: now };
}

export async function deleteNote(id: string): Promise<void> {
  const db = getDB();
  await db.prepare("DELETE FROM Note WHERE id=?1").bind(id).run();
}

// ═══ Habit ═══
export async function getAllHabits(): Promise<HabitWithStreak[]> {
  const db = getDB();
  const { results } = await db.prepare("SELECT * FROM Habit WHERE archived=0 ORDER BY createdAt ASC").all<HabitRow>();
  const habits = (results || []).map(toHabit);
  return Promise.all(habits.map(addStreak));
}

export async function createHabit(draft: HabitDraft): Promise<Habit> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    "INSERT INTO Habit (id,name,icon,frequency,targetCount,color,createdAt) VALUES (?1,?2,?3,?4,?5,?6,?7)"
  ).bind(id, draft.name, draft.icon, draft.frequency, draft.targetCount, draft.color, now).run();
  return { id, ...draft, archived: false, createdAt: now };
}

export async function checkHabit(habitId: string): Promise<{ ok: boolean; streak: number }> {
  const db = getDB();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  try {
    const id = crypto.randomUUID();
    await db.prepare("INSERT OR IGNORE INTO HabitLog (id,habitId,date,count,createdAt) VALUES (?1,?2,?3,?4,?5)")
      .bind(id, habitId, today, 1, new Date().toISOString()).run();
    const streak = await calcStreak(db, habitId, today);
    return { ok: true, streak };
  } catch {
    return { ok: false, streak: 0 };
  }
}

export async function archiveHabit(id: string): Promise<void> {
  const db = getDB();
  await db.prepare("UPDATE Habit SET archived=1 WHERE id=?1").bind(id).run();
}

// ═══ Settings ═══
export async function getSettings(): Promise<UserSettings> {
  const db = getDB();
  const row = await db.prepare("SELECT * FROM UserSettings WHERE id='default'").first<SettingsRow>();
  if (!row) {
    // Init defaults
    const now = new Date().toISOString();
    await db.prepare("INSERT OR IGNORE INTO UserSettings (id,theme,timezone,morningBriefingTime,defaultReminderMinutes,workingHoursStart,workingHoursEnd,weekStartDay,createdAt,updatedAt) VALUES ('default','system','Asia/Shanghai','08:00','[30]','09:00','18:00',1,?1,?2)").bind(now, now).run();
    return { theme:"system", timezone:"Asia/Shanghai", morningBriefingTime:"08:00", defaultReminderMinutes:[30], workingHoursStart:"09:00", workingHoursEnd:"18:00", weekStartDay:1 };
  }
  return {
    theme: (row.theme as UserSettings["theme"]) || "system",
    timezone: row.timezone || "Asia/Shanghai",
    morningBriefingTime: row.morningBriefingTime || "08:00",
    defaultReminderMinutes: JSON.parse(row.defaultReminderMinutes || "[30]"),
    workingHoursStart: row.workingHoursStart || "09:00",
    workingHoursEnd: row.workingHoursEnd || "18:00",
    weekStartDay: row.weekStartDay || 1,
  };
}

export async function updateSettings(s: Partial<UserSettings>): Promise<UserSettings> {
  const db = getDB();
  const now = new Date().toISOString();
  const current = await getSettings();
  const merged = { ...current, ...s };
  await db.prepare(
    "UPDATE UserSettings SET theme=?1,timezone=?2,morningBriefingTime=?3,defaultReminderMinutes=?4,workingHoursStart=?5,workingHoursEnd=?6,weekStartDay=?7,updatedAt=?8 WHERE id='default'"
  ).bind(merged.theme, merged.timezone, merged.morningBriefingTime, JSON.stringify(merged.defaultReminderMinutes), merged.workingHoursStart, merged.workingHoursEnd, merged.weekStartDay, now).run();
  return merged;
}

// ═══ Feedback ═══
export async function submitFeedback(f: { rating: number; message?: string; category?: string; userAgent?: string }): Promise<Feedback> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const cat = (f.category as Feedback["category"]) || "other";
  await db.prepare(
    "INSERT INTO Feedback (id,rating,message,category,userAgent,createdAt) VALUES (?1,?2,?3,?4,?5,?6)"
  ).bind(id, f.rating, f.message||null, cat, f.userAgent||null, now).run();
  return { id, rating: f.rating, message: f.message||"", category: cat, userAgent: f.userAgent||"", createdAt: now, resolved: false };
}

// ═══ Briefing ═══
export async function generateBriefing(): Promise<BriefingData> {
  const [events, todos, habits] = await Promise.all([
    (await import("./events-d1")).getAll(),
    getAllTodos(),
    getAllHabits(),
  ]);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const todayEvents = events.filter(e => e.startsAt.slice(0, 10) === today);
  const pendingTodos = todos.filter(t => !t.completed);

  // Free slots
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

// ═══ Row types + mappers ═══
interface TodoRow { id:string; title:string; description:string|null; completed:number; priority:number; dueDate:string|null; listName:string; tags:string; createdAt:string; updatedAt:string; }
interface NoteRow { id:string; title:string; content:string; tags:string; pinned:number; createdAt:string; updatedAt:string; }
interface HabitRow { id:string; name:string; icon:string; frequency:string; targetCount:number; color:string; archived:number; createdAt:string; }
interface SettingsRow { theme:string; timezone:string; morningBriefingTime:string; defaultReminderMinutes:string; workingHoursStart:string; workingHoursEnd:string; weekStartDay:number; }

function toTodo(r: TodoRow): TodoItem {
  return { id:r.id, title:r.title, description:r.description??undefined, completed:!!r.completed, priority:r.priority, dueDate:r.dueDate??undefined, listName:r.listName, tags:JSON.parse(r.tags||"[]"), createdAt:r.createdAt, updatedAt:r.updatedAt };
}
function toNote(r: NoteRow): Note {
  return { id:r.id, title:r.title, content:r.content, tags:JSON.parse(r.tags||"[]"), pinned:!!r.pinned, createdAt:r.createdAt, updatedAt:r.updatedAt };
}
function toHabit(r: HabitRow): Habit {
  return { id:r.id, name:r.name, icon:r.icon, frequency:r.frequency as Habit["frequency"], targetCount:r.targetCount, color:r.color, archived:!!r.archived, createdAt:r.createdAt };
}

async function addStreak(h: Habit): Promise<HabitWithStreak> {
  const db = getDB();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const td = await db.prepare("SELECT * FROM HabitLog WHERE habitId=?1 AND date=?2").bind(h.id, today).first<{count:number}>();
  const logs = await db.prepare("SELECT date FROM HabitLog WHERE habitId=?1 ORDER BY date DESC").bind(h.id).all<{date:string}>();
  const dates = (logs.results||[]).map(r=>r.date);
  const todayDone = !!td;
  let streak = 0;
  let check = new Date(today);
  while (dates.includes(check.toLocaleDateString("en-CA",{timeZone:"Asia/Shanghai"}))) {
    streak++;
    check.setDate(check.getDate()-1);
  }
  // Week progress
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const weekDays = dates.filter(d => d >= weekStart.toLocaleDateString("en-CA"));
  return { ...h, streak, todayDone, weekProgress: `${weekDays.length}/${h.targetCount}` };
}

async function calcStreak(db: ReturnType<typeof getDB>, habitId: string, today: string): Promise<number> {
  const logs = await db.prepare("SELECT date FROM HabitLog WHERE habitId=?1 ORDER BY date DESC").bind(habitId).all<{date:string}>();
  const dates = (logs.results||[]).map(r=>r.date);
  let streak = 0;
  let check = new Date(today);
  while (dates.includes(check.toLocaleDateString("en-CA",{timeZone:"Asia/Shanghai"}))) {
    streak++;
    check.setDate(check.getDate()-1);
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
