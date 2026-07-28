"use client";
import type { BriefingData } from "@/lib/types";

interface BriefingCardProps {
  briefing: BriefingData;
}

export function BriefingCard({ briefing }: BriefingCardProps) {
  return (
    <div className="briefing-card">
      <div className="br-greeting">{briefing.greeting}</div>
      <div className="br-date">{briefing.date}</div>

      <div className="br-section">
        <h4>📅 今日日程 ({briefing.eventCount})</h4>
        {briefing.upcomingEvents.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>今天没有安排，享受自由的一天 ☀️</p>
        ) : (
          briefing.upcomingEvents.slice(0, 5).map((ev) => (
            <p key={ev.id} style={{ fontSize: 13, margin: "2px 0" }}>
              {ev.allDay ? "全天" : new Date(ev.startsAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} {" "}
              {ev.title}
            </p>
          ))
        )}
      </div>

      {briefing.todoCount > 0 && (
        <div className="br-section">
          <h4>✅ 待办 ({briefing.pendingTodoCount}/{briefing.todoCount})</h4>
        </div>
      )}

      {briefing.habits.length > 0 && (
        <div className="br-section">
          <h4>🏃 习惯进度</h4>
          {briefing.habits.map((h) => (
            <p key={h.id} style={{ fontSize: 13, margin: "2px 0" }}>
              {h.icon} {h.name} · {h.weekProgress} · 🔥 {h.streak} 天
            </p>
          ))}
        </div>
      )}

      {briefing.suggestion && (
        <div className="br-section">
          <h4>💡 建议</h4>
          <p>{briefing.suggestion}</p>
        </div>
      )}

      {briefing.holidayCountdown && (
        <div className="br-section" style={{ marginTop: 14, padding: "10px 12px", background: "var(--blue-soft)", borderRadius: "var(--radius-sm)" }}>
          <h4 style={{ marginBottom: 2 }}>🎊 节假日</h4>
          <p style={{ fontWeight: 600 }}>{briefing.holidayCountdown}</p>
          {briefing.upcomingHolidays && briefing.upcomingHolidays.slice(1, 3).map(h => (
            <p key={h.date} style={{ fontSize: 12, margin: "1px 0", color: "var(--ink-soft)" }}>
              📅 {h.name}：{new Date(h.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" })}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
