export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function POST(request: NextRequest) {
  const { endpoint, keys } = await request.json();
  if (!endpoint || !keys) {
    return NextResponse.json({ error: "缺少订阅信息" }, { status: 400 });
  }

  if (onCloudflare()) {
    const { addPushSubscription } = await import("@/lib/events-d1");
    await addPushSubscription(endpoint, JSON.stringify(keys));
  } else {
    const { prisma } = await import("@/lib/db");
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { keys: JSON.stringify(keys) },
      create: { endpoint, keys: JSON.stringify(keys) },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { endpoint } = await request.json();
  if (!endpoint) {
    return NextResponse.json({ error: "缺少 endpoint" }, { status: 400 });
  }

  if (onCloudflare()) {
    const { removePushSubscription } = await import("@/lib/events-d1");
    await removePushSubscription(endpoint);
  } else {
    const { prisma } = await import("@/lib/db");
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }
  return NextResponse.json({ ok: true });
}
