import type { EventDraft } from "./types";

const weekday: Record<string, number> = { "日":0,"天":0,"一":1,"二":2,"三":3,"四":4,"五":5,"六":6 };
const pad=(n:number)=>String(n).padStart(2,"0");
const localIso=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export function parseChineseEvent(text:string, now=new Date(), source:EventDraft["source"]="text"): { draft?:EventDraft; clarification?:string } {
  const value=text.trim(); if(!value) return { clarification:"请告诉我想安排什么事件。" };
  const date=new Date(now); date.setSeconds(0,0); let matched=false;
  if(/后天/.test(value)){date.setDate(date.getDate()+2);matched=true}
  else if(/明天/.test(value)){date.setDate(date.getDate()+1);matched=true}
  else if(/今天/.test(value)){matched=true}
  else { const md=value.match(/(\d{1,2})月(\d{1,2})[日号]?/); const rel=value.match(/下周([日天一二三四五六])/); if(md){date.setMonth(+md[1]-1,+md[2]);matched=true} else if(rel){const add=(7-date.getDay()+weekday[rel[1]])%7+7;date.setDate(date.getDate()+add);matched=true} }
  if(!matched) return { clarification:"我需要一个明确日期，例如“明天下午三点”或“8月3日”。" };
  const time=value.match(/(?:上午|早上|下午|晚上|中午)?\s*([\d一二三四五六七八九十两]{1,3})(?:点|:|：)(?:(\d{1,2})分?)?/); let hour=9, minute=0;
  if(time){hour=chineseNumber(time[1]);minute=+(time[2]||0); if(/下午|晚上/.test(value)&&hour<12)hour+=12; if(/中午/.test(value)&&hour<11)hour+=12}else if(/全天/.test(value)){ const start=new Date(date);start.setHours(0,0);const end=new Date(start);end.setDate(end.getDate()+1);return {draft:{title:cleanTitle(value),startsAt:localIso(start),endsAt:localIso(end),allDay:true,timezone:"Asia/Shanghai",reminders:[60],recurrence:recurrence(value),source}} }
  date.setHours(hour,minute); const end=new Date(date);end.setHours(end.getHours()+1);
  return {draft:{title:cleanTitle(value),startsAt:localIso(date),endsAt:localIso(end),allDay:false,timezone:"Asia/Shanghai",reminders:[30],recurrence:recurrence(value),source}};
}
const recurrence=(s:string):EventDraft["recurrence"]=>/每天/.test(s)?"daily":/每周/.test(s)?"weekly":/每月/.test(s)?"monthly":"none";
const chineseNumber=(s:string)=>{if(/^\d+$/.test(s))return +s;const map:Record<string,number>={"零":0,"一":1,"二":2,"两":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9};if(s==="十")return 10;if(s.includes("十")){const [a,b]=s.split("十");return (a?map[a]:1)*10+(b?map[b]:0)}return map[s]??9};
const cleanTitle=(s:string)=>s.replace(/今天|明天|后天|下周[日天一二三四五六]|\d{1,2}月\d{1,2}[日号]?|上午|早上|下午|晚上|中午|全天|[\d一二三四五六七八九十两]{1,3}(?:点|:|：)(?:\d{1,2}分?)?|提醒我|帮我|安排|创建/g," ").replace(/\s+/g," ").trim()||"未命名事件";
