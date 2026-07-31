"use client";

const TOKEN_KEY = "auth_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken(): boolean {
  return !!getToken();
}

// ── 用户自定义 LLM 配置 ──

const LLM_KEY = "user_llm_api_key";
const LLM_URL_KEY = "user_llm_api_url";
const LLM_MODEL_KEY = "user_llm_api_model";

export interface UserLLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getUserLLMConfig(): UserLLMConfig | null {
  if (typeof window === "undefined") return null;
  const apiKey = localStorage.getItem(LLM_KEY);
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: localStorage.getItem(LLM_URL_KEY) || "https://api.deepseek.com/v1",
    model: localStorage.getItem(LLM_MODEL_KEY) || "deepseek-chat",
  };
}

export function setUserLLMConfig(config: UserLLMConfig | null): void {
  if (!config) {
    localStorage.removeItem(LLM_KEY);
    localStorage.removeItem(LLM_URL_KEY);
    localStorage.removeItem(LLM_MODEL_KEY);
    return;
  }
  localStorage.setItem(LLM_KEY, config.apiKey);
  localStorage.setItem(LLM_URL_KEY, config.baseUrl);
  localStorage.setItem(LLM_MODEL_KEY, config.model);
}

export function hasUserLLMConfig(): boolean {
  return !!getUserLLMConfig();
}

// ── API 请求封装 ──

async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (typeof options.body === "string" && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }
  return fetch(url, { ...options, headers });
}

export { authFetch };
