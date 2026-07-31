export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function POST(request: NextRequest) {
  const { habitId } = await request.json();
  if (!habitId) return NextResponse.json({ error: "缺少 habitId" }, { status: 400 });
  if (onCloudflare()) {
    const { checkHabit } = await import("@/lib/life-d1");
    return NextResponse.json(await checkHabit(habitId));
  }
  const { checkHabit } = await import("@/lib/life-service");
  return NextResponse.json(await checkHabit(habitId));
}
