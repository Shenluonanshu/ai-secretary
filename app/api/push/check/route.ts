import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendPushNotification,
  wasReminderSent,
  markReminderSent,
  getVapidPublicKey,
} from "@/lib/push";

// GET: Get VAPID public key for client-side subscription
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "key") {
    return NextResponse.json({ publicKey: getVapidPublicKey() });
  }

  // Check for pending reminders and send push notifications
  const now = new Date();
  const soon = new Date(now.getTime() + 60_000); // Next 60 seconds

  // Find events that have reminders due within the next minute
  const events = await prisma.event.findMany({
    where: {
      startsAt: { lte: soon },
    },
    orderBy: { startsAt: "asc" },
  });

  let sent = 0;

  for (const event of events) {
    const reminders: number[] = JSON.parse(event.reminders);
    for (const minutesBefore of reminders) {
      const reminderTime = new Date(
        new Date(event.startsAt).getTime() - minutesBefore * 60_000,
      );

      // If reminder time is within the window and hasn't been sent
      if (
        reminderTime <= soon &&
        reminderTime >= now &&
        !wasReminderSent(event.id, minutesBefore)
      ) {
        const subscriptions = await prisma.pushSubscription.findMany();
        for (const sub of subscriptions) {
          const keys = JSON.parse(sub.keys);
          const valid = await sendPushNotification(
            { endpoint: sub.endpoint, keys },
            {
              title: `提醒：${event.title}`,
              body: event.description || `将在 ${minutesBefore} 分钟后开始`,
              eventId: event.id,
            },
          );

          // Clean up invalid subscriptions
          if (!valid) {
            await prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => undefined);
          }
        }
        markReminderSent(event.id, minutesBefore);
        sent++;
      }
    }
  }

  return NextResponse.json({ sent, checkedAt: now.toISOString() });
}
