import { NextRequest, NextResponse } from "next/server";
import { onCloudflare } from "@/lib/cf";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "key") {
    // Web Push VAPID keys — Cloudflare doesn't support node web-push
    if (onCloudflare()) {
      return NextResponse.json({
        publicKey: process.env.VAPID_PUBLIC_KEY || "",
      });
    }
    const { getVapidPublicKey } = await import("@/lib/push");
    return NextResponse.json({ publicKey: getVapidPublicKey() });
  }

  // Reminder check
  if (onCloudflare()) {
    // Cloudflare: simplified reminder check (web-push not available)
    return NextResponse.json({
      sent: 0,
      message: "Web Push 在 Cloudflare 环境中暂不可用，请在浏览器通知授权后使用客户端提醒。",
    });
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 60_000);
  const { prisma } = await import("@/lib/db");
  const { sendPushNotification, wasReminderSent, markReminderSent } =
    await import("@/lib/push");

  const events = await prisma.event.findMany({
    where: { startsAt: { lte: soon } },
    orderBy: { startsAt: "asc" },
  });

  let sent = 0;
  for (const event of events) {
    const reminders: number[] = JSON.parse(event.reminders);
    for (const minutesBefore of reminders) {
      const reminderTime = new Date(
        new Date(event.startsAt).getTime() - minutesBefore * 60_000,
      );
      if (
        reminderTime <= soon &&
        reminderTime >= now &&
        !wasReminderSent(event.id, minutesBefore)
      ) {
        const subscriptions = await prisma.pushSubscription.findMany();
        for (const sub of subscriptions) {
          const keys = JSON.parse(sub.keys);
          await sendPushNotification(
            { endpoint: sub.endpoint, keys },
            {
              title: `提醒：${event.title}`,
              body: event.description || `将在 ${minutesBefore} 分钟后开始`,
              eventId: event.id,
            },
          );
        }
        markReminderSent(event.id, minutesBefore);
        sent++;
      }
    }
  }

  return NextResponse.json({ sent, checkedAt: now.toISOString() });
}
