import OpenAI from "openai";
import type { LLMProvider, ParseResult } from "@/lib/llm/types";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/llm/prompts";
import type { EventDraft } from "@/lib/types";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";

  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    });
    this.model = process.env.LLM_MODEL || "gpt-4o-mini";
  }

  async parseNaturalLanguage(
    text: string,
    now: Date,
    _source: EventDraft["source"],
  ): Promise<ParseResult> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: buildSystemPrompt(now) },
          { role: "user", content: buildUserPrompt(text) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { clarification: "AI 未能返回有效结果，请重试。" };
      }

      const parsed = JSON.parse(content) as ParseResult & {
        title?: string;
      };
      const rawResponse = content;

      if (parsed.clarification) {
        return { clarification: parsed.clarification, rawResponse };
      }

      if (!parsed.draft?.title && parsed.title) {
        return {
          draft: {
            title: parsed.title,
            description: (parsed as Record<string, unknown>).description as string ?? null,
            startsAt: (parsed as Record<string, unknown>).startsAt as string,
            endsAt: (parsed as Record<string, unknown>).endsAt as string,
            allDay: (parsed as Record<string, unknown>).allDay as boolean ?? false,
            timezone: "Asia/Shanghai",
            reminders: (parsed as Record<string, unknown>).reminders as number[] ?? [30],
            recurrence: ((parsed as Record<string, unknown>).recurrence as EventDraft["recurrence"]) ?? "none",
            source: "text",
          },
          rawResponse,
        };
      }

      return {
        draft: parsed.draft
          ? {
              ...parsed.draft,
              timezone: parsed.draft.timezone || "Asia/Shanghai",
              reminders: parsed.draft.reminders?.length ? parsed.draft.reminders : [30],
              recurrence: parsed.draft.recurrence || "none",
              source: "text",
            }
          : undefined,
        clarification: parsed.clarification,
        rawResponse,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("OpenAI parse error:", message);
      return { clarification: "AI 服务暂时不可用，请稍后重试或用精确格式录入。" };
    }
  }
}
