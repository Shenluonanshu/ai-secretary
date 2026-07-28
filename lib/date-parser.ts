import type { EventDraft } from "./types";

const weekday: Record<string, number> = { "日":0,"天":0,"一":1,"二":2,"三":3,"四":4,"五":5,"六":6 };
const pad=(n:number)=>String(n).padStart(2,"0");
const localIso=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Combined date+period patterns like 今晚/明早/后天晚上
type DateOffset = { days: number; period?: string };
function matchRelativeDate(s: string): DateOffset | null {
  // 今晚/今早/今中午/今下午/今上午 → today
  if (/今/.test(s))
    return { days: 0, period: /晚/.test(s) ? "晚" : /早|上午/.test(s) ? "早" : /中/.test(s) ? "中" : undefined };
  // 明晚/明早/明天上午/明天下午 → tomorrow
  if (/明[天晚早]|明[天上中下]午/.test(s))
    return { days: 1, period: /晚/.test(s) ? "晚" : /早|上午/.test(s) ? "早" : /中/.test(s) ? "中" : undefined };
  // 后天晚/后天早 → +2
  if (/后天/.test(s))
    return { days: 2, period: /晚/.test(s) ? "晚" : /早|上午/.test(s) ? "早" : /中/.test(s) ? "中" : undefined };
  return null;
}

export function parseChineseEvent(text:string, now=new Date(), source:EventDraft["source"]="text"): { draft?:EventDraft; clarification?:string } {
  const value=text.trim(); if(!value) return { clarification:"请告诉我想安排什么事件。" };
  const date=new Date(now); date.setSeconds(0,0); let matched=false; let impliedPeriod: string|undefined;

  // Try combined relative date (今晚/明早/后天晚上)
  const relDate = matchRelativeDate(value);
  if (relDate) {
    date.setDate(date.getDate() + relDate.days);
    if (relDate.period) impliedPeriod = relDate.period;
    matched = true;
  }

  // Fall through to basic date patterns if not matched
  if (!matched) {
    if(/后天/.test(value)){date.setDate(date.getDate()+2);matched=true}
    else if(/明天/.test(value)){date.setDate(date.getDate()+1);matched=true}
    else if(/今天/.test(value)){matched=true}
    else { const md=value.match(/(\d{1,2})月(\d{1,2})[日号]?/); const rel=value.match(/下周([日天一二三四五六])/); if(md){date.setMonth(+md[1]-1,+md[2]);matched=true} else if(rel){const add=(7-date.getDay()+weekday[rel[1]])%7+7;date.setDate(date.getDate()+add);matched=true} }
  }

  if(!matched) return { clarification:"我需要一个明确日期，例如「明天下午三点」或「8月3日」。" };

  // Time extraction
  const time=value.match(/(?:上午|早上|下午|晚上|中午)?\s*([\d一二三四五六七八九十两]{1,3})(?:点|:|：)(?:(\d{1,2})分?)?/);
  let hour=9, minute=0;
  if(time){
    hour=chineseNumber(time[1]); minute=+(time[2]||0);
    // Apply period: use implied period from 今晚/明早, or explicit 上午/下午/晚上 in text
    const period = impliedPeriod || (/晚/.test(value) ? "晚" : /早|上午/.test(value) ? "早" : /中/.test(value) ? "中" : undefined);
    if ((period === "晚" || /下午|晚上/.test(value)) && hour < 12) hour += 12;
    if ((period === "中" || /中午/.test(value)) && hour < 11) hour += 12;
  } else if(/全天/.test(value)){
    const start=new Date(date);start.setHours(0,0);const end=new Date(start);end.setDate(end.getDate()+1);
    return {draft:{title:cleanTitle(value),startsAt:localIso(start),endsAt:localIso(end),allDay:true,timezone:"Asia/Shanghai",reminders:[60],recurrence:recurrence(value),source}};
  }
  date.setHours(hour,minute); const end=new Date(date);end.setHours(end.getHours()+1);
  return {draft:{title:cleanTitle(value),startsAt:localIso(date),endsAt:localIso(end),allDay:false,timezone:"Asia/Shanghai",reminders:[30],recurrence:recurrence(value),source}};
}
const recurrence=(s:string):EventDraft["recurrence"]=>/每天/.test(s)?"daily":/每周/.test(s)?"weekly":/每月/.test(s)?"monthly":"none";
const chineseNumber=(s:string)=>{if(/^\d+$/.test(s))return +s;const map:Record<string,number>={"零":0,"一":1,"二":2,"两":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9};if(s==="十")return 10;if(s.includes("十")){const [a,b]=s.split("十");return (a?map[a]:1)*10+(b?map[b]:0)}return map[s]??9};
const cleanTitle=(s:string)=>s.replace(/今晚|今早|今中午|今下午|今上午|明早|明晚|后天晚[上间]?|后天早[上间]?|今天|明天|后天|下周[日天一二三四五六]|\d{1,2}月\d{1,2}[日号]?|上午|早上|下午|晚上|中午|全天|[\d一二三四五六七八九十两]{1,3}(?:点|:|：)(?:\d{1,2}分?)?|提醒我|帮我|安排|创建|出去/g," ").replace(/\s+/g," ").trim()||"未命名事件";
