import type { LLMProvider } from "@/lib/llm/types";
import { RuleBasedProvider } from "@/lib/llm/providers/rule-based";
import { OpenAIProvider } from "@/lib/llm/providers/openai";
import { CloudflareAIProvider } from "@/lib/llm/providers/cf-ai";

/**
 * 创建 LLM Provider，按优先级：
 * 1. openai — 使用用户自定义 API Key（运行时传入）
 * 2. cf-ai — Cloudflare Workers AI 免费模型
 * 3. rule-based — 纯本地正则引擎（始终可用）
 */
export function createProvider(providerName?: string): LLMProvider {
  const name = providerName || process.env.LLM_PROVIDER || "rule-based";

  switch (name) {
    case "openai":
      return new OpenAIProvider();
    case "cf-ai":
      return new CloudflareAIProvider();
    case "rule-based":
    default:
      return new RuleBasedProvider();
  }
}
