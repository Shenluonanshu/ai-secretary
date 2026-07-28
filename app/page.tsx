"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarEvent, EventDraft } from "@/lib/types";
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
    draft,
    editing,
    prompt,
    setPrompt,
    setEditing,
    setDraft,
    load,
    update,
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
    error: speechError,
    startListening,
    stopListening,
    supported: speechSupported,
  } = useSpeech();

  // ── UI state ──
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");

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
    const ev = events.find((e: CalendarEvent) => e.id === id);
    if (ev) {
      setEditing(ev.id);
      setDraft({
        title: ev.title,
        description: ev.description,
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        allDay: ev.allDay,
        timezone: ev.timezone,
        reminders: ev.reminders,
        recurrence: ev.recurrence,
        source: ev.source,
      });
      setNotice("已加载到编辑区，修改后点击保存。");
    }
  }, [events, setEditing, setDraft]);

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
      // The speech result will be processed in the speech context
      if (prompt.trim()) {
        await sendMessage(prompt);
        setPrompt("");
      }
    } else {
      if (!speechSupported) {
        const caps = detectCapabilities();
        setNotice(getUnsupportedMessage("voice", caps.browserType));
        return;
      }
      try {
        await startListening();
        setNotice("正在聆听…");
      } catch {
        setNotice("语音识别无法启动。");
      }
    }
  }, [isListening, speechSupported, startListening, stopListening, prompt, sendMessage, setPrompt]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-secretary-${new Date().toLocaleDateString("en-CA")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("数据已导出。");
  }, [events]);

  return (
    <div className="chat-shell">
      <ChatHeader
        onMenuToggle={() => setDrawerOpen(true)}
        onMoreToggle={handleExport}
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
