import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/llm/factory";
import type { LLMProvider } from "@/lib/llm/types";
import { parseChineseEvent } from "@/lib/date-parser";
import type { EventDraft } from "@/lib/types";

const provider: LLMProvider = createProvider();

export async function POST(request: NextRequest) {
  const { text, source } = await request.json();
  const now = new Date();

  // Use the configured provider (LLM or rule-based)
  const result = await provider.parseNaturalLanguage(text, now, source || "text");

  if (result.clarification) {
    return NextResponse.json({ clarification: result.clarification });
  }

  // If we got a draft from LLM, validate against rule-based parser
  if (result.draft && provider.name !== "rule-based") {
    const ruleResult = parseChineseEvent(text, now, source || "text");
    if (ruleResult.draft) {
      // Trust LLM for title extraction (usually better), but validate dates
      const llmDate = new Date(result.draft.startsAt);
      const ruleDate = new Date(ruleResult.draft.startsAt);
      const diffHours = Math.abs(llmDate.getTime() - ruleDate.getTime()) / 36e5;

      // If LLM date differs from rule engine by more than 24 hours, use rule engine's date
      if (diffHours > 24) {
        console.warn(
          `LLM date (${result.draft.startsAt}) differs from rule date (${ruleResult.draft.startsAt}) by ${diffHours}h, using rule date`,
        );
        return NextResponse.json({
          draft: {
            ...result.draft,
            startsAt: ruleResult.draft.startsAt,
            endsAt: ruleResult.draft.endsAt,
            allDay: ruleResult.draft.allDay,
          },
        });
      }
    }
  }

  return NextResponse.json({ draft: result.draft });
}
