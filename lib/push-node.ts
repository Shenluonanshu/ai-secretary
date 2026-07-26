// Node.js only — never imported by Edge Runtime routes
import webpush from "web-push";

function getVapidKeys(): { publicKey: string; privateKey: string } {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) return { publicKey: pub, privateKey: priv };
  const keys = webpush.generateVAPIDKeys();
  console.log("VAPID keys generated:", keys.publicKey, keys.privateKey);
  return keys;
}

export function getVapidPublicKey(): string {
  return getVapidKeys().publicKey;
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body?: string; icon?: string; url?: string; eventId?: string },
): Promise<boolean> {
  try {
    const { publicKey, privateKey } = getVapidKeys();
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      publicKey,
      privateKey,
    );
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 410) return false;
    return true;
  }
}

const sentReminders = new Set<string>();
export function markReminderSent(eventId: string, minutesBefore: number): void {
  sentReminders.add(`${eventId}-${minutesBefore}`);
}
export function wasReminderSent(eventId: string, minutesBefore: number): boolean {
  return sentReminders.has(`${eventId}-${minutesBefore}`);
}
