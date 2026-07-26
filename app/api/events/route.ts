import { NextRequest, NextResponse } from "next/server";
import { getAll, create, update, remove, findConflicts } from "@/lib/events-service";
import type { EventDraft } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getAll());
}

export async function POST(request: NextRequest) {
  const draft = (await request.json()) as EventDraft;
  if (!draft.title || !draft.startsAt || !draft.endsAt)
    return NextResponse.json({ error: "缺少事件信息" }, { status: 400 });
  if (new Date(draft.endsAt) <= new Date(draft.startsAt))
    return NextResponse.json({ error: "结束时间必须晚于开始时间" }, { status: 400 });

  const conflict = await findConflicts(draft.startsAt, draft.endsAt);
  const event = await create(draft);
  return NextResponse.json({ event, conflict });
}

export async function PUT(request: NextRequest) {
  const { id, ...draft } = (await request.json()) as EventDraft & { id: string };
  if (!id || !draft.title || !draft.startsAt || !draft.endsAt)
    return NextResponse.json({ error: "缺少事件信息" }, { status: 400 });
  if (new Date(draft.endsAt) <= new Date(draft.startsAt))
    return NextResponse.json({ error: "结束时间必须晚于开始时间" }, { status: 400 });

  const existing = await update(id, draft);
  if (!existing)
    return NextResponse.json({ error: "未找到该事件" }, { status: 404 });

  const conflict = await findConflicts(draft.startsAt, draft.endsAt, id);
  return NextResponse.json({ event: existing, conflict });
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  await remove(id!);
  return NextResponse.json({ ok: true });
}
