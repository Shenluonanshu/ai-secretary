import { NextRequest, NextResponse } from "next/server";
import {
  getUpcomingHolidays,
  getNextHolidayCountdown,
  getDayType,
  isRestDay,
  getHolidayName,
} from "@/lib/holidays";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const action = searchParams.get("action") || "upcoming";

  switch (action) {
    case "upcoming": {
      const holidays = getUpcomingHolidays(6);
      const countdown = getNextHolidayCountdown();
      return NextResponse.json({ holidays, countdown });
    }
    case "check": {
      if (!date) return NextResponse.json({ error: "请提供 date 参数" }, { status: 400 });
      return NextResponse.json({
        date,
        type: getDayType(date),
        isRest: isRestDay(date),
        holidayName: getHolidayName(date),
      });
    }
    default:
      return NextResponse.json({ error: "未知 action" }, { status: 400 });
  }
}
