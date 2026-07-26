// Cloudflare Pages Function — POST /api/trip
export async function onRequestPost({ request }: { request: Request }) {
  const { destination, startDate, endDate, preference } = await request.json() as Record<string, string>;
  if (!destination || !startDate || !endDate) return Response.json({ error: "请补全目的地和日期" }, { status: 400 });

  const start = new Date(`${startDate}T09:00`);
  const end = new Date(`${endDate}T18:00`);
  if (end < start) return Response.json({ error: "结束日期不能早于开始日期" }, { status: 400 });

  const items: Array<{ id: string; title: string; startsAt: string; endsAt: string; selected: boolean }> = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    items.push(
      { id: crypto.randomUUID(), title: `${destination}｜${preference || "自由探索"}`, startsAt: `${day}T09:30`, endsAt: `${day}T12:00`, selected: true },
      { id: crypto.randomUUID(), title: `${destination}｜午后安排`, startsAt: `${day}T14:00`, endsAt: `${day}T17:00`, selected: true },
    );
  }
  return Response.json({ summary: `为你生成 ${destination} 的 ${items.length / 2} 天行程草案。`, items });
}
