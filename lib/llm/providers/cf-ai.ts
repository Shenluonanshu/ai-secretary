// Cloudflare Workers AI Provider — 免费模型，无需外部 API Key
// 模型列表: https://developers.cloudflare.com/workers-ai/models/

import type { LLMProvider, ParseResult } from "@/lib/llm/types";
import type { EventDraft } from "@/lib/types";

// 中文优化的免费模型（按优先级排列）
const CHINESE_MODELS = [
  "@cf/qwen/qwen1.5-7b-chat-awq",       // 通义千问 7B（中文最佳）
  "@cf/zai-org/glm-4.7-flash",           // 智谱 GLM-4.7 Flash
  "@hf/thebloke/deepseek-coder-6.7b-instruct-awq", // DeepSeek 6.7B
];

export class CloudflareAIProvider implements LLMProvider {
  readonly name = "cf-ai";

  private getAIBinding() {
    try {
      const { getRequestContext } = require("@cloudflare/next-on-pages") as {
        getRequestContext: () => { env: Record<string, unknown> };
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getRequestContext().env as any).AI;
    } catch {
      return undefined;
    }
  }

  async parseNaturalLanguage(
    text: string,
    now: Date,
    _source: EventDraft["source"],
  ): Promise<ParseResult> {
    const ai = this.getAIBinding();
    if (!ai) {
      return { clarification: "CF AI 暂不可用，将使用规则引擎处理。" };
    }

    const today = now.toLocaleDateString("zh-CN", {
      year: "numeric", month: "long", day: "numeric", weekday: "long",
    });

    const systemPrompt = `你是日历事件解析器。将用户中文输入转JSON。

当前日期：${today}
时区：Asia/Shanghai

输出JSON格式：
{"title":"事件名","startsAt":"2026-08-01T15:00:00+08:00","endsAt":"2026-08-01T16:00:00+08:00","allDay":false,"reminders":[30],"recurrence":"none"}

规则：上午6-12点 下午12-18点 晚上18-22点。未指定默认9:00。明天=+1天。三点=15:00。
只输出JSON，不要其他文字。`;

    for (const model of CHINESE_MODELS) {
      try {
        const result = await ai.run(model, {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.1,
          max_tokens: 300,
        });

        const content = (result as { response?: string })?.response;
        if (!content) continue;

        // 提取 JSON
        let jsonStr = content.trim();
        const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) jsonStr = m[1].trim();

        const parsed = JSON.parse(jsonStr) as {
          title?: string; startsAt?: string; endsAt?: string;
          allDay?: boolean; reminders?: number[]; recurrence?: string;
          description?: string;
        };

        if (!parsed.title || !parsed.startsAt) continue;

        return {
          draft: {
            title: parsed.title,
            description: parsed.description ?? undefined,
            startsAt: parsed.startsAt,
            endsAt: parsed.endsAt || new Date(new Date(parsed.startsAt).getTime() + 3600000).toISOString(),
            allDay: parsed.allDay ?? false,
            timezone: "Asia/Shanghai",
            reminders: parsed.reminders?.length ? parsed.reminders : [30],
            recurrence: (parsed.recurrence as EventDraft["recurrence"]) ?? "none",
            source: "text",
          },
        };
      } catch {
        // 模型不可用，尝试下一个
        continue;
      }
    }

    return { clarification: "AI 模型暂时不可用，请重试或使用精确格式。" };
  }
}