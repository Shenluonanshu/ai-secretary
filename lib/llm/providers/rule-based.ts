import type { LLMProvider, ParseResult } from "@/lib/llm/types";
import { parseChineseEvent } from "@/lib/date-parser";
import type { EventDraft } from "@/lib/types";

export class RuleBasedProvider implements LLMProvider {
  readonly name = "rule-based";

  async parseNaturalLanguage(
    text: string,
    now: Date,
    source: EventDraft["source"],
  ): Promise<ParseResult> {
    const result = parseChineseEvent(text, now, source);
    return {
      draft: result.draft,
      clarification: result.clarification,
    };
  }
}
