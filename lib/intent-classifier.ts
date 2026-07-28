// ── 意图分类器：正则初筛 + LLM 兜底 ──
import type { EventDraft } from "./types";
import { createProvider } from "./llm/factory";
import type { LLMProvider, ParseResult } from "./llm/types";

export type Intent =
  | "create_event"
  | "query_events"
  | "update_event"
  | "delete_event"
  | "create_todo"
  | "query_todos"
  | "complete_todo"
  | "create_note"
  | "query_notes"
  | "create_habit"
  | "log_habit"
  | "query_habits"
  | "show_briefing"
  | "check_free_time"
  | "general_chat"
  | "help";

export interface IntentResult {
  intent: Intent;
  confidence: number; // 0-1
  entities?: Record<string, string>; // extracted entities
}

// ── Regex patterns (broad coverage) ──

const PATTERNS: { intent: Intent; patterns: RegExp[]; weight: number }[] = [
  {
    intent: "show_briefing",
    patterns: [
      /简报|每日.*(?:汇总|总结|报告|简报)|今[天日].*(?:总|概|汇|全部|所有).*(?:览|况|看|览一下)/,
      /早安|早上好|今天.*(?:怎么|什么|有啥|有哪些|什么情况|安排)/,
      /(?:看看|说说|告诉).*(?:今[天日]|每日|简报)/,
    ],
    weight: 0.9,
  },
  {
    intent: "create_todo",
    patterns: [
      /(?:记|写|加|创建|新建|添加).*(?:一下|个|一个).*(?:待办|任务|事项|备忘|提醒)/,
      /(?:帮我|给我|替[我我们]).*(?:记|写|加|创建|添加).*(?:一下|个|一下|个)/,
      /待办.*(?:创建|添加|新建|加|记|写)/,
      /(?:别忘了|记得|记住|别忘了要|记得要|别忘了去|我要|我得|我想)[^点分秒]/,
      /(?:提醒我|提醒我[要去做]?|提醒).*(?:要做|要去|去买|要买|要完成|要处理)/,
      /(?:做个|加个|记个|写个).*(?:备忘|提醒|待办|任务)/,
      /我.*(?:要记|得记|想记|记一下|记着|记个事|记件事|备忘一下)/,
      /(?:有事|有个事|有件事).*(?:要记|得记|想记|记下来)/,
      /(?:帮我|给我).*(?:写下来|记下来|记住)/,
      /(?:写|记).*(?:在|到).*(?:备忘|待办|清单)/,
    ],
    weight: 0.85,
  },
  {
    intent: "query_todos",
    patterns: [
      /(?:查看|看看|显示|列出|我[的有]).*(?:待办|任务|事项).*(?:列表|清单|有哪些|有什么)/,
      /还有.*(?:什么|哪些).*(?:没做|没完成|要做|待办)/,
      /待办.*(?:列表|清单|情况|状态)/,
      /(?:有什么|有哪些).*(?:待办|任务|事项)/,
    ],
    weight: 0.85,
  },
  {
    intent: "complete_todo",
    patterns: [
      /(?:完成|做完|搞定|标记).*(?:待办|任务|事项)/,
      /(?:勾掉|划掉|✔|✓).*(?:待办|任务)/,
    ],
    weight: 0.8,
  },
  {
    intent: "create_habit",
    patterns: [
      /(?:添加|创建|新建|开始|加个).*(?:习惯|打卡)/,
      /我想.*(?:养成|开始|坚持|培养).*(?:习惯|每天)/,
      /(?:每天|每日|每周).*(?:想|要|准备|打算).*(?:做|坚持|养成)/,
      /习惯.*(?:添加|创建|新建)/,
    ],
    weight: 0.85,
  },
  {
    intent: "log_habit",
    patterns: [
      /(?:今天|今日).*(?:打卡|完成了|做完了|做了)/,
      /(?:打卡|已完成|完成了|已?做[完了]).*(?:今天|今日|\d+天)/,
      /[一-鿿]{1,6}.*(?:打卡|完成[了啦]|已[经完]|做了|做完了|搞定了|坚持了)/,
      /(?:坚持|连续).*\d+.*[天日]/,
      /(?:今天|今日).*(?:跑[了步]|运动|健身|阅读|读书|冥想|学习|练琴|写[作了]|游泳)/,
    ],
    weight: 0.8,
  },
  {
    intent: "query_habits",
    patterns: [
      /(?:查看|看看|显示|列出).*(?:习惯|打卡)/,
      /(?:我的|我[的有]).*(?:习惯|打卡).*(?:情况|列表|记录|怎样|如何|怎么样)/,
      /习惯.*(?:列表|情况|状态|怎样|如何|怎么样)/,
      /(?:最近).*(?:习惯|打卡).*(?:怎么样|怎样|如何)/,
    ],
    weight: 0.85,
  },
  {
    intent: "query_events",
    patterns: [
      /(?:查看|看看|显示|列出|我[的有]|查[看下询]).*(?:日程|安排|日历|会议|事件).*(?:列表|有哪些|有什么)/,
      /(?:今[天日]|明[天日]|这周|本周|下周).*(?:有什么|有哪些|什么|怎么).*(?:安排|日程|会议|事)/,
      /(?:什么|哪些).*(?:日程|安排|会议|事).*(?:今[天日]|明[天日]|这周|本周|下周)/,
      /日程.*(?:列表|情况|状态|汇总|一览)/,
      /(?:帮我|给我|替我).*(?:查|查看|查查|查询).*(?:日程|安排|日历|一下日程|下日程)/,
      /(?:有什么|有哪些).*(?:安排|日程|会议).*[？?]?$/,
      /(?:日程|日历).*(?:怎么样|满不满|空不空|多不多)/,
    ],
    weight: 0.85,
  },
  {
    intent: "delete_event",
    patterns: [
      /(?:删除|取消|去掉|移除).*(?:日程|安排|会议|事件)/,
      /(?:这个|那个).*(?:日程|安排|会议).*(?:删|取消|不要了)/,
    ],
    weight: 0.8,
  },
  {
    intent: "check_free_time",
    patterns: [
      /(?:什么时候|几点|哪个时段|什么时间).*(?:有空|空闲|没事|没有安排)/,
      /(?:空闲|有空|没事).*(?:时间|时段|什么时候)/,
      /(?:找|看看|查[看找]).*(?:空闲|空余|可用).*(?:时间|时段)/,
    ],
    weight: 0.8,
  },
  {
    intent: "create_note",
    patterns: [
      /(?:写|记|创建|新建).*(?:笔记|备忘|记录)/,
      /笔记.*(?:创建|添加|新建|写)/,
    ],
    weight: 0.8,
  },
  {
    intent: "help",
    patterns: [
      /(?:帮助|怎么[用使]|能[做干]什么|功能|用法|使用说明)/,
      /(?:你[能会]|可以).*(?:做|干|帮|帮助|怎么用)/,
    ],
    weight: 0.9,
  },
];

// ── Prefixes to strip from todo titles (longest first to match greedily) ──
const TODO_PREFIXES = [
  "帮我记一下",
  "我要记一下",
  "我有个事要记",
  "帮我记个",
  "提醒我一下",
  "创建待办",
  "添加待办",
  "新建待办",
  "帮我记",
  "提醒我",
  "别忘了",
  "我要记",
  "记一下",
  "得记一下",
  "想记一下",
  "记下来",
  "记个事",
  "记个",
  "写个",
  "加个",
  "记得",
  "记着",
  "帮我",
];

const HABIT_NAME_EXTRACTION = [
  /(?:添加习惯|创建习惯|新建习惯)[：:\s]*[，,\s]*(.+)/,
  /(?:每天|每日|每周).*(?:要|想|准备|打算).*(.+)/,
];

/**
 * Classify user input into an intent.
 * Uses regex first; if confidence < 0.5, falls back to LLM.
 */
export async function classifyIntent(
  text: string,
  now: Date,
): Promise<IntentResult> {
  const clean = text.trim();
  if (!clean) return { intent: "general_chat", confidence: 0 };

  // Step 1: Regex classification
  let best: IntentResult | null = null;

  for (const group of PATTERNS) {
    for (const pattern of group.patterns) {
      if (pattern.test(clean)) {
        const matched = pattern.exec(clean);
        const confidence = group.weight * (matched ? 1 : 0.9);
        if (!best || confidence > best.confidence) {
          best = { intent: group.intent, confidence };
        }
      }
    }
  }

  // High-confidence regex match — return immediately
  if (best && best.confidence >= 0.6) {
    // Try to extract entities
    const entities = extractEntities(clean, best.intent);
    return { ...best, entities };
  }

  // Step 2: Check if it looks like an event (time-sensitive)
  // This is a final regex pass specifically for create_event
  const eventIndicators = [
    /[今明后]天|下周|周[一二三四五六日天]|\d{1,2}[月点]|\d{1,2}[日号]/,
    /\d{1,2}[点:时：]\d{0,2}/,
    /上午|下午|晚上|中午|早上|傍晚|凌晨|半夜/,
    /开会|会议|见面|约会|聚餐|吃饭|出发|起飞|上课|考试|面试|看病|体检/,
    /提醒.*提前|提前.*提醒|提前.*[分小]|闹钟/,
    /安排|预定|预订|约了|定了|定于|计划/,
  ];

  const eventScore = eventIndicators.filter((p) => p.test(clean)).length;
  if (eventScore >= 2) {
    return { intent: "create_event", confidence: Math.min(0.7, eventScore * 0.2), entities: { text: clean } };
  }

  // Step 3: If no good regex match, use LLM for classification
  const provider = createProvider();
  if (provider.name === "rule-based") {
    // Rule-based provider cannot classify — return best regex guess or general_chat
    if (best && best.confidence >= 0.4) return best;
    return { intent: "general_chat", confidence: 0.3 };
  }

  // LLM-based classification
  try {
    const today = now.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
    const prompt = `你是一个意图分类器。根据用户输入，判断用户的意图。

当前日期：${today}

可选意图：
- create_event：创建日程（文本中包含时间信息）
- query_events：查询日程
- delete_event：删除日程
- create_todo：创建待办/提醒/记一件事
- query_todos：查看待办列表
- complete_todo：完成待办
- create_habit：创建习惯
- log_habit：习惯打卡
- query_habits：查看习惯
- show_briefing：查看简报/汇总
- create_note：创建笔记
- general_chat：闲聊/问候/其他

用户输入：${clean}

只返回 JSON：
{"intent": "意图名称", "confidence": 0.8, "entities": {}}`;

    // We use the existing LLM provider but with a simpler parse result
    const result = await (provider as unknown as {
      classifyText?(text: string, prompt: string): Promise<string>;
      name: string;
    } | undefined);

    // Try using OpenAI-compatible call
    const llmResult = await tryLLMClassify(clean, prompt);
    if (llmResult) return llmResult;

  } catch {
    // LLM failed, fall through
  }

  // Fallback: best regex guess or general chat
  if (best && best.confidence >= 0.4) return best;
  return { intent: "general_chat", confidence: 0.3 };
}

async function tryLLMClassify(text: string, prompt: string): Promise<IntentResult | null> {
  try {
    // This uses the OpenAI-compatible endpoint directly
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.LLM_MODEL || "gpt-4o-mini";

    if (!apiKey || apiKey === "sk-your-key-here") return null;

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as IntentResult;
    if (!parsed.intent) return null;

    return {
      intent: parsed.intent,
      confidence: parsed.confidence || 0.7,
      entities: parsed.entities,
    };
  } catch {
    return null;
  }
}

// ── Helper: extract entities from text ──

function extractEntities(text: string, intent: Intent): Record<string, string> {
  switch (intent) {
    case "create_todo": {
      // Greedy prefix stripping: find the longest matching prefix
      let title = text;
      for (const prefix of TODO_PREFIXES) {
        const idx = title.indexOf(prefix);
        if (idx === 0) {
          title = title.slice(prefix.length);
          break; // Found the longest match, stop
        }
      }
      // Also handle "XX，记一下 YY" pattern (memo first, then marker)
      for (const prefix of ["记下来", "记一下", "记着"]) {
        const idx = title.indexOf("，" + prefix);
        if (idx > 0) {
          title = title.slice(idx + prefix.length + 1);
          break;
        }
        const idx2 = title.indexOf("," + prefix);
        if (idx2 > 0) {
          title = title.slice(idx2 + prefix.length + 1);
          break;
        }
      }
      // Clean up
      title = title.replace(/^[：:，,.\s]+/, "").replace(/[：:，,.\s]+$/, "").trim();
      return title ? { title } : {};
    }
    case "create_habit": {
      for (const pattern of HABIT_NAME_EXTRACTION) {
        const m = text.match(pattern);
        if (m?.[1]) return { name: m[1].trim() };
      }
      const name = text
        .replace(/添加习惯|创建习惯|新建习惯|添加|创建|新建/g, "")
        .replace(/[：:，,\s]+/g, " ")
        .trim();
      return name ? { name } : {};
    }
    default:
      return {};
  }
}

/**
 * Quick check: does this text likely describe an event (time+action)?
 */
export function isEventIntent(text: string): boolean {
  const indicators = [
    /[今明后]天/,
    /下周/,
    /\d{1,2}[月点]/,
    /\d{1,2}[点:时：]/,
    /上午|下午|晚上|中午|早上|傍晚|凌晨/,
    /开会|会议|见面|约会|聚餐|吃饭|出发|起飞|上课|考试|面试|看病|体检|出去玩|去.+玩/,
  ];
  return indicators.filter((p) => p.test(text)).length >= 1;
}
