"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CalendarEvent } from "@/lib/types";
import { useEvents } from "@/hooks/useEvents";
import { authFetch } from "@/lib/api";
import { Drawer } from "@/components/Drawer";

const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

export default function CalendarPage() {
  const router = useRouter();
  const { events, load } = useEvents();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(""), 3000); return () => clearTimeout(t); } }, [notice]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelectedDate(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelectedDate(null); };

  // Build month grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });

  const dayKey = (s: string) => s.slice(0, 10);

  const grid = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayEvents = events.filter(e => dayKey(e.startsAt) === dateStr);
    grid.push({ day: d, dateStr, events: dayEvents });
  }
  // Pad to complete rows
  while (grid.length % 7 !== 0) grid.push(null);

  const selectedEvents = selectedDate
    ? events.filter(e => dayKey(e.startsAt) === selectedDate)
    : [];

  const handleDelete = useCallback(async (id: string) => {
    await authFetch(`/api/events?id=${id}`, { method: "DELETE" });
    setNotice("已删除");
    load();
  }, [load]);

  return (
    <div className="page-shell">
      <div className="page-head">
        <button className="back-btn" onClick={() => router.push("/")} aria-label="返回">←</button>
        <h1>日程中心</h1>
        <button className="back-btn" onClick={() => setDrawerOpen(true)} aria-label="菜单" style={{ marginLeft: "auto" }}>☰</button>
      </div>

      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 12 }}>
        <button className="back-btn" onClick={prevMonth} aria-label="上个月">◀</button>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{year}年{month + 1}月</span>
        <button className="back-btn" onClick={nextMonth} aria-label="下个月">▶</button>
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1,
        background: "var(--line)", borderRadius: "var(--radius-md)", overflow: "hidden",
        border: "1px solid var(--line)",
      }}>
        {/* Weekday headers */}
        {weekdays.map(w => (
          <div key={w} style={{
            background: "var(--paper)", textAlign: "center", padding: "6px 0",
            fontSize: 11, color: "var(--muted)", fontWeight: 600,
            borderBottom: "1px solid var(--line)",
          }}>{w}</div>
        ))}
        {/* Day cells */}
        {grid.map((cell, i) => (
          <div key={i} style={{
            background: "var(--paper)", minHeight: 60, padding: 4,
            cursor: cell ? "pointer" : "default",
            opacity: cell ? 1 : 0.3,
            borderBottom: "1px solid var(--line-soft)",
          }}
            onClick={() => cell && setSelectedDate(cell.dateStr)}
          >
            {cell && (
              <>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 24, height: 24, borderRadius: "50%",
                  fontSize: 13, fontWeight: cell.dateStr === today ? 800 : 500,
                  background: cell.dateStr === today ? "var(--blue)" : "transparent",
                  color: cell.dateStr === today ? "#fff" : cell.dateStr === selectedDate ? "var(--blue)" : "var(--ink-soft)",
                  border: cell.dateStr === selectedDate && cell.dateStr !== today ? "2px solid var(--blue)" : "none",
                }}>
                  {cell.day}
                </div>
                <div style={{ marginTop: 2, display: "grid", gap: 1 }}>
                  {cell.events.slice(0, 3).map(ev => (
                    <div key={ev.id} style={{
                      fontSize: 9, lineHeight: 1.2, padding: "1px 3px", borderRadius: 2,
                      background: ev.source === "trip" ? "var(--orange-soft)" : ev.source === "voice" ? "var(--green-soft)" : "var(--blue-soft)",
                      borderLeft: `2px solid ${ev.source === "trip" ? "var(--orange)" : ev.source === "voice" ? "var(--green)" : "var(--blue)"}`,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {ev.allDay ? "" : new Date(ev.startsAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }).slice(0, 5)} {ev.title}
                    </div>
                  ))}
                  {cell.events.length > 3 && (
                    <div style={{ fontSize: 9, color: "var(--muted)", textAlign: "center" }}>+{cell.events.length - 3}</div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div style={{
          marginTop: 12, background: "var(--paper)", border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)", padding: "12px 14px",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            {new Date(selectedDate + "T00:00").toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}
          </div>
          {selectedEvents.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>当天没有日程</div>
          ) : (
            selectedEvents.map(ev => (
              <div key={ev.id} className="event-row" style={{
                borderLeftColor: ev.source === "trip" ? "var(--orange)" : ev.source === "voice" ? "var(--green)" : ev.source === "text" ? "var(--blue)" : "var(--muted)",
                marginBottom: 4,
              }}>
                <div className="ev-time">
                  {ev.allDay ? "全天" : new Date(ev.startsAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div>
                  <div className="ev-title">{ev.title}</div>
                  {ev.description && <div className="ev-desc">{ev.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <span className="badge">{ev.source === "trip" ? "行程" : ev.source === "voice" ? "语音" : ev.source === "text" ? "AI" : "手动"}</span>
                  <button onClick={() => handleDelete(ev.id)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--red)", fontSize: 12 }}>删除</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} currentPage="calendar" />

      {/* Toast */}
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
