export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/llm/factory";
import type { LLMProvider } from "@/lib/llm/types";
import { parseChineseEvent } from "@/lib/date-parser";

const provider: LLMProvider = createProvider();

export async function POST(request: NextRequest) {
  const { text, source } = await request.json();
  const now = new Date();

  const result = await provider.parseNaturalLanguage(text, now, source || "text");
  if (result.clarification) {
    return NextResponse.json({ clarification: result.clarification });
  }

  return NextResponse.json({ draft: result.draft });
}
