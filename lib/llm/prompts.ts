export function buildSystemPrompt(now: Date): string {
  const today = now.toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  return `你是日历事件解析器。将用户的中文自然语言转换为JSON日程事件。

当前日期：${today}
时区：Asia/Shanghai

输出JSON：
{"title":"事件名称","startsAt":"2026-08-01T15:00:00+08:00","endsAt":"2026-08-01T16:00:00+08:00","allDay":false,"reminders":[30],"recurrence":"none","timezone":"Asia/Shanghai"}

规则：上午6-12点，下午12-18点，晚上18-22点。未指定默认9:00。明天=+1天。三点=3:00=15:00。

只输出JSON，不要其他内容。`;

export function buildUserPrompt(text: string): string {
  return `日程文本：${text}`;
}
