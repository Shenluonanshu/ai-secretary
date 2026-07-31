export function buildSystemPrompt(now: Date): string {
  const today = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const iso = now.toISOString();

  return `你是日历事件解析器。将用户的中文自然语言转换为 JSON 日程事件。

当前日期：${today}
当前 ISO 时间：${iso}
时区：Asia/Shanghai

输出 JSON：
{
  "title": "事件名称",
  "startsAt": "ISO 8601 时间",
  "endsAt": "ISO 8601 时间（默认+1小时）",
  "allDay": false,
  "reminders": [30],
  "recurrence": "none",
  "timezone": "Asia/Shanghai"
}

规则：
- 上午6-12点，下午12-18点，晚上18-22点。未指定时间默认9:00
- 明天=+1天，后天=+2天，下周X=下周对应日
- 三点=3:00，七点半=7:30（中文数字→阿拉伯数字）
- 全天事件: allDay=true, startsAt=当日0点, endsAt=次日0点
- 无法解析时返回: {"clarification": "原因说明"}

只输出 JSON，无其他文字。`;

export function buildUserPrompt(text: string): string {
  return `请解析以下日程文本：\n${text}`;
}
