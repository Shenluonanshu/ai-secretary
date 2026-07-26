"use client";
import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent, EventDraft, TripItem } from "@/lib/types";
import { useEvents } from "@/hooks/useEvents";
import { useNotifications } from "@/hooks/useNotifications";
import { useFreeSlots } from "@/hooks/useFreeSlots";
import { authFetch } from "@/lib/api";
import { useSpeech } from "@/lib/speech/SpeechContext";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MetricsPanel } from "@/components/MetricsPanel";
import { AIAssistant } from "@/components/AIAssistant";
import { EventForm } from "@/components/EventForm";
import { EventList } from "@/components/EventList";
import { FreeSlotsPanel } from "@/components/FreeSlotsPanel";
import { TripPlanner } from "@/components/TripPlanner";
import { Toast } from "@/components/Toast";
import { PushManager } from "@/components/PushManager";
import { BottomNav } from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";

const blank = (): EventDraft => ({
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  allDay: false,
  timezone: "Asia/Shanghai",
  reminders: [30],
  recurrence: "none",
  source: "manual",
});

const localDate = (d = new Date()) =>
  d.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });

const fmt = (s: string, allDay = false) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: allDay ? undefined : "2-digit",
    minute: allDay ? undefined : "2-digit",
  }).format(new Date(s));

const dayKey = (s: string) => s.slice(0, 10);

export default function Home() {
  const {
    events,
    draft,
    editing,
    prompt,
    candidate,
    setPrompt,
    setEditing,
    setDraft,
    setCandidate,
    load,
    update,
    persist,
    parse,
    remove,
    edit,
    exportData,
  } = useEvents();

  useNotifications(events);

  const {
    isListening,
    lastResult,
    error: speechError,
    startListening,
    stopListening,
    supported: speechSupported,
  } = useSpeech();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"today" | "week" | "all">("week");
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [notice, setNotice] = useState("");
  const [trip, setTrip] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    preference: "",
  });
  const [plan, setPlan] = useState<TripItem[]>([]);
  const [summary, setSummary] = useState("");

  const freeSlots = useFreeSlots(events, selectedDate);

  // Service worker registration
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  // Auto-dismiss notice
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  // Handle speech results
  useEffect(() => {
    if (speechError) setNotice(speechError);
  }, [speechError]);

  useEffect(() => {
    if (lastResult?.text) {
      setPrompt(lastResult.text);
      if (lastResult.isFinal) {
        parse("voice", lastResult.text);
      }
    }
  }, [lastResult, parse, setPrompt]);

  // Filtered visible events
  const now = new Date();
  const today = localDate();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  const visible = useMemo(
    () =>
      events.filter((e) => {
        const starts = new Date(e.startsAt);
        const match =
          !query ||
          `${e.title} ${e.description || ""}`
            .toLowerCase()
            .includes(query.toLowerCase());
        return (
          match &&
          (filter === "all"
            ? true
            : filter === "today"
              ? dayKey(e.startsAt) === today
              : starts >= now && starts < weekEnd)
        );
      }),
    [events, filter, query, today],
  );

  async function handleParse(source: "text" | "voice", text?: string) {
    const result = await parse(source, text);
    if (result?.clarification) setNotice(result.clarification);
  }

  async function handleConfirmCandidate() {
    const msg = await persist(candidate ?? undefined, null);
    if (msg) setNotice(msg);
  }

  async function handlePersist() {
    const msg = await persist();
    if (msg) setNotice(msg);
  }

  async function handleRemove(id: string) {
    await remove(id);
    setNotice("事件已删除，关联提醒已取消。");
  }

  function handleEdit(e: CalendarEvent) {
    edit(e);
  }

  function handleCancelEdit() {
    setEditing(null);
    setDraft(blank());
  }

  function handleRequestPermission() {
    window.Notification?.requestPermission().then((p) =>
      setNotice(p === "granted" ? "通知已开启。" : "浏览器未授予通知权限。"),
    );
  }

  function handleSlotClick(startsAt: string, endsAt: string) {
    setDraft({ ...blank(), title: "专注时间", startsAt, endsAt });
    setEditing(null);
  }

  function handleToggleVoice() {
    if (isListening) {
      stopListening();
    } else {
      if (!speechSupported) {
        setNotice("当前浏览器不支持语音识别，请使用新版 Edge 或 Chrome。");
        return;
      }
      startListening().catch(() => setNotice("语音识别无法启动，请稍后重试。"));
      setNotice("正在聆听，请直接说出你的日程。");
    }
  }

  // Trip planner
  async function makePlan() {
    const response = await authFetch("/api/trip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(trip),
    });
    const data = await response.json();
    if (!response.ok) return setNotice(data.error);
    setPlan(data.items);
    setSummary(data.summary);
  }

  async function importPlan() {
    for (const item of plan.filter((p) => p.selected)) {
      await persist(
        {
          title: item.title,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          allDay: false,
          timezone: "Asia/Shanghai",
          reminders: [60],
          recurrence: "none",
          source: "trip",
        },
        null,
      );
    }
    setPlan([]);
    setSummary("");
  }

  return (
    <main className="app">
      <Sidebar />
      <section className="content">
        <Header
          onExport={exportData}
          onRequestPermission={handleRequestPermission}
        />
        <MetricsPanel events={events} freeSlots={freeSlots} />
        <div className="workspace">
          <section className="main-column">
            <AIAssistant
              prompt={prompt}
              onPromptChange={setPrompt}
              onParse={handleParse}
              candidate={candidate}
              onCancelCandidate={() => setCandidate(null)}
              onConfirmCandidate={handleConfirmCandidate}
              listening={isListening}
              onToggleVoice={handleToggleVoice}
              fmtDate={fmt}
            />
            <EventForm
              draft={draft}
              editing={editing}
              onUpdate={update}
              onPersist={handlePersist}
              onCancelEdit={handleCancelEdit}
            />
            <EventList
              events={visible}
              query={query}
              filter={filter}
              onQueryChange={setQuery}
              onFilterChange={setFilter}
              onEdit={handleEdit}
              onRemove={handleRemove}
              fmtDate={fmt}
            />
          </section>
          <aside className="right-column">
            <FreeSlotsPanel
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              freeSlots={freeSlots}
              onSlotClick={handleSlotClick}
            />
            <TripPlanner
              destination={trip.destination}
              startDate={trip.startDate}
              endDate={trip.endDate}
              preference={trip.preference}
              onDestinationChange={(v) => setTrip({ ...trip, destination: v })}
              onStartDateChange={(v) => setTrip({ ...trip, startDate: v })}
              onEndDateChange={(v) => setTrip({ ...trip, endDate: v })}
              onPreferenceChange={(v) => setTrip({ ...trip, preference: v })}
              onGenerate={makePlan}
              summary={summary}
              plan={plan}
              onToggleItem={(i) =>
                setPlan((list) =>
                  list.map((p, n) => (n === i ? { ...p, selected: !p.selected } : p)),
                )
              }
              onImport={importPlan}
              fmtDate={fmt}
            />
          </aside>
        </div>
      </section>
      <Toast message={notice} />
      <PushManager />
      <BottomNav />
      <InstallPrompt />
    </main>
  );
}
