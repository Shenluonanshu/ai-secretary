"use client";
import { useMemo } from "react";
import type { CalendarEvent } from "@/lib/types";

const dayKey = (s: string) => s.slice(0, 10);

export function useFreeSlots(events: CalendarEvent[], selectedDate: string) {
  return useMemo(() => {
    const base = new Date(`${selectedDate}T09:00`);
    const end = new Date(`${selectedDate}T18:00`);
    const occupied = events
      .filter((e) => dayKey(e.startsAt) === selectedDate)
      .map((e) => [Math.max(+new Date(e.startsAt), +base), Math.min(+new Date(e.endsAt), +end)] as const)
      .filter(([a, b]) => b > a)
      .sort((a, b) => a[0] - b[0]);

    let cursor = +base;
    const slots: string[] = [];
    occupied.forEach(([a, b]) => {
      if (a - cursor >= 30 * 60_000) {
        slots.push(
          `${new Date(cursor).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}–${new Date(a).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`,
        );
      }
      cursor = Math.max(cursor, b);
    });
    if (+end - cursor >= 30 * 60_000) {
      slots.push(
        `${new Date(cursor).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}–18:00`,
      );
    }
    return slots;
  }, [events, selectedDate]);
}
