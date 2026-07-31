export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function GET() {
  if (onCloudflare()) {
    const { getSettings } = await import("@/lib/life-d1");
    return NextResponse.json(await getSettings());
  }
  const { getSettings } = await import("@/lib/life-service");
  return NextResponse.json(await getSettings());
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (onCloudflare()) {
    const { updateSettings } = await import("@/lib/life-d1");
    return NextResponse.json(await updateSettings(body));
  }
  const { updateSettings } = await import("@/lib/life-service");
  return NextResponse.json(await updateSettings(body));
}
