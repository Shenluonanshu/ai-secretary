export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/llm/factory";
import type { LLMProvider, ParseResult } from "@/lib/llm/types";
import { onCloudflare } from "@/lib/cf";
import { classifyIntent, isEventIntent } from "@/lib/intent-classifier";
import { generateResponse, generateChatResponse } from "@/lib/conversation";
import { parseChineseEvent } from "@/lib/date-parser";
import { getNextHolidayCountdown, getUpcomingHolidays, detectHolidayMention, getHolidayName, getDayType } from "@/lib/holidays";
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

    // Holiday queries: check before intent routing
    if (text && /假期|放假|节假日|法定假日|什么.*假|哪天.*休|怎么.*放假|还有.*天.*节/.test(text)) {
      const upcoming = getUpcomingHolidays(5);
      const countdown = getNextHolidayCountdown();
      if (upcoming.length > 0) {
        const list = upcoming.map(h =>
          `• ${h.name}：${new Date(h.date+"T00:00").toLocaleDateString("zh-CN",{month:"short",day:"numeric",weekday:"short"})}`
        ).join("\n");
        return NextResponse.json({ messages: [textMsg(`${countdown}\n\n最近的节假日：\n${list}`)] });
      }
    }

    switch (classification.intent) {
      // ── Briefing ──
      case "show_briefing": {
        const briefing: BriefingData = await getService().generateBriefing();
        // Attach holiday info
        const holidayCountdown = getNextHolidayCountdown();
        const upcomingHolidays = getUpcomingHolidays(3).map(h => ({ date: h.date, name: h.name }));
        briefing.holidayCountdown = holidayCountdown;
        briefing.upcomingHolidays = upcomingHolidays;

        const holidayExtra = holidayCountdown ? `\n${holidayCountdown}` : "";
        const msg = await reply("show_briefing", {
          _defaultText: `📊 ${briefing.greeting}\n今天 ${briefing.eventCount} 个日程，${briefing.pendingTodoCount}/${briefing.todoCount} 个待办${holidayExtra}`,
          briefing, holidayCountdown,
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
        const pendingTodos = todos.filter(t => !t.completed);
        const pending = pendingTodos.length;
        if (todos.length === 0) {
          const msg = await reply("query_todos", { _defaultText: "目前没有待办事项 ✅ 需要我帮你记一个吗？", total: 0 });
          return NextResponse.json({ messages: [textMsg(msg)] });
        }
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
        const overdue = pendingTodos.filter(t => t.dueDate && t.dueDate < today).length;
        const overdueText = overdue > 0 ? ` ⚠️ ${overdue} 个已过期` : "";

        const msg = await reply("query_todos", {
          _defaultText: `你有 ${todos.length} 个待办${pending > 0 ? `，${pending} 个待完成${overdueText}` : "，全部已完成 🎉"}`,
          total: todos.length, pending, overdue,
        });
        // Sort: priority desc → dueDate asc
        const sorted = [...pendingTodos].sort((a, b) =>
          b.priority - a.priority ||
          (a.dueDate || "9999") .localeCompare(b.dueDate || "9999")
        );
        return NextResponse.json({
          messages: [
            textMsg(msg),
            ...sorted.slice(0, 8).map(t => (
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

      // ── Evening Review ──
      case "evening_review": {
        const events = await getService().getEvents();
        const todos = await getService().getAllTodos();
        const habits = await getService().getAllHabits();
        const msg = await reply("evening_review", {
          _defaultText: "🌙 来看看今天的情况吧",
          todayEvents: events.filter(e => e.startsAt.slice(0, 10) === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })).length,
          pendingTodos: todos.filter(t => !t.completed).length,
          doneTodos: todos.filter(t => t.completed).length,
          checkedHabits: habits.filter(h => h.todayDone).length,
        });
        // Return overview-type message that ChatMessageList renders as EveningReview
        return NextResponse.json({
          messages: [textMsg(msg), {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            type: "overview" as const,
            content: "",
            events,
            todos,
            habits,
            timestamp: new Date().toISOString(),
          }],
        });
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

          // Conflict detection
          const events = await getService().getEvents();
          const conflict = events.find(e =>
            e.id !== event.id &&
            new Date(e.startsAt) < new Date(event.endsAt) &&
            new Date(e.endsAt) > new Date(event.startsAt)
          );
          const conflictText = conflict ? ` ⚠️ 与「${conflict.title}」时间重叠` : "";

          // Holiday awareness
          const eventDate = event.startsAt.slice(0, 10);
          const holidayName = getHolidayName(eventDate);
          const dayType = getDayType(eventDate);
          const holidayNote = holidayName
            ? `\n🎉 ${new Date(eventDate).toLocaleDateString("zh-CN",{month:"short",day:"numeric"})}是${holidayName}假期`
            : dayType === "workday"
            ? `\n⚠️ ${new Date(eventDate).toLocaleDateString("zh-CN",{month:"short",day:"numeric"})}是调休工作日`
            : "";
          const holidayMentionInText = detectHolidayMention(text);

          // Find alternative slots
          const dayDate = event.startsAt.slice(0, 10);
          const slots = findFreeSlots(events, dayDate);
          let alternatives = "";
          if (conflict && !event.allDay && slots.length > 0) {
            alternatives = `\n\n💡 可选空闲时段：${slots.slice(0, 3).join("、")}`;
          }

          const extraInfo = [conflictText, holidayNote].filter(Boolean).join("");
          const msg = await reply("create_event", {
            _defaultText: `已解析日程${extraInfo ? extraInfo : ""}，确认后保存 👇${alternatives}`,
            title: event.title,
            time: event.allDay ? "全天" : new Date(event.startsAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            hasConflict: !!conflict,
            conflictTitle: conflict?.title,
            alternatives: slots.join("、"),
            holidayName, holidayMention: holidayMentionInText,
          });
          return NextResponse.json({
            event, draft: result.draft,
            messages: [textMsg(msg)],
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
  // 优先使用规则引擎（快速、可靠、纯本地运算）
  const ruleResult = parseChineseEvent(text, new Date(), "text");
  if (ruleResult.draft) return { draft: ruleResult.draft };

  // 规则引擎失败 → 尝试 LLM
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey || apiKey === "sk-your-key-here") {
    return { clarification: ruleResult.clarification || "无法解析该日程，请提供更明确的时间和内容。" };
  }

  const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: `你是日历事件解析器。当前日期：${new Date().toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"long"})}。将用户的日程文本转为JSON：{"title":"事件名","startsAt":"ISO时间+08:00","endsAt":"ISO时间+08:00","allDay":false,"reminders":[30],"recurrence":"none"}。只输出JSON。` },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      return { clarification: ruleResult.clarification || "日程解析服务暂时不可用。" };
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { clarification: ruleResult.clarification || "未能解析日程。" };
    }

    const parsed = JSON.parse(content.trim()) as {
      title?: string; startsAt?: string; endsAt?: string;
      allDay?: boolean; reminders?: number[]; recurrence?: string;
      description?: string;
    };

    if (!parsed.title || !parsed.startsAt) {
      return { clarification: ruleResult.clarification || "AI 未能提取事件信息，请重新描述。" };
    }

    return {
      draft: {
        title: parsed.title,
        description: parsed.description ?? undefined,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt || new Date(new Date(parsed.startsAt).getTime() + 3600000).toISOString(),
        allDay: parsed.allDay ?? false,
        timezone: "Asia/Shanghai",
        reminders: parsed.reminders?.length ? parsed.reminders : [30],
        recurrence: (parsed.recurrence as EventDraft["recurrence"]) ?? "none",
        source: "text",
      },
    };
  } catch (err) {
    console.error("LLM parse error:", err);
    return { clarification: ruleResult.clarification || "日程解析失败，请重试。" };
  }
}

function getFallbackReply(text: string, confidence: number): string {
  const clean = text.trim();
  if (/你好|嗨|哈[喽咯]|hi|hello|在吗/.test(clean))
    return "你好呀！👋 有什么我可以帮你的？\n试试说「明天下午三点开会」或「查看简报」。";
  if (/谢谢|多谢|感谢|辛苦/.test(clean))
    return "不客气！有需要随时找我 😊";
  if (/晚安|拜拜|再见|bye|睡了/.test(clean))
    return "晚安 🌙 明天见！";
  if (/^[怎么如能][何做样]/.test(clean) || /功能|能做什么|帮助/.test(clean))
    return "我是你的 AI 秘书，可以帮你：\n\n📅 **日程管理**：「明天下午三点开会」\n✅ **待办事项**：「记一下，下班买牛奶」\n🏃 **习惯打卡**：「跑步打卡」\n📊 **查看简报**：「今天有什么安排」\n📅 **日历视图**：右上角菜单 → 日程中心\n\n试试说吧！";

  // 检测是否看起来像在尝试创建日程（有时间信息但解析失败了）
  if (/[今明后]天|下周|\d{1,2}[月点号日]|上午|下午|晚上|开会|会[议面]|聚餐|吃饭/.test(clean)) {
    return "我理解你想安排日程，但还需要更明确的时间信息 💭\n\n试试这些格式：\n• 「明天下午三点开会」\n• 「8月3日上午10点去看牙医」\n• 「今晚七点聚餐」";
  }

  if (confidence < 0.3)
    return "抱歉，我不太确定你想做什么 😅\n试试这些：\n• 📅 创建日程：「明天下午三点开会」\n• ✅ 添加待办：「记一下，下班买东西」\n• 🏃 习惯打卡：「跑步打卡」\n• 📊 查看简报：「查看简报」";
  return "收到 👍 如果你想安排日程，告诉我时间和内容就好。\n比如「明天下午三点开会」或「记一下，周末去超市」。";
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

function findFreeSlots(events: CalendarEvent[], date: string): string[] {
  const occupied = events
    .filter(e => e.startsAt.slice(0, 10) === date)
    .map(e => [new Date(e.startsAt).getTime(), new Date(e.endsAt).getTime()] as const)
    .sort((a, b) => a[0] - b[0]);
  const slots: string[] = [];
  let cursor = new Date(`${date}T09:00`).getTime();
  const end = new Date(`${date}T18:00`).getTime();
  for (const [a, b] of occupied) {
    if (a - cursor >= 30 * 60_000) {
      slots.push(`${new Date(cursor).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}-${new Date(a).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
    }
    cursor = Math.max(cursor, b);
  }
  if (end - cursor >= 30 * 60_000) {
    slots.push(`${new Date(cursor).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}-18:00`);
  }
  return slots;
}
