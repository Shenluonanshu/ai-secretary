"use client";
import type { CalendarEvent } from "@/lib/types";

interface EventCardProps {
  event: CalendarEvent;
  mode: "preview" | "confirm" | "past";
  onConfirm?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  fmtDate: (s: string, allDay?: boolean) => string;
}

const sourceIcon: Record<string, string> = {
  manual: "✎",
  text: "🤖",
  voice: "🎤",
  trip: "✈",
};

export function EventCard({ event, mode, onConfirm, onEdit, onDelete, fmtDate }: EventCardProps) {
  const isPast = mode === "past" || new Date(event.endsAt) < new Date();

  return (
    <article
      className={`event-card source-${event.source} ${mode === "confirm" ? "confirm" : ""}`}
      style={isPast ? { opacity: 0.6 } : undefined}
      role="article"
      aria-label={`日程: ${event.title}`}
    >
      <div className="ec-title">
        <span className="icon" aria-hidden="true">{sourceIcon[event.source] || "📅"}</span>
        {event.title}
      </div>
      <div className="ec-meta">
        <span>🕐 {fmtDate(event.startsAt, event.allDay)}</span>
        {event.allDay && <span>全天</span>}
        <span>🔔 提前 {event.reminders[0] || 30} 分钟</span>
        {event.recurrence !== "none" && (
          <span>
            🔄 {event.recurrence === "daily" ? "每天" : event.recurrence === "weekly" ? "每周" : "每月"}
          </span>
        )}
      </div>
      {event.description && <div className="ec-desc">{event.description}</div>}

      {mode === "confirm" && (
        <div className="ec-actions">
          <button className="primary" onClick={onConfirm} style={{ background: "var(--blue)", color: "#fff", border: 0 }}>
            确认保存
          </button>
          {onEdit && (
            <button onClick={onEdit}>修改</button>
          )}
          {onDelete && (
            <button className="danger" onClick={onDelete}>放弃</button>
          )}
        </div>
      )}

      {mode === "preview" && !isPast && (
        <div className="ec-actions">
          {onEdit && <button onClick={onEdit}>编辑</button>}
          {onDelete && <button className="danger" onClick={onDelete}>删除</button>}
        </div>
      )}
    </article>
  );
}
