"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CalendarEvent } from "@/lib/types";
import { useEvents } from "@/hooks/useEvents";
import { authFetch } from "@/lib/api";
import { Toast } from "@/components/Toast";
import { Drawer } from "@/components/Drawer";

const dayKey = (s: string) => s.slice(0, 10);

const fmt = (s: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "numeric", day: "numeric", weekday: "short",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(s));

export default function CalendarPage() {
  const router = useRouter();
  const { events, load } = useEvents();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"today" | "week" | "all">("week");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const now = new Date();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  const visible = useMemo(() =>
    events.filter((e) => {
      const match = !query || `${e.title} ${e.description || ""}`.toLowerCase().includes(query.toLowerCase());
      const starts = new Date(e.startsAt);
      return match && (
        filter === "all" ? true :
        filter === "today" ? dayKey(e.startsAt) === today :
        starts >= now && starts < weekEnd
      );
    }),
    [events, filter, query, today]
  );

  const handleDelete = useCallback(async (id: string) => {
    await authFetch(`/api/events?id=${id}`, { method: "DELETE" });
    setNotice("已删除");
    load();
  }, [load]);

  return (
    <div className="page-shell">
      <div className="page-head">
        <button className="back-btn" onClick={() => router.push("/")} aria-label="返回">
          ←
        </button>
        <h1>日程中心</h1>
        <button className="back-btn" onClick={() => setDrawerOpen(true)} aria-label="菜单" style={{ marginLeft: "auto" }}>
          ☰
        </button>
      </div>

      <div className="segmented" style={{ marginBottom: 12 }}>
        <button className={filter === "today" ? "on" : ""} onClick={() => setFilter("today")}>今天</button>
        <button className={filter === "week" ? "on" : ""} onClick={() => setFilter("week")}>7天</button>
        <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>全部</button>
      </div>

      <input
        style={{
          width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
          fontSize: 13, marginBottom: 12, background: "var(--paper)",
        }}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索事件…"
      />

      {visible.length === 0 ? (
        <div className="empty-state">
          <span className="icon">📅</span>
          没有找到日程。回对话页面创建吧。
        </div>
      ) : (
        <div className="event-list">
          {visible.map((ev) => (
            <div key={ev.id} className={`event-row source-${ev.source}`} style={{ borderLeftColor: ev.source === "trip" ? "var(--orange)" : ev.source === "voice" ? "var(--green)" : ev.source === "text" ? "var(--blue)" : "var(--muted)" }}>
              <div className="ev-time">{fmt(ev.startsAt)}</div>
              <div>
                <div className="ev-title">{ev.title}</div>
                {ev.description && <div className="ev-desc">{ev.description}</div>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <span className="badge">{ev.source === "trip" ? "行程" : ev.source === "voice" ? "语音" : ev.source === "text" ? "AI" : "手动"}</span>
                <button onClick={() => handleDelete(ev.id)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--red)", fontSize: 12 }}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} currentPage="calendar" />
      <Toast message={notice} />
    </div>
  );
}
