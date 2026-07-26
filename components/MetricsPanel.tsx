"use client";
import type { CalendarEvent } from "@/lib/types";

const dayKey = (s: string) => s.slice(0, 10);

interface MetricsProps {
  events: CalendarEvent[];
  freeSlots: string[];
}

export function MetricsPanel({ events, freeSlots }: MetricsProps) {
  const now = new Date();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  const todayEvents = events.filter((e) => dayKey(e.startsAt) === today);
  const nextWeek = events.filter(
    (e) => new Date(e.startsAt) >= now && new Date(e.startsAt) < weekEnd,
  );

  const freeHours = freeSlots.reduce(
    (n, s) => n + (+s.slice(6, 8) - +s.slice(0, 2)),
    0,
  );

  return (
    <section className="metrics">
      <article>
        <span>今日安排</span>
        <strong>{todayEvents.length}</strong>
        <small>件待完成事件</small>
      </article>
      <article>
        <span>未来七天</span>
        <strong>{nextWeek.length}</strong>
        <small>件已确认安排</small>
      </article>
      <article>
        <span>今日可用时间</span>
        <strong>
          {freeHours || 0}
          <em>h</em>
        </strong>
        <small>工作时段 09:00–18:00</small>
      </article>
    </section>
  );
}
