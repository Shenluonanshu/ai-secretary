"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent, ChatMessage, EventDraft, BriefingData, QuickAction } from "@/lib/types";
import { authFetch } from "@/lib/api";

const WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: "welcome-1",
    role: "assistant",
    type: "text",
    content: "你好！我是你的 AI 秘书 👋\n\n可以直接告诉我你的安排，比如「明天下午三点开会」，我来帮你管理日程。",
    timestamp: new Date().toISOString(),
  },
  {
    id: "welcome-2",
    role: "assistant",
    type: "quick_actions",
    content: "你也可以试试这些：",
    timestamp: new Date().toISOString(),
    actions: [
      { label: "📅 今天有什么安排", intent: "query_today" },
      { label: "➕ 创建新日程", intent: "create_event" },
      { label: "✅ 添加待办", intent: "create_todo" },
      { label: "📊 查看简报", intent: "show_briefing" },
    ],
  },
];

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("chat_messages");
    if (saved) {
      try { return JSON.parse(saved) as ChatMessage[]; } catch { /* ignore */ }
    }
    return WELCOME_MESSAGES;
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const eventIdRef = useRef<Map<string, string>>(new Map());

  // Persist messages to localStorage (immediate) + server (debounced)
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat_messages", JSON.stringify(messages.slice(-100)));
    }
  }, [messages]);

  // Persist to server (debounced, every 5s)
  useEffect(() => {
    if (messages.length <= 2) return; // Don't save just welcome messages
    const timer = setTimeout(async () => {
      try {
        await authFetch("/api/conversation", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "对话", messages: messages.slice(-200) }),
        });
      } catch { /* background save, silent fail */ }
    }, 5000);
    return () => clearTimeout(timer);
  }, [messages]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      type: "text",
      content: text,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setIsProcessing(true);

    try {
      const res = await authFetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, source: "text" }),
      });

      if (!res.ok) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant", type: "error",
          content: "抱歉，处理出错了，请稍后重试。",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const data = await res.json() as {
        messages?: ChatMessage[];
        clarification?: string;
        draft?: EventDraft;
        event?: CalendarEvent;
        events?: CalendarEvent[];
        briefing?: BriefingData;
        actions?: QuickAction[];
      };

      if (data.clarification) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant", type: "text",
          content: data.clarification,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Handle structured response
      // Render messages first (if any)
      if (data.messages) {
        for (const m of data.messages) {
          addMessage({ ...m, id: m.id || crypto.randomUUID(), timestamp: m.timestamp || new Date().toISOString() });
        }
      }

      // Render event card (can coexist with messages above)
      if (data.draft || data.event) {
        const eventData = (data.event || data.draft)!;
        const event: CalendarEvent = "id" in eventData ? eventData as CalendarEvent : {
          ...eventData as EventDraft,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };

        eventIdRef.current.set(event.id, event.id);

        // Only add the default text if no custom messages were provided
        if (!data.messages?.length) {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant", type: "text",
            content: "已为你解析日程，确认信息无误后保存：",
            timestamp: new Date().toISOString(),
          });
        }

        const eventMsgId = crypto.randomUUID();
        addMessage({
          id: eventMsgId,
          role: "assistant",
          type: "event_card",
          content: "",
          event,
          timestamp: new Date().toISOString(),
          // Store the event msg id for later reference
        });
        // Store mapping: eventId -> messageId
        eventIdRef.current.set(event.id, eventMsgId);
      }

      if (!data.messages?.length && !data.draft && !data.event && data.events) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant", type: "text",
          content: `找到 ${data.events.length} 个日程：`,
          timestamp: new Date().toISOString(),
        });
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant", type: "event_list",
          content: "", events: data.events,
          timestamp: new Date().toISOString(),
        });
      }

      if (!data.messages?.length && !data.draft && !data.event && !data.events && data.briefing) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant", type: "briefing",
          content: "", briefing: data.briefing,
          timestamp: new Date().toISOString(),
        });
      }

      if (!data.messages?.length && !data.draft && !data.event && !data.events && !data.briefing) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant", type: "text",
          content: "已收到你的消息。",
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant", type: "error",
        content: "网络连接失败，请检查网络后重试。",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsProcessing(false);
    }
  }, [addMessage]);

  const confirmEvent = useCallback(async (tempId: string) => {
    // Update the event card message to show "saved" mode
    const msgId = eventIdRef.current.get(tempId);
    if (msgId) {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, content: "已保存" } : m
      ));
    }
    // Add a confirmation text
    addMessage({
      id: crypto.randomUUID(),
      role: "assistant", type: "text",
      content: "✅ 日程已保存。还有什么需要安排的？",
      timestamp: new Date().toISOString(),
    });
  }, [addMessage]);

  const handleAction = useCallback(async (intent: string, text?: string) => {
    if (intent === "query_today" || intent === "show_briefing") {
      await sendMessage(text || (intent === "query_today" ? "今天有什么安排" : "查看简报"));
    } else if (intent === "create_event") {
      // Signal the user to start typing
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant", type: "text",
        content: "好的，请告诉我你要安排的日程，比如「明天下午三点开会，提前半小时提醒」。",
        timestamp: new Date().toISOString(),
      });
    } else if (intent === "create_todo") {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant", type: "text",
        content: "请告诉我待办事项的内容，比如「下班买牛奶」。",
        timestamp: new Date().toISOString(),
      });
    } else {
      await sendMessage(text || intent);
    }
  }, [addMessage, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages(WELCOME_MESSAGES);
    localStorage.removeItem("chat_messages");
  }, []);

  const toggleTodo = useCallback(async (id: string) => {
    try {
      const res = await authFetch("/api/todos", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      if (res.ok) {
        const updated = await res.json();
        // Update the todo in messages
        setMessages(prev => prev.map(m => {
          if (m.type === "todo_card" && m.todo?.id === id) {
            return { ...m, todo: updated };
          }
          return m;
        }));
      }
    } catch { /* ignore */ }
  }, []);

  const checkHabit = useCallback(async (id: string) => {
    try {
      const res = await authFetch("/api/habits/log", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ habitId: id }) });
      if (res.ok) {
        const data = await res.json();
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant", type: "text",
          content: data.ok ? `已打卡！连续 ${data.streak} 天 🔥` : "今天已经打过卡了 ✅",
          timestamp: new Date().toISOString(),
        });
      }
    } catch { /* ignore */ }
  }, [addMessage]);

  return {
    messages,
    isProcessing,
    sendMessage,
    confirmEvent,
    handleAction,
    clearMessages,
    addMessage,
    toggleTodo,
    checkHabit,
  };
}
