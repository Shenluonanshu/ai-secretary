"use client";
import type { CalendarEvent, TodoItem, HabitWithStreak } from "@/lib/types";

interface DataOverviewProps {
  events: CalendarEvent[];
  todos: TodoItem[];
  habits: HabitWithStreak[];
}

const dayKey = (s: string) => s.slice(0, 10);
const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

export function DataOverview({ events, todos, habits }: DataOverviewProps) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  // Build 7-day calendar grid
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  });

  const pendingTodos = todos.filter(t => !t.completed);
  const todayStr = today.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });

  return (
    <div style={{ padding: "4px 0" }}>
      {/* ── Calendar Grid ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4,
        background: "var(--paper)", border: "1px solid var(--line)",
        borderRadius: "var(--radius-md)", overflow: "hidden",
        fontSize: 11, marginBottom: 12,
      }}>
        {/* Header row */}
        {weekDays.map((d, i) => {
          const dt = new Date(d);
          const isToday = d === todayStr;
          return (
            <div key={d} style={{
              textAlign: "center", padding: "6px 2px",
              background: isToday ? "var(--blue-soft)" : "var(--bg)",
              borderBottom: "1px solid var(--line)",
            }}>
              <div style={{ color: "var(--muted)", fontSize: 10 }}>{weekdays[dt.getDay()]}</div>
              <div style={{ fontWeight: isToday ? 800 : 500, color: isToday ? "var(--blue)" : "var(--ink-soft)", fontSize: 13 }}>
                {dt.getDate()}
              </div>
            </div>
          );
        })}
        {/* Event cells */}
        {weekDays.map((d) => {
          const dayEvents = events.filter(e => dayKey(e.startsAt) === d);
          return (
            <div key={`e-${d}`} style={{
              padding: "2px 3px", minHeight: 36,
              borderTop: d !== weekDays[0] ? "1px solid var(--line-soft)" : "none",
              background: d === todayStr ? "#fafbff" : "transparent",
            }}>
              {dayEvents.slice(0, 3).map(ev => (
                <div key={ev.id} style={{
                  background: ev.source === "trip" ? "var(--orange-soft)" :
                    ev.source === "voice" ? "var(--green-soft)" : "var(--blue-soft)",
                  color: "var(--ink-soft)", borderRadius: 3, padding: "1px 3px",
                  marginBottom: 1, fontSize: 9, lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  borderLeft: `2px solid ${
                    ev.source === "trip" ? "var(--orange)" :
                    ev.source === "voice" ? "var(--green)" : "var(--blue)"
                  }`,
                }}>
                  {ev.allDay ? "" : new Date(ev.startsAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }).slice(0, 5)} {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 9, color: "var(--muted)", textAlign: "center" }}>
                  +{dayEvents.length - 3} 更多
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <StatBadge label="本周日程" value={events.filter(e => weekDays.includes(dayKey(e.startsAt))).length} color="var(--blue)" />
        <StatBadge label="待办" value={`${todos.filter(t => t.completed).length}/${todos.length}`} color="var(--green)" />
        <StatBadge label="活跃习惯" value={habits.length} color="var(--orange)" />
      </div>

      {/* ── Habits List ── */}
      {habits.length > 0 && (
        <div style={{
          background: "var(--paper)", border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)", padding: "10px 12px",
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--ink-soft)" }}>
            🏃 习惯追踪
          </div>
          {habits.map(h => (
            <div key={h.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
              borderBottom: "1px solid var(--line-soft)", fontSize: 13,
            }}>
              <span>{h.icon}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{h.name}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>本周 {h.weekProgress}</span>
              {h.streak > 0 && <span style={{ fontSize: 11, color: "var(--orange)", fontWeight: 700 }}>🔥{h.streak}天</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── Pending Todos ── */}
      {pendingTodos.length > 0 && (
        <div style={{
          background: "var(--paper)", border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)", padding: "10px 12px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--ink-soft)" }}>
            ✅ 待完成 ({pendingTodos.length})
          </div>
          {pendingTodos.slice(0, 5).map(t => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "3px 0",
              fontSize: 13, color: "var(--ink-soft)",
            }}>
              <span>{t.priority === 2 ? "🔴" : t.priority === 1 ? "🟡" : "⚪"}</span>
              <span>{t.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      flex: 1, textAlign: "center", padding: "8px 4px",
      background: "var(--paper)", border: "1px solid var(--line)",
      borderRadius: "var(--radius-sm)",
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}
