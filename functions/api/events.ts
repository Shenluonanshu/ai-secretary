// Cloudflare Pages Function — /api/events (GET, POST, PUT, DELETE)
export async function onRequestGet({ env }: { env: { DB: D1Database } }) {
  const { results } = await env.DB.prepare("SELECT * FROM Event ORDER BY startsAt ASC").all();
  const events = (results || []).map((r: Record<string, unknown>) => ({
    ...r,
    reminders: JSON.parse((r.reminders as string) || "[30]"),
    allDay: !!(r.allDay as number),
    createdAt: (r.createdAt as string) || new Date().toISOString(),
  }));
  return Response.json(events);
}

export async function onRequestPost({ request, env }: { request: Request; env: { DB: D1Database } }) {
  const draft = await request.json() as Record<string, unknown>;
  if (!draft.title || !draft.startsAt || !draft.endsAt) return Response.json({ error: "缺少事件信息" }, { status: 400 });
  if (new Date(draft.endsAt as string) <= new Date(draft.startsAt as string)) return Response.json({ error: "结束时间必须晚于开始时间" }, { status: 400 });

  const conflict = await env.DB.prepare("SELECT id, title FROM Event WHERE startsAt < ?1 AND endsAt > ?2 LIMIT 1").bind(draft.endsAt as string, draft.startsAt as string).first<{ id: string; title: string }>();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO Event (id,title,description,startsAt,endsAt,allDay,timezone,reminders,recurrence,source,createdAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`)
    .bind(id, draft.title as string, (draft.description as string) || null, draft.startsAt as string, draft.endsAt as string, draft.allDay ? 1 : 0, (draft.timezone as string) || "Asia/Shanghai", JSON.stringify(draft.reminders || [30]), (draft.recurrence as string) || "none", (draft.source as string) || "manual", now).run();

  return Response.json({ event: { id, ...draft, createdAt: now }, conflict: conflict || null });
}

export async function onRequestPut({ request, env }: { request: Request; env: { DB: D1Database } }) {
  const { id, ...draft } = await request.json() as Record<string, unknown>;
  if (!id || !draft.title || !draft.startsAt || !draft.endsAt) return Response.json({ error: "缺少事件信息" }, { status: 400 });
  if (new Date(draft.endsAt as string) <= new Date(draft.startsAt as string)) return Response.json({ error: "结束时间必须晚于开始时间" }, { status: 400 });

  const existing = await env.DB.prepare("SELECT id FROM Event WHERE id = ?1").bind(id as string).first();
  if (!existing) return Response.json({ error: "未找到该事件" }, { status: 404 });

  const conflict = await env.DB.prepare("SELECT id, title FROM Event WHERE id != ?1 AND startsAt < ?2 AND endsAt > ?3 LIMIT 1").bind(id as string, draft.endsAt as string, draft.startsAt as string).first<{ id: string; title: string }>();

  await env.DB.prepare(`UPDATE Event SET title=?1,description=?2,startsAt=?3,endsAt=?4,allDay=?5,timezone=?6,reminders=?7,recurrence=?8,source=?9 WHERE id=?10`)
    .bind(draft.title as string, (draft.description as string) || null, draft.startsAt as string, draft.endsAt as string, draft.allDay ? 1 : 0, (draft.timezone as string) || "Asia/Shanghai", JSON.stringify(draft.reminders || [30]), (draft.recurrence as string) || "none", (draft.source as string) || "manual", id as string).run();

  return Response.json({ event: { id, ...draft }, conflict: conflict || null });
}

export async function onRequestDelete({ request, env }: { request: Request; env: { DB: D1Database } }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) await env.DB.prepare("DELETE FROM Event WHERE id = ?1").bind(id).run();
  return Response.json({ ok: true });
}
