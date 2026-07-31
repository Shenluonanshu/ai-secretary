export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events = [], todos = [], habits = [], notes = [], mode = "merge" } = body as {
      events?: Record<string, unknown>[];
      todos?: Record<string, unknown>[];
      habits?: Record<string, unknown>[];
      notes?: Record<string, unknown>[];
      mode?: "merge" | "replace";
    };

    let eventCount = 0, todoCount = 0;

    if (onCloudflare()) {
      const { create: createEvent } = await import("@/lib/events-d1");
      const { createTodo } = await import("@/lib/life-d1");
      for (const e of events) {
        try {
          await createEvent({
            title: e.title as string || "未命名",
            startsAt: e.startsAt as string || new Date().toISOString(),
            endsAt: e.endsAt as string || new Date().toISOString(),
            allDay: !!e.allDay,
            timezone: (e.timezone as string) || "Asia/Shanghai",
            reminders: (e.reminders as number[]) || [30],
            recurrence: (e.recurrence as "none"|"daily"|"weekly"|"monthly") || "none",
            source: "manual",
            description: e.description as string,
          });
          eventCount++;
        } catch { /* skip */ }
      }
      for (const t of todos) {
        try {
          await createTodo({
            title: t.title as string || "待办",
            completed: false,
            priority: (t.priority as number) || 0,
            listName: "默认",
            tags: [],
          });
          todoCount++;
        } catch { /* skip */ }
      }
    } else {
      const { create: createEvent } = await import("@/lib/events-service");
      const { createTodo } = await import("@/lib/life-service");
      for (const e of events) {
        try {
          await createEvent({
            title: e.title as string || "未命名",
            startsAt: e.startsAt as string || new Date().toISOString(),
            endsAt: e.endsAt as string || new Date().toISOString(),
            allDay: !!e.allDay,
            timezone: (e.timezone as string) || "Asia/Shanghai",
            reminders: (e.reminders as number[]) || [30],
            recurrence: (e.recurrence as "none"|"daily"|"weekly"|"monthly") || "none",
            source: "manual",
            description: e.description as string,
          });
          eventCount++;
        } catch { /* skip */ }
      }
      for (const t of todos) {
        try {
          await createTodo({
            title: t.title as string || "待办",
            completed: false,
            priority: (t.priority as number) || 0,
            listName: "默认",
            tags: [],
          });
          todoCount++;
        } catch { /* skip */ }
      }
    }

    return NextResponse.json({ ok: true, imported: { events: eventCount, todos: todoCount } });
  } catch (err) {
    return NextResponse.json({ error: "导入失败" }, { status: 500 });
  }
}
