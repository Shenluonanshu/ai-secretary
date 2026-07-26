export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "key") {
    // Cloudflare Pages: return VAPID key from environment variable directly
    return NextResponse.json({
      publicKey: process.env.VAPID_PUBLIC_KEY || "",
    });
  }

  // Reminder check — on Cloudflare, use client-side setTimeout reminders instead
  return NextResponse.json({
    sent: 0,
    message: "提醒由客户端管理",
  });
}
