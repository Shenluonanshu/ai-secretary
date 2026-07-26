import type { EventDraft } from "@/lib/types";

export interface ParseResult {
  draft?: EventDraft;
  clarification?: string;
  rawResponse?: string;
}

export interface LLMProvider {
  readonly name: string;
  parseNaturalLanguage(
    text: string,
    now: Date,
    source: EventDraft["source"],
  ): Promise<ParseResult>;
}
