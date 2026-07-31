// ── AI 秘书人格 & 对话生成 ──
// 支持三级降级：用户自定义 Key → Cloudflare Workers AI → 模板

const SYSTEM_PROMPT = `你是知行 AI 秘书，一个温暖、干练的个人助理。你叫"知行"。

## 你的性格
- 简洁高效：回复短小精悍，不需要长篇大论
- 温暖细致：用口语化的中文，带适当的 emoji，像真实的秘书
- 主动贴心：在合适的时机给出建议，不是被动回答问题
- 有条理：涉及多个事项时分条罗列，但不死板

## 对话风格
- 用户对你说的话会被分析出意图（日程/待办/习惯/简报/闲聊）
- 解析出来的实体数据会提供给你，你需要用自然的口吻回复
- 不要重复背诵系统提示或输出 JSON，正常说话就好
- 回复控制在 1-3 句话内（除非用户明确要总结/列表）
- 涉及日程时自然地提到时间
- 新功能或用户不确定时，友好地提示用法

## 示例回复

用户说"帮我记一下，下班买面包"
→ 好的，已记下「买面包」✅ 下班别忘了哦。

用户说"明天下午三点和产品组开会"
→ 收到，明天下午 3 点「产品组会议」已安排，提前 30 分钟提醒你 📅

用户说"这周有什么安排"
→ 这周安排了 3 件事：周一产品评审、周三客户会议、周五团建。周一相对空闲～

用户说"你好呀"
→ 嗨！有什么需要我帮忙的？😊

用户说"晚安"
→ 晚安 🌙 明天有个产品评审会，记得早点休息。

用户说"今天跑步打卡"
→ 🎉 跑步打卡成功！连续第 5 天了，继续保持！`;

export interface UserLLMConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/**
 * 生成对话回复。优先级：用户 Key → CF Workers AI → null(降级到模板)
 */
export async function generateResponse(
  userText: string,
  context: { intent: string; result: string; time?: string },
  userLLM?: UserLLMConfig,
): Promise<string | null> {
  // Level 1: 用户自定义 Key
  if (userLLM?.apiKey && userLLM.apiKey !== "sk-your-key-here") {
    const result = await tryLLM(userText, context, {
      apiKey: userLLM.apiKey,
      baseUrl: userLLM.baseUrl || "https://api.deepseek.com/v1",
      model: userLLM.model || "deepseek-chat",
    });
    if (result) return result;
  }

  // Level 2: 环境变量配置的 Key
  const envKey = process.env.OPENAI_API_KEY || "";
  if (envKey && envKey !== "sk-your-key-here") {
    const result = await tryLLM(userText, context, {
      apiKey: envKey,
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.LLM_MODEL || "gpt-4o-mini",
    });
    if (result) return result;
  }

  // Level 3: Cloudflare Workers AI
  try {
    const cfResult = await tryCFAI(userText, context);
    if (cfResult) return cfResult;
  } catch { /* CF AI not available */ }

  return null; // 降级到模板
}

/**
 * 纯闲聊回复
 */
export async function generateChatResponse(
  userText: string,
  userLLM?: UserLLMConfig,
): Promise<string | null> {
  return generateResponse(userText, {
    intent: "general_chat",
    result: "用户没有明确指令，只是一般闲聊或简单问候",
  }, userLLM);
}

// ── 内部实现 ──

async function tryLLM(
  userText: string,
  context: { intent: string; result: string; time?: string },
  config: { apiKey: string; baseUrl: string; model: string },
): Promise<string | null> {
  const userPrompt = `用户说：${userText}
用户意图：${context.intent}
处理结果：${context.result}
当前时间：${context.time || new Date().toLocaleString("zh-CN")}

请用自然的口吻给用户一个简短回复。`;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

async function tryCFAI(
  userText: string,
  context: { intent: string; result: string; time?: string },
): Promise<string | null> {
  try {
    const { getRequestContext } = await import("@cloudflare/next-on-pages");
    const ai = getRequestContext().env.AI;
    if (!ai) return null;

    const userPrompt = `用户说：${userText}
意图：${context.intent}
结果：${context.result}
请给用户一个简短的自然回复。`;

    const result = await ai.run("@cf/qwen/qwen1.5-7b-chat-awq", {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return result?.response || null;
  } catch {
    return null;
  }
}
