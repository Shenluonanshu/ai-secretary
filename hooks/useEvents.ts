"use client";
import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent, EventDraft } from "@/lib/types";
import { authFetch } from "@/lib/api";

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

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [draft, setDraft] = useState<EventDraft>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [candidate, setCandidate] = useState<EventDraft | null>(null);

  const load = useCallback(async () => {
    const res = await authFetch("/api/events");
    const data: CalendarEvent[] = await res.json();
    setEvents(data.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = useCallback((key: keyof EventDraft, value: unknown) => {
    setDraft((v) => ({ ...v, [key]: value }));
  }, []);

  const persist = useCallback(async (input = draft, id = editing) => {
    const method = id ? "PUT" : "POST";
    const res = await authFetch("/api/events", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(id ? { ...input, id } : input),
    });
    const data = await res.json();
    if (!res.ok) return data.error as string;
    setDraft(blank());
    setEditing(null);
    setCandidate(null);
    const msg = data.conflict
      ? `已保存，但与「${data.conflict.title}」有时间重叠。`
      : id
        ? "事件已更新，旧提醒已同步取消。"
        : "事件已保存，提醒已排入队列。";
    load();
    return msg;
  }, [draft, editing, load]);

  const parse = useCallback(async (source: "text" | "voice" = "text", text = prompt) => {
    const response = await authFetch("/api/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, source }),
    });
    const data = await response.json();
    if (data.clarification) return { clarification: data.clarification as string };
    setCandidate(data.draft);
    return { draft: data.draft as EventDraft };
  }, [prompt]);

  const remove = useCallback(async (id: string) => {
    await authFetch(`/api/events?id=${id}`, { method: "DELETE" });
    if (editing === id) {
      setEditing(null);
      setDraft(blank());
    }
    load();
  }, [editing, load]);

  const edit = useCallback((e: CalendarEvent) => {
    const { id: _id, createdAt: _createdAt, ...rest } = e;
    setDraft(rest);
    setEditing(e.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-secretary-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  return {
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
  };
}
