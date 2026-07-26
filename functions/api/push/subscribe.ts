// Cloudflare Pages Function — POST/DELETE /api/push/subscribe
export async function onRequestPost({ request, env }: { request: Request; env: { DB: D1Database } }) {
  const { endpoint, keys } = await request.json() as { endpoint: string; keys: Record<string, string> };
  if (!endpoint || !keys) return Response.json({ error: "缺少订阅信息" }, { status: 400 });
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT OR REPLACE INTO PushSubscription (id, endpoint, keys, createdAt) VALUES (?1, ?2, ?3, ?4)")
    .bind(id, endpoint, JSON.stringify(keys), new Date().toISOString()).run();
  return Response.json({ ok: true });
}

export async function onRequestDelete({ request, env }: { request: Request; env: { DB: D1Database } }) {
  const { endpoint } = await request.json() as { endpoint: string };
  if (!endpoint) return Response.json({ error: "缺少 endpoint" }, { status: 400 });
  await env.DB.prepare("DELETE FROM PushSubscription WHERE endpoint = ?1").bind(endpoint).run();
  return Response.json({ ok: true });
}
