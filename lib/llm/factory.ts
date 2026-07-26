import type { LLMProvider } from "@/lib/llm/types";
import { RuleBasedProvider } from "@/lib/llm/providers/rule-based";
import { OpenAIProvider } from "@/lib/llm/providers/openai";

let cachedProvider: LLMProvider | null = null;

export function createProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const provider = process.env.LLM_PROVIDER || "rule-based";

  switch (provider) {
    case "openai":
      cachedProvider = new OpenAIProvider();
      break;
    case "rule-based":
    default:
      cachedProvider = new RuleBasedProvider();
      break;
  }

  return cachedProvider;
}

// Reset for testing or config changes
export function resetProvider(): void {
  cachedProvider = null;
}
