import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function GET() {
  if (onCloudflare()) {
    const { loadConversation } = await import("@/lib/conversation-d1");
    const data = await loadConversation("default");
    return NextResponse.json(data || { messages: [] });
  }
  const { loadConversation } = await import("@/lib/conversation-service");
  const data = await loadConversation("default");
  return NextResponse.json(data || { messages: [] });
}

export async function POST(request: NextRequest) {
  const { title, messages } = await request.json();
  if (onCloudflare()) {
    const { saveConversation } = await import("@/lib/conversation-d1");
    await saveConversation("default", title || "对话", messages);
  } else {
    const { saveConversation } = await import("@/lib/conversation-service");
    await saveConversation("default", title || "对话", messages);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (onCloudflare()) {
    const { deleteConversation } = await import("@/lib/conversation-d1");
    await deleteConversation("default");
  } else {
    const { deleteConversation } = await import("@/lib/conversation-service");
    await deleteConversation("default");
  }
  return NextResponse.json({ ok: true });
}
