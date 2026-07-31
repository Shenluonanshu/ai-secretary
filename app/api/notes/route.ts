export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function GET() {
  if (onCloudflare()) {
    const { getAllNotes } = await import("@/lib/life-d1");
    return NextResponse.json(await getAllNotes());
  }
  const { getAllNotes } = await import("@/lib/life-service");
  return NextResponse.json(await getAllNotes());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.title) return NextResponse.json({ error: "请输入笔记标题" }, { status: 400 });
  if (onCloudflare()) {
    const { createNote } = await import("@/lib/life-d1");
    return NextResponse.json(await createNote(body));
  }
  const { createNote } = await import("@/lib/life-service");
  return NextResponse.json(await createNote(body));
}

export async function PUT(request: NextRequest) {
  const { id, ...draft } = await request.json();
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  if (onCloudflare()) {
    const { updateNote } = await import("@/lib/life-d1");
    const result = await updateNote(id, draft);
    if (!result) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json(result);
  }
  const { updateNote } = await import("@/lib/life-service");
  const result = await updateNote(id, draft);
  if (!result) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (onCloudflare()) {
    const { deleteNote } = await import("@/lib/life-d1");
    await deleteNote(id);
  } else {
    const { deleteNote } = await import("@/lib/life-service");
    await deleteNote(id);
  }
  return NextResponse.json({ ok: true });
}
