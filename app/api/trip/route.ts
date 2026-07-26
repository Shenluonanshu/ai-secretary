export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import type { TripItem } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { destination, startDate, endDate, preference } = await request.json();
  if (!destination || !startDate || !endDate)
    return NextResponse.json({ error: "请补全目的地和日期" }, { status: 400 });

  const start = new Date(`${startDate}T09:00`);
  const end = new Date(`${endDate}T18:00`);
  if (end < start)
    return NextResponse.json({ error: "结束日期不能早于开始日期" }, { status: 400 });

  const items: TripItem[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    items.push(
      {
        id: crypto.randomUUID(),
        title: `${destination}｜${preference || "自由探索"}`,
        startsAt: `${day}T09:30`,
        endsAt: `${day}T12:00`,
        selected: true,
      },
      {
        id: crypto.randomUUID(),
        title: `${destination}｜午后安排`,
        startsAt: `${day}T14:00`,
        endsAt: `${day}T17:00`,
        selected: true,
      },
    );
  }

  return NextResponse.json({
    summary: `为你生成 ${destination} 的 ${items.length / 2} 天行程草案，可编辑后导入日历。`,
    items,
  });
}
