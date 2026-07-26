import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";
import type { EventDraft } from "@/lib/types";

export async function GET() {
  if (onCloudflare()) {
    const { getAll } = await import("@/lib/events-d1");
    return NextResponse.json(await getAll());
  }
  const { getAll } = await import("@/lib/events-service");
  return NextResponse.json(await getAll());
}

export async function POST(request: NextRequest) {
  const draft = (await request.json()) as EventDraft;
  if (!draft.title || !draft.startsAt || !draft.endsAt)
    return NextResponse.json({ error: "缺少事件信息" }, { status: 400 });
  if (new Date(draft.endsAt) <= new Date(draft.startsAt))
    return NextResponse.json({ error: "结束时间必须晚于开始时间" }, { status: 400 });

  if (onCloudflare()) {
    const { findConflicts, create } = await import("@/lib/events-d1");
    const conflict = await findConflicts(draft.startsAt, draft.endsAt);
    const event = await create(draft);
    return NextResponse.json({ event, conflict });
  }
  const { findConflicts, create } = await import("@/lib/events-service");
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

  if (onCloudflare()) {
    const { update, findConflicts } = await import("@/lib/events-d1");
    const existing = await update(id, draft);
    if (!existing) return NextResponse.json({ error: "未找到该事件" }, { status: 404 });
    const conflict = await findConflicts(draft.startsAt, draft.endsAt, id);
    return NextResponse.json({ event: existing, conflict });
  }
  const { update, findConflicts } = await import("@/lib/events-service");
  const existing = await update(id, draft);
  if (!existing) return NextResponse.json({ error: "未找到该事件" }, { status: 404 });
  const conflict = await findConflicts(draft.startsAt, draft.endsAt, id);
  return NextResponse.json({ event: existing, conflict });
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (onCloudflare()) {
    const { remove } = await import("@/lib/events-d1");
    await remove(id!);
  } else {
    const { remove } = await import("@/lib/events-service");
    await remove(id!);
  }
  return NextResponse.json({ ok: true });
}
