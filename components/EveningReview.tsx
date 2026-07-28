"use client";
import type { CalendarEvent, TodoItem, HabitWithStreak } from "@/lib/types";

interface EveningReviewProps {
  events: CalendarEvent[];
  todos: TodoItem[];
  habits: HabitWithStreak[];
}

const dayKey = (s: string) => s.slice(0, 10);

export function EveningReview({ events, todos, habits }: EveningReviewProps) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });

  const todayEvents = events.filter(e => dayKey(e.startsAt) === today);
  const tomorrowEvents = events.filter(e => dayKey(e.startsAt) === tomorrowStr);
  const doneTodos = todos.filter(t => t.completed);
  const pendingTodos = todos.filter(t => !t.completed);
  const checkedHabits = habits.filter(h => h.todayDone);

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{
        background: "linear-gradient(135deg, #1a2030, #2a3548)",
        color: "#e8edf5", borderRadius: "var(--radius-lg)", padding: "16px",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
          🌙 晚间回顾
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 14 }}>
          {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}
        </div>

        {/* Today's summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
          <StatCard label="今天日程" value={todayEvents.length} icon="📅" />
          <StatCard label="完成待办" value={doneTodos.length} icon="✅" />
          <StatCard label="坚持习惯" value={checkedHabits.length} icon="🏃" />
        </div>

        {/* Completed todos */}
        {doneTodos.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", marginBottom: 4 }}>
              今日完成
            </div>
            {doneTodos.slice(0, 3).map(t => (
              <div key={t.id} style={{ fontSize: 13, padding: "2px 0", opacity: 0.9 }}>
                ✓ {t.title}
              </div>
            ))}
          </div>
        )}

        {/* Tomorrow */}
        {tomorrowEvents.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.08)", borderRadius: "var(--radius-sm)",
            padding: "10px 12px", marginTop: 8,
          }}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
              明天 ({new Date(tomorrowStr).toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" })})
            </div>
            {tomorrowEvents.slice(0, 4).map(e => (
              <div key={e.id} style={{
                fontSize: 13, padding: "2px 0",
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{e.title}</span>
                <span style={{ opacity: 0.6, fontSize: 12 }}>
                  {e.allDay ? "全天" : new Date(e.startsAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pending reminder */}
        {pendingTodos.length > 0 && (
          <div style={{ fontSize: 12, marginTop: 10, opacity: 0.8 }}>
            💡 还有 {pendingTodos.length} 个待办没完成，明天继续加油！
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.07)", borderRadius: "var(--radius-sm)",
      padding: "8px", textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{icon} {value}</div>
      <div style={{ fontSize: 10, opacity: 0.7 }}>{label}</div>
    </div>
  );
}
