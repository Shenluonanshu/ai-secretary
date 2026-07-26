"use client";
import { useEffect } from "react";
import type { CalendarEvent } from "@/lib/types";

export function useNotifications(events: CalendarEvent[]) {
  useEffect(() => {
    const timers: number[] = [];
    if (window.Notification?.permission !== "granted") return;
    events.forEach((e) =>
      e.reminders.forEach((min) => {
        const delay = +new Date(e.startsAt) - Date.now() - min * 60_000;
        if (delay > 0 && delay < 2_147_000_000) {
          timers.push(
            window.setTimeout(
              () =>
                new window.Notification(`提醒：${e.title}`, {
                  body: `将在 ${min} 分钟后开始`,
                  tag: `${e.id}-${min}`,
                }),
              delay,
            ),
          );
        }
      }),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [events]);
}
