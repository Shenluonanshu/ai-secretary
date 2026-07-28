// ── 节假日工具函数 ──
// 判断日期是否为假日、获取最近的假日、计算倒计时等

import { HOLIDAYS_2026, HOLIDAY_ALIASES, type HolidayEntry } from "./holidays-data";

// Build a fast lookup map
const holidayMap = new Map<string, HolidayEntry>();
for (const entry of HOLIDAYS_2026) {
  holidayMap.set(entry.date, entry);
}

/** 判断某日期是假日、调休工作日，还是普通日 */
export function getDayType(date: string): "holiday" | "workday" | "normal" {
  const entry = holidayMap.get(date);
  if (!entry) return "normal";
  return entry.type === "holiday" ? "holiday" : "workday";
}

/** 判断是否为休息日（周末或法定假日，排除调休上班） */
export function isRestDay(dateStr: string): boolean {
  const entry = holidayMap.get(dateStr);
  if (entry) {
    return entry.type === "holiday";
  }
  // No holiday entry: check if it's a weekend
  const d = new Date(dateStr + "T00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** 获取某日期的假日名称（如有） */
export function getHolidayName(dateStr: string): string | null {
  const entry = holidayMap.get(dateStr);
  if (!entry || entry.type !== "holiday") return null;
  return entry.name;
}

/** 获取即将到来的最近 N 个节假日 */
export function getUpcomingHolidays(limit = 3): HolidayEntry[] {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const holidays = HOLIDAYS_2026
    .filter(h => h.type === "holiday" && h.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Deduplicate by name (group consecutive dates of same holiday)
  const seen = new Set<string>();
  const result: HolidayEntry[] = [];
  for (const h of holidays) {
    // Only show the first day of each holiday
    const baseName = h.name.replace(/[（(].+[)）]/g, "").trim();
    if (!seen.has(baseName)) {
      seen.add(baseName);
      result.push(h);
      if (result.length >= limit) break;
    }
  }
  return result;
}

/** 计算距离某个节假日的天数 */
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** 获取下一个节假日的倒计时文案 */
export function getNextHolidayCountdown(): string {
  const upcoming = getUpcomingHolidays(1);
  if (!upcoming.length) return "";

  const h = upcoming[0];
  const days = daysUntil(h.date);
  if (days === 0) return `🎉 今天是${h.name}！`;
  if (days === 1) return `📅 明天是${h.name}`;
  if (days <= 3) return `📅 还有${days}天就是${h.name}`;
  if (days <= 7) return `📅 下周是${h.name}（${h.date}）`;
  return `📅 ${days}天后是${h.name}（${h.date}）`;
}

/** 检测用户文本中是否提及节假日 */
export function detectHolidayMention(text: string): string | null {
  for (const [keyword, name] of Object.entries(HOLIDAY_ALIASES)) {
    if (text.includes(keyword)) return name;
  }
  return null;
}

/** 获取当前日期所属的季节和工作日状态文案 */
export function getDateContext(dateStr: string): string {
  const holidayName = getHolidayName(dateStr);
  if (holidayName) return `今天是${holidayName}假期 🎉`;

  const entry = holidayMap.get(dateStr);
  if (entry?.type === "workday") return "今天是调休工作日（假期调休）";

  const d = new Date(dateStr + "T00:00");
  const day = d.getDay();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  if (day === 0 || day === 6) return `今天是${weekdays[day]}`;
  return `今天是工作日（${weekdays[day]}）`;
}
