import { prisma } from "./db";
import type { CalendarEvent, EventDraft } from "./types";

function toApp(event: {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  timezone: string;
  reminders: string;
  recurrence: string;
  source: string;
  createdAt: Date;
}): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description ?? undefined,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    allDay: event.allDay,
    timezone: event.timezone,
    reminders: JSON.parse(event.reminders),
    recurrence: event.recurrence as CalendarEvent["recurrence"],
    source: event.source as CalendarEvent["source"],
    createdAt: event.createdAt.toISOString(),
  };
}

export async function getAll(): Promise<CalendarEvent[]> {
  const events = await prisma.event.findMany({ orderBy: { startsAt: "asc" } });
  return events.map(toApp);
}

export async function findConflicts(
  startsAt: string,
  endsAt: string,
  excludeId?: string,
): Promise<CalendarEvent | null> {
  const conflict = await prisma.event.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      startsAt: { lt: new Date(endsAt) },
      endsAt: { gt: new Date(startsAt) },
    },
  });
  return conflict ? toApp(conflict) : null;
}

export async function create(draft: EventDraft): Promise<CalendarEvent> {
  const event = await prisma.event.create({
    data: {
      title: draft.title,
      description: draft.description ?? null,
      startsAt: new Date(draft.startsAt),
      endsAt: new Date(draft.endsAt),
      allDay: draft.allDay,
      timezone: draft.timezone,
      reminders: JSON.stringify(draft.reminders),
      recurrence: draft.recurrence,
      source: draft.source,
    },
  });
  return toApp(event);
}

export async function update(
  id: string,
  draft: EventDraft,
): Promise<CalendarEvent | null> {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return null;
  const event = await prisma.event.update({
    where: { id },
    data: {
      title: draft.title,
      description: draft.description ?? null,
      startsAt: new Date(draft.startsAt),
      endsAt: new Date(draft.endsAt),
      allDay: draft.allDay,
      timezone: draft.timezone,
      reminders: JSON.stringify(draft.reminders),
      recurrence: draft.recurrence,
      source: draft.source,
    },
  });
  return toApp(event);
}

export async function remove(id: string): Promise<void> {
  await prisma.event.delete({ where: { id } });
}
