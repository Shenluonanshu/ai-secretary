import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/llm/factory";
import type { LLMProvider, ParseResult } from "@/lib/llm/types";
import { onCloudflare } from "@/lib/cf";
import type { CalendarEvent, EventDraft, ChatMessage, BriefingData } from "@/lib/types";

const provider: LLMProvider = createProvider();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      text?: string;
      source?: string;
      intent?: string;
      eventId?: string;
    };

    // ── Intent: confirm event ──
    if (body.intent === "confirm_event") {
      return NextResponse.json({ message: "日程已保存。", ok: true });
    }

    // ── Intent: query events ──
    if (body.text && isQueryIntent(body.text)) {
      const events = await getEvents();
      if (events.length === 0) {
        return NextResponse.json({
          messages: [createTextMsg("目前没有日程安排。需要我帮你创建一个吗？")],
        });
      }
      return NextResponse.json({
        events,
        messages: [createTextMsg(`找到 ${events.length} 个日程：`)],
      } as Record<string, unknown>);
    }

    // ── Intent: briefing ──
    if (body.text && /简报|今天.*安排|今天.*日程|每日/.test(body.text)) {
      const events = await getEvents();
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
      const todayEvents = events.filter((e) => e.startsAt.slice(0, 10) === today);
      const briefing: BriefingData = {
        date: new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }),
        greeting: getGreeting(),
        eventCount: todayEvents.length,
        upcomingEvents: todayEvents,
        todoCount: 0,
        pendingTodoCount: 0,
        habits: [],
        freeSlots: computeQuickFreeSlots(todayEvents),
      };
      return NextResponse.json({
        briefing,
        messages: [{ id: crypto.randomUUID(), role: "assistant", type: "briefing", content: "", timestamp: new Date().toISOString() }],
      } as Record<string, unknown>);
    }

    // ── Default: parse natural language ──
    if (!body.text) {
      return NextResponse.json({ clarification: "请告诉我你想做什么。" });
    }

    const now = new Date();
    const result: ParseResult = await provider.parseNaturalLanguage(body.text, now, (body.source as EventDraft["source"]) || "text");

    if (result.clarification) {
      return NextResponse.json({ clarification: result.clarification });
    }

    if (result.draft) {
      const event: CalendarEvent = {
        ...result.draft,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json({ event, draft: result.draft } as Record<string, unknown>);
    }

    return NextResponse.json({ clarification: "未能解析你的指令，请换种说法试试。" });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { clarification: "服务暂时不可用，请稍后重试。" },
      { status: 500 },
    );
  }
}

// ── Helpers ──

async function getEvents(): Promise<CalendarEvent[]> {
  if (onCloudflare()) {
    const { getAll } = await import("@/lib/events-d1");
    return getAll();
  }
  const { getAll } = await import("@/lib/events-service");
  return getAll();
}

function isQueryIntent(text: string): boolean {
  return /查看|有什么|有哪些|查询|日程列表|所有|今天|明天|这周|下周|本周/.test(text) &&
    !/(?:创建|添加|安排|新建|开会|提醒|记一下|写|笔记|打卡)/.test(text);
}

function createTextMsg(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    type: "text",
    content,
    timestamp: new Date().toISOString(),
  };
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

function computeQuickFreeSlots(events: CalendarEvent[]): string[] {
  const dayKey = (s: string) => s.slice(0, 10);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const occupied = events
    .filter((e) => dayKey(e.startsAt) === today)
    .map((e) => [new Date(e.startsAt).getTime(), new Date(e.endsAt).getTime()] as const)
    .sort((a, b) => a[0] - b[0]);

  const slots: string[] = [];
  let cursor = new Date(`${today}T09:00`).getTime();
  const end = new Date(`${today}T18:00`).getTime();

  for (const [a, b] of occupied) {
    if (a - cursor >= 30 * 60_000) {
      slots.push(`${new Date(cursor).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}–${new Date(a).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
    }
    cursor = Math.max(cursor, b);
  }
  if (end - cursor >= 30 * 60_000) {
    slots.push(`${new Date(cursor).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}–18:00`);
  }

  return slots;
}
