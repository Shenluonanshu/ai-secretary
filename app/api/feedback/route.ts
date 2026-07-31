export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body.rating === undefined) return NextResponse.json({ error: "请提供评分" }, { status: 400 });
  if (onCloudflare()) {
    const { submitFeedback } = await import("@/lib/life-d1");
    return NextResponse.json(await submitFeedback({ ...body, userAgent: request.headers.get("user-agent") || "" }));
  }
  const { submitFeedback } = await import("@/lib/life-service");
  return NextResponse.json(await submitFeedback({ ...body, userAgent: request.headers.get("user-agent") || "" }));
}
