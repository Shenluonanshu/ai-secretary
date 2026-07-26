import webpush from "web-push";

function getVapidKeys(): { publicKey: string; privateKey: string } {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) return { publicKey: pub, privateKey: priv };

  // Generate keys on first run
  const keys = webpush.generateVAPIDKeys();
  console.log("VAPID keys generated. Add these to your .env.local:");
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Push send error:", msg);
    // If subscription is invalid (410 Gone), it should be removed
    if ((err as { statusCode?: number }).statusCode === 410) {
      return false; // Signal that subscription needs cleanup
    }
    return true; // Other errors are transient
  }
}

// In-memory set to prevent duplicate reminders (cleared on restart)
const sentReminders = new Set<string>();

export function markReminderSent(eventId: string, minutesBefore: number): void {
  sentReminders.add(`${eventId}-${minutesBefore}`);
}

export function wasReminderSent(eventId: string, minutesBefore: number): boolean {
  return sentReminders.has(`${eventId}-${minutesBefore}`);
}
