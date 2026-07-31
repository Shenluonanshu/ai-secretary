import type { LLMProvider } from "@/lib/llm/types";
import { RuleBasedProvider } from "@/lib/llm/providers/rule-based";
import { OpenAIProvider } from "@/lib/llm/providers/openai";

export function createProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "rule-based";

  switch (provider) {
    case "openai":
      return new OpenAIProvider();
    case "rule-based":
    default:
      return new RuleBasedProvider();
  }
}
