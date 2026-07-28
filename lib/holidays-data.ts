// ── 2026 年中国法定节假日数据 ──
// 每年更新一次即可。数据来源：国务院办公厅通知。
// 添加 { date: "YYYY-MM-DD", name: "节日名", type: "holiday"|"workday" }

export interface HolidayEntry {
  date: string;       // "YYYY-MM-DD"
  name: string;       // 节日名称（如 "春节"、"国庆节"）
  type: "holiday" | "workday"; // holiday=放假 workday=调休上班
}

// 2026 年法定节假日安排（含调休）
// 注：部分调休日期为推测，以国务院实际通知为准
export const HOLIDAYS_2026: HolidayEntry[] = [
  // ── 元旦：1月1日-3日放假，共3天 ──
  { date: "2026-01-01", name: "元旦", type: "holiday" },
  { date: "2026-01-02", name: "元旦", type: "holiday" },
  { date: "2026-01-03", name: "元旦", type: "holiday" },
  // 1月4日（周日）调休上班（推测）
  { date: "2026-01-04", name: "元旦调休", type: "workday" },

  // ── 春节：2月16日（除夕）-23日放假，共8天 ──
  // 2026年春节是2月17日（正月初一）
  { date: "2026-02-16", name: "春节（除夕）", type: "holiday" },
  { date: "2026-02-17", name: "春节（初一）", type: "holiday" },
  { date: "2026-02-18", name: "春节（初二）", type: "holiday" },
  { date: "2026-02-19", name: "春节（初三）", type: "holiday" },
  { date: "2026-02-20", name: "春节（初四）", type: "holiday" },
  { date: "2026-02-21", name: "春节（初五）", type: "holiday" },
  { date: "2026-02-22", name: "春节（初六）", type: "holiday" },
  { date: "2026-02-23", name: "春节（初七）", type: "holiday" },
  // 调休
  { date: "2026-02-14", name: "春节调休", type: "workday" }, // 周六上班
  { date: "2026-02-28", name: "春节调休", type: "workday" }, // 周六上班

  // ── 清明节：4月4日-6日放假，共3天 ──
  { date: "2026-04-04", name: "清明节", type: "holiday" },
  { date: "2026-04-05", name: "清明节", type: "holiday" },
  { date: "2026-04-06", name: "清明节", type: "holiday" },

  // ── 劳动节：5月1日-5日放假，共5天 ──
  { date: "2026-05-01", name: "劳动节", type: "holiday" },
  { date: "2026-05-02", name: "劳动节", type: "holiday" },
  { date: "2026-05-03", name: "劳动节", type: "holiday" },
  { date: "2026-05-04", name: "劳动节", type: "holiday" },
  { date: "2026-05-05", name: "劳动节", type: "holiday" },
  // 调休
  { date: "2026-04-26", name: "劳动节调休", type: "workday" }, // 周日上班
  { date: "2026-05-09", name: "劳动节调休", type: "workday" }, // 周六上班

  // ── 端午节：6月19日-21日放假，共3天 ──
  { date: "2026-06-19", name: "端午节", type: "holiday" },
  { date: "2026-06-20", name: "端午节", type: "holiday" },
  { date: "2026-06-21", name: "端午节", type: "holiday" },

  // ── 中秋节+国庆节：9月25日-10月8日 ──
  // 中秋节 9月25日
  { date: "2026-09-25", name: "中秋节", type: "holiday" },
  // 国庆节连休
  { date: "2026-10-01", name: "国庆节", type: "holiday" },
  { date: "2026-10-02", name: "国庆节", type: "holiday" },
  { date: "2026-10-03", name: "国庆节", type: "holiday" },
  { date: "2026-10-04", name: "国庆节", type: "holiday" },
  { date: "2026-10-05", name: "国庆节", type: "holiday" },
  { date: "2026-10-06", name: "国庆节", type: "holiday" },
  { date: "2026-10-07", name: "国庆节", type: "holiday" },
  { date: "2026-10-08", name: "国庆节", type: "holiday" },
  // 调休
  { date: "2026-09-20", name: "国庆调休", type: "workday" }, // 周日上班
  { date: "2026-09-27", name: "国庆调休", type: "workday" }, // 周日上班
  { date: "2026-10-10", name: "国庆调休", type: "workday" }, // 周六上班
];

// ── 节日别名映射（AI 对话中识别用） ──
export const HOLIDAY_ALIASES: Record<string, string> = {
  "元旦": "元旦",
  "新年": "元旦",
  "春节": "春节",
  "过年": "春节",
  "除夕": "春节",
  "大年三十": "春节",
  "正月初一": "春节",
  "清明": "清明节",
  "扫墓": "清明节",
  "劳动节": "劳动节",
  "五一": "劳动节",
  "端午": "端午节",
  "粽子节": "端午节",
  "中秋": "中秋节",
  "月饼节": "中秋节",
  "国庆": "国庆节",
  "十一": "国庆节",
};
