export const runtime = "edge";

import { NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function GET() {
  if (onCloudflare()) {
    const { generateBriefing } = await import("@/lib/life-d1");
    return NextResponse.json(await generateBriefing());
  }
  const { generateBriefing } = await import("@/lib/life-service");
  return NextResponse.json(await generateBriefing());
}
