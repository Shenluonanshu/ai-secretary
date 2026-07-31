export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function GET() {
  if (onCloudflare()) {
    const { getAllHabits } = await import("@/lib/life-d1");
    return NextResponse.json(await getAllHabits());
  }
  const { getAllHabits } = await import("@/lib/life-service");
  return NextResponse.json(await getAllHabits());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: "请输入习惯名称" }, { status: 400 });
  if (onCloudflare()) {
    const { createHabit } = await import("@/lib/life-d1");
    return NextResponse.json(await createHabit(body));
  }
  const { createHabit } = await import("@/lib/life-service");
  return NextResponse.json(await createHabit(body));
}

export async function PUT(request: NextRequest) {
  const { id } = await request.json();
  if (onCloudflare()) {
    const { archiveHabit } = await import("@/lib/life-d1");
    await archiveHabit(id);
  } else {
    const { archiveHabit } = await import("@/lib/life-service");
    await archiveHabit(id);
  }
  return NextResponse.json({ ok: true });
}
