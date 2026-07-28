import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/llm/factory";
import type { LLMProvider, ParseResult } from "@/lib/llm/types";
import { onCloudflare } from "@/lib/cf";
import { classifyIntent, isEventIntent } from "@/lib/intent-classifier";
import { generateResponse, generateChatResponse } from "@/lib/conversation";
import type { CalendarEvent, EventDraft, ChatMessage, BriefingData, HabitWithStreak } from "@/lib/types";

const provider: LLMProvider = createProvider();
const hasLLM = (process.env.OPENAI_API_KEY || "") !== "" && process.env.OPENAI_API_KEY !== "sk-your-key-here";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      text?: string; source?: string; intent?: string; eventId?: string;
    };
    const text = (body.text || "").trim();

    if (body.intent === "confirm_event") {
      return NextResponse.json({ message: "日程已保存。", ok: true });
    }

    if (!text) {
      return NextResponse.json({ clarification: "请告诉我你想做什么。" });
    }

    const now = new Date();
    const classification = await classifyIntent(text, now);

    // Try LLM-generated reply for enhanced naturalness
    // Fallback to `reply` if LLM is unavailable
    async function reply(intentLabel: string, result: Record<string, unknown>): Promise<string> {
      if (hasLLM) {
        const conversational = await generateResponse(text, {
          intent: intentLabel,
          result: JSON.stringify(result),
          time: now.toLocaleString("zh-CN"),
        });
        if (conversational) return conversational;
      }
      // Fallback to the default template text (set by caller)
      return (result._defaultText as string) || "收到 ✅";
    }

    switch (classification.intent) {
      // ── Briefing ──
      case "show_briefing": {
        const briefing: BriefingData = await getService().generateBriefing();
        const msg = await reply("show_briefing", {
          _defaultText: `📊 ${briefing.greeting}\n今天 ${briefing.eventCount} 个日程，${briefing.pendingTodoCount}/${briefing.todoCount} 个待办`,
          briefing,
        });
        return NextResponse.json({
          briefing,
          messages: [textMsg(msg)],
        });
      }

      // ── Create Todo ──
      case "create_todo": {
        const title = classification.entities?.title ||
          text.replace(/记一下|帮我记|提醒我[要做]?|记得|别忘了|帮我|记个|写个|加个|创建待办|添加待办|新建待办/g, " ").replace(/\s+/g, " ").trim() ||
          "未命名待办";
        const todo = await getService().createTodo({ title, completed: false, priority: 0, listName: "默认", tags: [] });
        const msg = await reply("create_todo", { _defaultText: `已添加待办「${todo.title}」✅`, title: todo.title });
        return NextResponse.json({
          messages: [
            textMsg(msg),
            { id: crypto.randomUUID(), role: "assistant" as const, type: "todo_card" as const, content: "", todo, timestamp: new Date().toISOString() },
          ],
        });
      }

      // ── Query Todos ──
      case "query_todos":
      case "complete_todo": {
        const todos = await getService().getAllTodos();
        const pending = todos.filter(t => !t.completed).length;
        if (todos.length === 0) {
          const msg = await reply("query_todos", { _defaultText: "目前没有待办事项 ✅ 需要我帮你记一个吗？", total: 0 });
          return NextResponse.json({ messages: [textMsg(msg)] });
        }
        const msg = await reply("query_todos", {
          _defaultText: `你有 ${todos.length} 个待办${pending > 0 ? `，其中 ${pending} 个待完成：` : "，全部已完成 🎉"}`,
          total: todos.length, pending,
        });
        return NextResponse.json({
          messages: [
            textMsg(msg),
            ...todos.filter(t => !t.completed).slice(0, 8).map(t => (
              { id: crypto.randomUUID(), role: "assistant" as const, type: "todo_card" as const, content: "", todo: t, timestamp: new Date().toISOString() }
            )),
          ],
        });
      }

      // ── Create Habit ──
      case "create_habit": {
        const name = classification.entities?.name ||
          text.replace(/添加习惯|创建习惯|新建习惯|添加|创建|新建|：|:|\s/g, " ").replace(/\s+/g, " ").trim() || "新习惯";
        const habit = await getService().createHabit({ name, icon: "✅", frequency: "daily", targetCount: 1, color: "#4a5be7" });
        const hWithStreak: HabitWithStreak = { ...habit, streak: 0, todayDone: false, weekProgress: "0/1" };
        const msg = await reply("create_habit", { _defaultText: `已创建习惯「${name}」✅`, name });
        return NextResponse.json({
          messages: [
            textMsg(msg),
            { id: crypto.randomUUID(), role: "assistant", type: "habit_card", content: "", habit: hWithStreak, timestamp: new Date().toISOString() },
          ],
        });
      }

      // ── Log Habit ──
      case "log_habit": {
        const habits = await getService().getAllHabits();
        if (habits.length === 0) {
          const msg = await reply("log_habit", { _defaultText: "你还没有添加习惯。试试说「添加习惯：每天跑步」来创建一个。", total: 0 });
          return NextResponse.json({ messages: [textMsg(msg)] });
        }
        const cleanName = text.replace(/打卡|完成|今天|今日|了|✓|✔|坚持|连续/g, "").trim();
        const matched = habits.find(h =>
          h.name.includes(cleanName) || cleanName.includes(h.name) || habits.length === 1
        );
        if (matched) {
          const result = await getService().checkHabit(matched.id);
          if (result.ok) {
            const msg = await reply("log_habit", {
              _defaultText: `🎉 已记录「${matched.icon} ${matched.name}」打卡！连续 ${result.streak} 天 🔥`,
              habitName: matched.name, streak: result.streak,
            });
            return NextResponse.json({
              messages: [textMsg(msg), { id: crypto.randomUUID(), role: "assistant", type: "habit_card", content: "", habit: matched, timestamp: new Date().toISOString() }],
            });
          }
          return NextResponse.json({ messages: [textMsg("今天已经打过卡了 ✅")] });
        }
        const msg = await reply("log_habit", {
          _defaultText: `你目前有 ${habits.length} 个习惯，请说出习惯名称来打卡，比如「跑步打卡」`,
          total: habits.length, names: habits.map(h => h.name).join("、"),
        });
        return NextResponse.json({
          messages: [textMsg(msg), ...habits.map(h => ({ id: crypto.randomUUID(), role: "assistant" as const, type: "habit_card" as const, content: "", habit: h, timestamp: new Date().toISOString() }))],
        });
      }

      // ── Query Habits ──
      case "query_habits": {
        const habits = await getService().getAllHabits();
        if (habits.length === 0) {
          const msg = await reply("query_habits", { _defaultText: "你还没有添加习惯。试试说「添加习惯：每天跑步」", total: 0 });
          return NextResponse.json({ messages: [textMsg(msg)] });
        }
        const msg = await reply("query_habits", {
          _defaultText: `你有 ${habits.length} 个习惯：`,
          total: habits.length, names: habits.map(h => `${h.icon}${h.name}`).join("、"),
        });
        return NextResponse.json({
          messages: [textMsg(msg), ...habits.map(h => ({ id: crypto.randomUUID(), role: "assistant" as const, type: "habit_card" as const, content: "", habit: h, timestamp: new Date().toISOString() }))],
        });
      }

      // ── Query Events ──
      case "query_events": {
        const events = await getService().getEvents();
        if (events.length === 0) {
          const msg = await reply("query_events", { _defaultText: "目前没有日程安排。需要我帮你创建一个吗？", total: 0 });
          return NextResponse.json({ messages: [textMsg(msg)] });
        }
        const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
        const todayCount = events.filter(e => e.startsAt.slice(0, 10) === today).length;
        const msg = await reply("query_events", {
          _defaultText: `找到 ${events.length} 个日程：`,
          total: events.length, todayCount,
          titles: events.map(e => e.title).join("、"),
        });
        return NextResponse.json({ events, messages: [textMsg(msg)] });
      }

      // ── Delete Event ──
      case "delete_event": {
        const events = await getService().getEvents();
        if (events.length === 0) {
          return NextResponse.json({ messages: [textMsg("目前没有日程可以删除。")] });
        }
        return NextResponse.json({
          messages: [
            textMsg("请告诉我要删除哪个日程，或者在这里选择："),
            ...events.slice(0, 5).map(e => ({
              id: crypto.randomUUID(), role: "assistant" as const, type: "event_card" as const,
              content: `点击删除：${e.title}`, event: e, timestamp: new Date().toISOString(),
            })),
          ],
        });
      }

      // ── Help ──
      case "help": {
        const msg = await reply("help", {
          _defaultText: "我是你的 AI 秘书，可以帮你：\n\n📅 **日程管理**：说「明天下午三点开会」来创建日程\n✅ **待办事项**：说「记一下，下班买牛奶」来添加待办\n🏃 **习惯打卡**：说「跑步打卡」来记录习惯\n📊 **查看简报**：说「查看简报」看今日汇总\n\n试试看吧！",
        });
        return NextResponse.json({ messages: [textMsg(msg)] });
      }

      // ── Free Time ──
      case "check_free_time": {
        const asEvent = await tryParseEvent(text);
        if (asEvent.draft) {
          const event: CalendarEvent = { ...asEvent.draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
          return NextResponse.json({ event, draft: asEvent.draft });
        }
        return NextResponse.json({ messages: [textMsg("你可以选择一个日期查看空闲时间，或者直接告诉我想安排什么，我帮你检查时段是否冲突。")] });
      }

      // ── Create Event ──
      case "create_event": {
        const result = await tryParseEvent(text);
        if (result.clarification) {
          // See if LLM can give a friendlier clarification
          if (hasLLM) {
            const friendly = await generateResponse(text, {
              intent: "create_event_failed", result: `解析失败原因：${result.clarification}`,
              time: now.toLocaleString("zh-CN"),
            });
            if (friendly) return NextResponse.json({ clarification: friendly });
          }
          return NextResponse.json({ clarification: result.clarification });
        }
        if (result.draft) {
          const event: CalendarEvent = { ...result.draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
          const msg = await reply("create_event", {
            _defaultText: "已解析日程，确认后保存 👇",
            title: event.title,
            time: event.allDay ? "全天" : new Date(event.startsAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          });
          return NextResponse.json({
            event, draft: result.draft,
            messages: hasLLM ? [textMsg(msg)] : undefined,
          });
        }
        return NextResponse.json({ clarification: "我理解你想安排日程，能提供具体时间和内容吗？比如「明天下午三点开会」。", });
      }

      // ── General chat ──
      default: {
        if (isEventIntent(text)) {
          const result = await tryParseEvent(text);
          if (result.draft) {
            const event: CalendarEvent = { ...result.draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
            return NextResponse.json({ event, draft: result.draft });
          }
        }

        // Use LLM for open-ended chat
        if (hasLLM) {
          const reply = await generateChatResponse(text);
          if (reply) return NextResponse.json({ messages: [textMsg(reply)] });
        }

        return NextResponse.json({ messages: [textMsg(getFallbackReply(text, classification.confidence))] });
      }
    }
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ clarification: "服务暂时不可用，请稍后重试。" }, { status: 500 });
  }
}

// ── Helpers ──

async function tryParseEvent(text: string): Promise<{ draft?: EventDraft; clarification?: string }> {
  const result: ParseResult = await provider.parseNaturalLanguage(text, new Date(), "text");
  return { draft: result.draft, clarification: result.clarification };
}

function getFallbackReply(text: string, confidence: number): string {
  const clean = text.trim();
  if (/你好|嗨|哈[喽咯]|hi|hello|在吗/.test(clean))
    return "你好呀！👋 有什么我可以帮你的？";
  if (/谢谢|多谢|感谢|辛苦/.test(clean))
    return "不客气！有需要随时找我 😊";
  if (/晚安|拜拜|再见|bye|睡了/.test(clean))
    return "晚安 🌙 明天见！";
  if (confidence < 0.3)
    return "抱歉，我不太确定你想做什么 😅\n试试这些：\n• 📅 创建日程：「明天下午三点开会」\n• ✅ 添加待办：「记一下，下班买东西」\n• 🏃 习惯打卡：「跑步打卡」";
  return "收到 👍 如果你想安排日程，告诉我时间和内容就好。";
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
