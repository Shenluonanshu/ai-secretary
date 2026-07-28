import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/llm/factory";
import type { LLMProvider, ParseResult } from "@/lib/llm/types";
import { onCloudflare } from "@/lib/cf";
import type { CalendarEvent, EventDraft, ChatMessage, BriefingData, HabitWithStreak } from "@/lib/types";

const provider: LLMProvider = createProvider();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      text?: string; source?: string; intent?: string; eventId?: string;
    };
    const text = (body.text || "").trim();

    // ── Intent: confirm event ──
    if (body.intent === "confirm_event") {
      return NextResponse.json({ message: "日程已保存。", ok: true });
    }

    // ── Intent: briefing ──
    if (text && /简报|今日.*总|今天.*汇总|每日|早安|早上好/.test(text)) {
      const briefing: BriefingData = await getService().generateBriefing();
      return NextResponse.json({ briefing });
    }

    // ── Intent: create todo ──
    if (text && /记一下|待办|todo|提醒.*做|别忘了|记得|帮我记/.test(text) &&
        !/(?:开会|会议|安排|创建|日程|日历|几?点|时间)/.test(text)) {
      const todoTitle = text.replace(/记一下|帮我记|提醒我[要做]?|记得|别忘了|添加待办|创建待办/g, " ").replace(/\s+/g, " ").trim() || text;
      const todo = await getService().createTodo({ title: todoTitle, completed: false, priority: 0, listName: "默认", tags: [] });
      return NextResponse.json({
        messages: [
          textMsg(`已添加待办「${todo.title}」✅`),
          { id: crypto.randomUUID(), role: "assistant", type: "todo_card", content: "", todo, timestamp: new Date().toISOString() } satisfies ChatMessage,
        ],
      });
    }

    // ── Intent: query todos ──
    if (text && /待办.*列表|查看.*待办|我的.*任务|还有.*什么.*做|没完成/.test(text)) {
      const todos = await getService().getAllTodos();
      if (todos.length === 0) {
        return NextResponse.json({ messages: [textMsg("目前没有待办事项 ✅ 需要我帮你记一个吗？")] });
      }
      const msgs: ChatMessage[] = [
        textMsg(`你有 ${todos.length} 个待办事项，其中 ${todos.filter(t=>!t.completed).length} 个待完成：`),
        ...todos.slice(0, 5).map(t => ({ id: crypto.randomUUID(), role: "assistant" as const, type: "todo_card" as const, content: "", todo: t, timestamp: new Date().toISOString() } satisfies ChatMessage)),
      ];
      return NextResponse.json({ messages: msgs });
    }

    // ── Intent: log habit ──
    if (text && /打卡|完成.*习惯|习惯.*完成|今天.*(?:跑步|运动|阅读|冥想|健身)/.test(text)) {
      const habits = await getService().getAllHabits();
      const habitName = text.replace(/打卡|完成|今天|了|✓/g, "").trim();
      const matched = habits.find(h => h.name.includes(habitName) || habitName.includes(h.name));
      if (matched) {
        const result = await getService().checkHabit(matched.id);
        if (result.ok) {
          const msgs: ChatMessage[] = [
            textMsg(`🎉 已记录「${matched.icon} ${matched.name}」打卡！连续 ${result.streak} 天 🔥`),
            { id: crypto.randomUUID(), role: "assistant", type: "habit_card", content: "", habit: matched, timestamp: new Date().toISOString() },
          ];
          return NextResponse.json({ messages: msgs });
        }
        return NextResponse.json({ messages: [textMsg("今天已经打过卡了 ✅")] });
      }
      return NextResponse.json({ messages: [textMsg("还没有这个习惯哦。你可以在待办里记下这个想法，或者之后添加为习惯。")] });
    }

    // ── Intent: query habits ──
    if (text && /习惯|我的习惯|习惯.*列表/.test(text) && !/打卡|添加|新建|创建/.test(text)) {
      const habits = await getService().getAllHabits();
      if (habits.length === 0) {
        return NextResponse.json({ messages: [textMsg("你还没有添加习惯。试试说「添加习惯：每天跑步」")] });
      }
      const msgs: ChatMessage[] = [
        textMsg("你的习惯进度："),
        ...habits.map(h => ({ id: crypto.randomUUID(), role: "assistant" as const, type: "habit_card" as const, content: "", habit: h, timestamp: new Date().toISOString() })),
      ];
      return NextResponse.json({ messages: msgs });
    }

    // ── Intent: create habit ──
    if (text && /添加习惯|新建习惯|创建习惯/.test(text)) {
      const name = text.replace(/添加习惯|新建习惯|创建习惯|：|:|\s/g, " ").replace(/\s+/g, " ").trim() || "新习惯";
      const habit = await getService().createHabit({ name, icon: "✅", frequency: "daily", targetCount: 1, color: "#4a5be7" });
      const hWithStreak: HabitWithStreak = { ...habit, streak: 0, todayDone: false, weekProgress: "0/1" };
      return NextResponse.json({
        messages: [
          textMsg(`已创建习惯「${name}」✅`),
          { id: crypto.randomUUID(), role: "assistant", type: "habit_card", content: "", habit: hWithStreak, timestamp: new Date().toISOString() } satisfies ChatMessage,
        ],
      });
    }

    // ── Intent: query events ──
    if (text && /查看|有什么|有哪些|查询|日程列表|所有|今天|明天|这周|下周|本周/.test(text) &&
        !/(?:创建|添加|安排|新建|开会|提醒|记一下|待办|打卡|习惯)/.test(text)) {
      const events = await getService().getEvents();
      if (events.length === 0) {
        return NextResponse.json({ messages: [textMsg("目前没有日程安排。需要我帮你创建一个吗？")] });
      }
      return NextResponse.json({ events, messages: [textMsg(`找到 ${events.length} 个日程：`)] });
    }

    // ── Default: parse natural language as event ──
    if (!text) {
      return NextResponse.json({ clarification: "请告诉我你想做什么。" });
    }

    const now = new Date();
    const result: ParseResult = await provider.parseNaturalLanguage(text, now, (body.source as EventDraft["source"]) || "text");

    if (result.clarification) {
      return NextResponse.json({ clarification: result.clarification });
    }

    if (result.draft) {
      const event: CalendarEvent = {
        ...result.draft,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json({ event, draft: result.draft });
    }

    return NextResponse.json({ clarification: "未能解析你的指令，请换种说法试试。" });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ clarification: "服务暂时不可用，请稍后重试。" }, { status: 500 });
  }
}

// ── Service dispatcher ──
function getService() {
  if (onCloudflare()) {
    return {
      getEvents: () => import("@/lib/events-d1").then(m => m.getAll()),
      getAllTodos: () => import("@/lib/life-d1").then(m => m.getAllTodos()),
      createTodo: (d: Parameters<typeof import("@/lib/life-d1").createTodo>[0]) => import("@/lib/life-d1").then(m => m.createTodo(d)),
      getAllHabits: () => import("@/lib/life-d1").then(m => m.getAllHabits()),
      createHabit: (d: Parameters<typeof import("@/lib/life-d1").createHabit>[0]) => import("@/lib/life-d1").then(m => m.createHabit(d)),
      checkHabit: (id: string) => import("@/lib/life-d1").then(m => m.checkHabit(id)),
      generateBriefing: () => import("@/lib/life-d1").then(m => m.generateBriefing()),
    };
  }
  return {
    getEvents: () => import("@/lib/events-service").then(m => m.getAll()),
    getAllTodos: () => import("@/lib/life-service").then(m => m.getAllTodos()),
    createTodo: (d: Parameters<typeof import("@/lib/life-service").createTodo>[0]) => import("@/lib/life-service").then(m => m.createTodo(d)),
    getAllHabits: () => import("@/lib/life-service").then(m => m.getAllHabits()),
    createHabit: (d: Parameters<typeof import("@/lib/life-service").createHabit>[0]) => import("@/lib/life-service").then(m => m.createHabit(d)),
    checkHabit: (id: string) => import("@/lib/life-service").then(m => m.checkHabit(id)),
    generateBriefing: () => import("@/lib/life-service").then(m => m.generateBriefing()),
  };
}

function textMsg(content: string): ChatMessage {
  return { id: crypto.randomUUID(), role: "assistant", type: "text", content, timestamp: new Date().toISOString() };
}
