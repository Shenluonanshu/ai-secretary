"use client";
import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent, TodoItem, HabitWithStreak } from "@/lib/types";
import { useEvents } from "@/hooks/useEvents";
import { useNotifications } from "@/hooks/useNotifications";
import { useChat } from "@/hooks/useChat";
import { useSpeech } from "@/lib/speech/SpeechContext";
import { authFetch } from "@/lib/api";
import { getUnsupportedMessage, detectCapabilities } from "@/lib/feature-detect";
import { setupOfflineSync } from "@/lib/offline-queue";
import { useRouter } from "next/navigation";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageList } from "@/components/ChatMessageList";
import { ChatInput } from "@/components/ChatInput";
import { Drawer } from "@/components/Drawer";
import { Toast } from "@/components/Toast";
import { PushManager } from "@/components/PushManager";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdateNotification } from "@/components/UpdateNotification";
import { ChangelogModal } from "@/components/ChangelogModal";
import { FeedbackButton } from "@/components/FeedbackButton";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { hasToken } from "@/lib/api";

const fmt = (s: string, allDay = false) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: allDay ? undefined : "2-digit",
    minute: allDay ? undefined : "2-digit",
  }).format(new Date(s));

export default function Home() {
  // ── Event management (kept for notifications + persistence) ──
  const {
    events,
    prompt,
    setPrompt,
    load,
    persist,
    remove,
  } = useEvents();

  useNotifications(events);

  // ── Chat state ──
  const {
    messages,
    isProcessing,
    sendMessage,
    confirmEvent,
    handleAction: chatHandleAction,
    toggleTodo,
    checkHabit,
    addMessage,
  } = useChat();

  // ── Speech ──
  const {
    isListening,
    lastResult,
    error: speechError,
    startListening,
    stopListening,
    supported: speechSupported,
  } = useSpeech();

  // ── UI state ──
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [greeting, setGreeting] = useState("AI 秘书");

  // Dynamic greeting
  useEffect(() => {
    const update = () => {
      const h = new Date().getHours();
      setGreeting(
        h < 6 ? "夜深了 🌙" : h < 9 ? "早上好 ☀️" :
        h < 12 ? "上午好 💪" : h < 14 ? "中午好 🍜" :
        h < 18 ? "下午好 🚀" : "晚上好 🌆"
      );
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  // Auto-dismiss notice
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  // Speech error → notice
  useEffect(() => {
    if (speechError) setNotice(speechError);
  }, [speechError]);

  // Speech result → fill input (don't auto-send, let user review)
  useEffect(() => {
    if (lastResult?.text) {
      setPrompt(lastResult.text);
      if (lastResult.isFinal) {
        setNotice("语音识别完成，确认后点击发送 →");
      }
    }
  }, [lastResult, setPrompt]);

  // Load events on mount
  const router = useRouter();
  useEffect(() => { load(); }, [load]);

  // Offline sync setup
  useEffect(() => {
    const cleanup = setupOfflineSync(() => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("auth_token");
      }
      return null;
    });
    return cleanup;
  }, []);

  // ── Handlers ──

  const handleSend = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isProcessing) return;
    setPrompt("");
    await sendMessage(text);
    load(); // Refresh events after chat interaction
  }, [prompt, isProcessing, sendMessage, setPrompt, load]);

  const handleConfirmEvent = useCallback(async (id: string) => {
    // Find the event data from the pending message
    const eventMsg = messages.find((m: { id: string; event?: CalendarEvent }) => m.id === id || m.event?.id === id);
    if (eventMsg?.event) {
      const msg = await persist({
        title: eventMsg.event.title,
        description: eventMsg.event.description,
        startsAt: eventMsg.event.startsAt,
        endsAt: eventMsg.event.endsAt,
        allDay: eventMsg.event.allDay,
        timezone: eventMsg.event.timezone,
        reminders: eventMsg.event.reminders,
        recurrence: eventMsg.event.recurrence,
        source: eventMsg.event.source,
      }, null);
      if (msg) setNotice(msg);
      await confirmEvent(id);
    } else {
      await confirmEvent(id);
    }
  }, [messages, persist, confirmEvent]);

  const handleEditEvent = useCallback((id: string) => {
    // Look in both DB events and chat messages
    let ev: CalendarEvent | undefined = events.find((e: CalendarEvent) => e.id === id);
    // Also check in chat messages (pending events)
    if (!ev) {
      for (const m of messages) {
        if (m.event?.id === id) { ev = m.event; break; }
        if (m.events) {
          const found = m.events.find((e: CalendarEvent) => e.id === id);
          if (found) { ev = found; break; }
        }
      }
    }

    if (ev) {
      // Pre-fill the chat input with event info for re-editing
      const timeDesc = ev.allDay
        ? new Date(ev.startsAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) + "全天"
        : new Date(ev.startsAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) +
          " " + new Date(ev.startsAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
      setPrompt(`${timeDesc} ${ev.title}${ev.description ? "，" + ev.description : ""}`);
      setNotice("已填入输入框，修改后发送即可 →");
      // Also delete the old one if it was already persisted
      if (events.some(e => e.id === id)) {
        remove(id);
      }
    } else {
      setNotice("该日程信息暂不可编辑");
    }
  }, [events, messages, setPrompt, remove]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    await remove(id);
    setNotice("日程已删除。");
  }, [remove]);

  const handleToggleTodo = useCallback((id: string) => {
    toggleTodo(id);
  }, [toggleTodo]);

  const handleCheckHabit = useCallback((id: string) => {
    checkHabit(id);
  }, [checkHabit]);

  const handleAction = useCallback((intent: string) => {
    chatHandleAction(intent);
  }, [chatHandleAction]);

  const handleVoiceToggle = useCallback(async () => {
    if (isListening) {
      stopListening();
      // Speech result will fill the input box via lastResult effect above
    } else {
      if (!speechSupported) {
        const caps = detectCapabilities();
        setNotice(getUnsupportedMessage("voice", caps.browserType));
        return;
      }
      try {
        await startListening();
        setNotice("🎤 正在聆听…说完后再次点击结束");
      } catch {
        setNotice("语音识别无法启动。");
      }
    }
  }, [isListening, speechSupported, startListening, stopListening]);

  const handleOverview = useCallback(async () => {
    try {
      const [eventsRes, todosRes, habitsRes] = await Promise.all([
        authFetch("/api/events"),
        authFetch("/api/todos").catch(() => null),
        authFetch("/api/habits").catch(() => null),
      ]);
      const events: CalendarEvent[] = await eventsRes.json();
      const todos: TodoItem[] = todosRes ? await todosRes.json() : [];
      const habits: HabitWithStreak[] = habitsRes ? await habitsRes.json() : [];

      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "overview",
        content: "",
        events,
        todos,
        habits,
        timestamp: new Date().toISOString(),
      });
    } catch {
      setNotice("加载失败，请重试。");
    }
  }, [addMessage]);

  return (
    <div className="chat-shell">
      <ChatHeader
        onMenuToggle={() => setDrawerOpen(true)}
        onExport={handleOverview}
        title={greeting}
      />

      <ChatMessageList
        messages={messages}
        isProcessing={isProcessing}
        onConfirmEvent={handleConfirmEvent}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
        onToggleTodo={handleToggleTodo}
        onCheckHabit={handleCheckHabit}
        onAction={handleAction}
        fmtDate={fmt}
      />

      <ChatInput
        value={prompt}
        onChange={setPrompt}
        onSend={handleSend}
        onVoiceToggle={handleVoiceToggle}
        isListening={isListening}
        isProcessing={isProcessing}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentPage="chat"
        onExport={handleOverview}
      />

      <Toast message={notice} />
      <PushManager />
      <InstallPrompt />
      <UpdateNotification />
      <ChangelogModal />
      <FeedbackButton />
      <OnboardingGuide />
    </div>
  );
}
