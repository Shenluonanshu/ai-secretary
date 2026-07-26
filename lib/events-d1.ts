import { getDB, isCloudflare } from "./d1-client";
import type { CalendarEvent, EventDraft } from "./types";

// ── D1-based service (for Cloudflare Pages) ──

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  allDay: number;
  timezone: string;
  reminders: string;
  recurrence: string;
  source: string;
  createdAt: string;
}

function toApp(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    allDay: !!row.allDay,
    timezone: row.timezone,
    reminders: JSON.parse(row.reminders),
    recurrence: row.recurrence as CalendarEvent["recurrence"],
    source: row.source as CalendarEvent["source"],
    createdAt: row.createdAt,
  };
}

export async function getAll(): Promise<CalendarEvent[]> {
  const db = getDB();
  const { results } = await db
    .prepare("SELECT * FROM Event ORDER BY startsAt ASC")
    .all<EventRow>();
  return (results || []).map(toApp);
}

export async function findConflicts(
  startsAt: string,
  endsAt: string,
  excludeId?: string,
): Promise<CalendarEvent | null> {
  const db = getDB();
  let query = "SELECT * FROM Event WHERE startsAt < ?1 AND endsAt > ?2";
  const params: unknown[] = [endsAt, startsAt];
  if (excludeId) {
    query += " AND id != ?3";
    params.push(excludeId);
  }
  query += " LIMIT 1";
  const result = await db.prepare(query).bind(...params).first<EventRow>();
  return result ? toApp(result) : null;
}

export async function create(draft: EventDraft): Promise<CalendarEvent> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO Event (id, title, description, startsAt, endsAt, allDay, timezone, reminders, recurrence, source, createdAt)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    )
    .bind(
      id,
      draft.title,
      draft.description ?? null,
      draft.startsAt,
      draft.endsAt,
      draft.allDay ? 1 : 0,
      draft.timezone,
      JSON.stringify(draft.reminders),
      draft.recurrence,
      draft.source,
      now,
    )
    .run();
  return {
    id,
    ...draft,
    description: draft.description,
    createdAt: now,
  };
}

export async function update(
  id: string,
  draft: EventDraft,
): Promise<CalendarEvent | null> {
  const db = getDB();
  const existing = await db
    .prepare("SELECT * FROM Event WHERE id = ?1")
    .bind(id)
    .first<EventRow>();
  if (!existing) return null;

  await db
    .prepare(
      `UPDATE Event SET title=?1, description=?2, startsAt=?3, endsAt=?4, allDay=?5, timezone=?6, reminders=?7, recurrence=?8, source=?9 WHERE id=?10`,
    )
    .bind(
      draft.title,
      draft.description ?? null,
      draft.startsAt,
      draft.endsAt,
      draft.allDay ? 1 : 0,
      draft.timezone,
      JSON.stringify(draft.reminders),
      draft.recurrence,
      draft.source,
      id,
    )
    .run();
  return {
    id,
    ...draft,
    description: draft.description,
    createdAt: existing.createdAt,
  };
}

export async function remove(id: string): Promise<void> {
  const db = getDB();
  await db.prepare("DELETE FROM Event WHERE id = ?1").bind(id).run();
}

// ── Push subscription operations ──

export async function addPushSubscription(
  endpoint: string,
  keys: string,
): Promise<void> {
  const db = getDB();
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT OR REPLACE INTO PushSubscription (id, endpoint, keys, createdAt) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(id, endpoint, keys, new Date().toISOString())
    .run();
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const db = getDB();
  await db
    .prepare("DELETE FROM PushSubscription WHERE endpoint = ?1")
    .bind(endpoint)
    .run();
}

export async function getAllPushSubscriptions(): Promise<
  { endpoint: string; keys: { p256dh: string; auth: string } }[]
> {
  const db = getDB();
  const { results } = await db
    .prepare("SELECT endpoint, keys FROM PushSubscription")
    .all<{ endpoint: string; keys: string }>();
  return (results || []).map((r: { endpoint: string; keys: string }) => ({
    endpoint: r.endpoint,
    keys: JSON.parse(r.keys),
  }));
}
