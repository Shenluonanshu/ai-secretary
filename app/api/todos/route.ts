import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function GET() {
  if (onCloudflare()) {
    const { getAllTodos } = await import("@/lib/life-d1");
    return NextResponse.json(await getAllTodos());
  }
  const { getAllTodos } = await import("@/lib/life-service");
  return NextResponse.json(await getAllTodos());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.title) return NextResponse.json({ error: "请输入待办标题" }, { status: 400 });
  if (onCloudflare()) {
    const { createTodo } = await import("@/lib/life-d1");
    return NextResponse.json(await createTodo(body));
  }
  const { createTodo } = await import("@/lib/life-service");
  return NextResponse.json(await createTodo(body));
}

export async function PUT(request: NextRequest) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 });
  if (onCloudflare()) {
    const { toggleTodo } = await import("@/lib/life-d1");
    const result = await toggleTodo(id);
    if (!result) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json(result);
  }
  const { toggleTodo } = await import("@/lib/life-service");
  const result = await toggleTodo(id);
  if (!result) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (onCloudflare()) {
    const { deleteTodo } = await import("@/lib/life-d1");
    await deleteTodo(id);
  } else {
    const { deleteTodo } = await import("@/lib/life-service");
    await deleteTodo(id);
  }
  return NextResponse.json({ ok: true });
}
