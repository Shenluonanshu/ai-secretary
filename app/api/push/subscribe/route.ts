import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { endpoint, keys } = await request.json();
  if (!endpoint || !keys) {
    return NextResponse.json({ error: "缺少订阅信息" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { keys: JSON.stringify(keys) },
    create: { endpoint, keys: JSON.stringify(keys) },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { endpoint } = await request.json();
  if (!endpoint) {
    return NextResponse.json({ error: "缺少 endpoint" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
