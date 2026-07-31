import type { LLMProvider, ParseResult } from "@/lib/llm/types";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/llm/prompts";
import type { EventDraft } from "@/lib/types";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";

  async parseNaturalLanguage(
    text: string,
    now: Date,
    _source: EventDraft["source"],
  ): Promise<ParseResult> {
    const apiKey = process.env.OPENAI_API_KEY || "";
    const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.LLM_MODEL || "gpt-4o-mini";

    if (!apiKey || apiKey === "sk-your-key-here") {
      return { clarification: "AI 服务未配置，请设置 OPENAI_API_KEY。" };
    }

    try {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: buildSystemPrompt(now) },
            { role: "user", content: buildUserPrompt(text) },
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error("LLM parse HTTP error:", response.status, errBody.slice(0, 200));
        return { clarification: "AI 服务暂时不可用，请稍后重试。" };
      }

      const data = await response.json() as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return { clarification: "AI 未能返回有效结果，请重试。" };
      }

      // 尝试提取 JSON（LLM 可能在 JSON 前后加了 markdown 代码块标记）
      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      const parsed = JSON.parse(jsonStr) as ParseResult & {
        title?: string;
        description?: string | null;
        startsAt?: string;
        endsAt?: string;
        allDay?: boolean;
        reminders?: number[];
        recurrence?: string;
      };
      const rawResponse = content;

      if (parsed.clarification) {
        return { clarification: parsed.clarification, rawResponse };
      }

      if (!parsed.draft?.title && parsed.title) {
        return {
          draft: {
            title: parsed.title,
            description: parsed.description ?? undefined,
            startsAt: parsed.startsAt!,
            endsAt: parsed.endsAt!,
            allDay: parsed.allDay ?? false,
            timezone: "Asia/Shanghai",
            reminders: parsed.reminders?.length ? parsed.reminders : [30],
            recurrence: (parsed.recurrence as EventDraft["recurrence"]) ?? "none",
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
