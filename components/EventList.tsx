"use client";
import type { CalendarEvent } from "@/lib/types";

interface EventListProps {
  events: CalendarEvent[];
  query: string;
  filter: "today" | "week" | "all";
  onQueryChange: (v: string) => void;
  onFilterChange: (v: "today" | "week" | "all") => void;
  onEdit: (e: CalendarEvent) => void;
  onRemove: (id: string) => void;
  fmtDate: (s: string, allDay?: boolean) => string;
}

export function EventList({
  events,
  query,
  filter,
  onQueryChange,
  onFilterChange,
  onEdit,
  onRemove,
  fmtDate,
}: EventListProps) {
  return (
    <article className="panel" id="calendar">
      <div className="panel-head">
        <div>
          <span className="eyebrow">日程中心</span>
          <h2>接下来的安排</h2>
        </div>
        <div className="segmented">
          <button
            className={filter === "today" ? "on" : ""}
            onClick={() => onFilterChange("today")}
          >
            今天
          </button>
          <button
            className={filter === "week" ? "on" : ""}
            onClick={() => onFilterChange("week")}
          >
            7 天
          </button>
          <button
            className={filter === "all" ? "on" : ""}
            onClick={() => onFilterChange("all")}
          >
            全部
          </button>
        </div>
      </div>
      <input
        className="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="搜索事件标题或备注"
      />
      {events.length ? (
        <div className="event-list">
          {events.map((event) => (
            <article className={`event source-${event.source}`} key={event.id}>
              <div className="event-time">{fmtDate(event.startsAt, event.allDay)}</div>
              <div className="event-copy">
                <b>{event.title}</b>
                <small>
                  {event.description || "无备注"} ·{" "}
                  {event.recurrence === "none"
                    ? "单次"
                    : `每${event.recurrence === "daily" ? "天" : event.recurrence === "weekly" ? "周" : "月"}`}
                </small>
              </div>
              <span className="badge">
                {event.source === "trip"
                  ? "行程"
                  : event.source === "voice"
                    ? "语音"
                    : event.source === "text"
                      ? "AI"
                      : "手动"}
              </span>
              <button className="icon" onClick={() => onEdit(event)}>
                编辑
              </button>
              <button className="icon danger" onClick={() => onRemove(event.id)}>
                删除
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">这个时间范围内没有日程。留白也是计划的一部分。</div>
      )}
    </article>
  );
}
