// Cloudflare Pages Function — POST /api/parse
// Uses the rule-based parser (no external LLM API needed on Cloudflare)
function parseChineseEvent(text: string) {
  const now = new Date();
  const value = text.trim();
  if (!value) return { clarification: "请告诉我想安排什么事件。" };

  const date = new Date(now);
  date.setSeconds(0, 0);
  let matched = false;

  if (/后天/.test(value)) { date.setDate(date.getDate() + 2); matched = true; }
  else if (/明天/.test(value)) { date.setDate(date.getDate() + 1); matched = true; }
  else if (/今天/.test(value)) { matched = true; }
  else {
    const md = value.match(/(\d{1,2})月(\d{1,2})[日号]?/);
    const weekday: Record<string, number> = { "日": 0, "天": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6 };
    const rel = value.match(/下周([日天一二三四五六])/);
    if (md) { date.setMonth(+md[1] - 1, +md[2]); matched = true; }
    else if (rel) { date.setDate(date.getDate() + (7 - date.getDay() + weekday[rel[1]]) % 7 + 7); matched = true; }
  }
  if (!matched) return { clarification: "请提供明确日期，如「明天下午三点」或「8月3日」。" };

  const time = value.match(/(?:上午|早上|下午|晚上|中午)?\s*([\d一二三四五六七八九十两]{1,3})(?:点|:|：)(?:(\d{1,2})分?)?/);
  let hour = 9, minute = 0;

  if (time) {
    const cn: Record<string, number> = { "零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
    const n = (s: string) => /^\d+$/.test(s) ? +s : s === "十" ? 10 : s.includes("十") ? (+(cn[s.split("十")[0]] || 1)) * 10 + (cn[s.split("十")[1]] || 0) : cn[s] ?? 9;
    hour = n(time[1]);
    minute = +(time[2] || 0);
    if (/下午|晚上/.test(value) && hour < 12) hour += 12;
    if (/中午/.test(value) && hour < 11) hour += 12;
  } else if (/全天/.test(value)) {
    const start = new Date(date); start.setHours(0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return {
      draft: {
        title: cleanTitle(value),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        allDay: true, timezone: "Asia/Shanghai",
        reminders: [60], recurrence: recurrence(value), source: "text" as const,
      },
    };
  }

  date.setHours(hour, minute);
  const end = new Date(date);
  end.setHours(end.getHours() + 1);

  return {
    draft: {
      title: cleanTitle(value),
      startsAt: date.toISOString(),
      endsAt: end.toISOString(),
      allDay: false, timezone: "Asia/Shanghai",
      reminders: [30], recurrence: recurrence(value), source: "text" as const,
    },
  };
}

function recurrence(s: string) { return /每天/.test(s) ? "daily" : /每周/.test(s) ? "weekly" : /每月/.test(s) ? "monthly" : "none" as const; }
function cleanTitle(s: string) { return s.replace(/今天|明天|后天|下周[日天一二三四五六]|\d{1,2}月\d{1,2}[日号]?|上午|早上|下午|晚上|中午|全天|[\d一二三四五六七八九十两]{1,3}(?:点|:|：)(?:\d{1,2}分?)?|提醒我|帮我|安排|创建/g, " ").replace(/\s+/g, " ").trim() || "未命名事件"; }

export async function onRequestPost({ request }: { request: Request }) {
  const { text } = await request.json() as { text: string };
  const result = parseChineseEvent(text);
  return Response.json(result);
}
