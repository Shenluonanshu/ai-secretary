/**
 * Cloudflare Worker 定时任务
 * - 每日 8:00：早安简报推送
 * - 每 5 分钟：提醒扫描 + 推送
 *
 * 部署：npx wrangler deploy workers/cron-handler.ts
 * 或在 wrangler.toml 中配置 [triggers] crons
 */

interface Env {
  DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}

interface PushSub {
  endpoint: string;
  keys: string; // JSON: { p256dh, auth }
}

interface EventRow {
  id: string;
  title: string;
  startsAt: string;
  reminders: string; // JSON array
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const now = new Date();
    const hour = now.getUTCHours() + 8; // UTC+8 (Asia/Shanghai)

    switch (event.cron) {
      case "0 8 * * *":
        // Morning briefing (8:00 AM Beijing time)
        ctx.waitUntil(sendMorningBriefing(env));
        break;
      case "*/5 * * * *":
        // Reminder check every 5 minutes
        ctx.waitUntil(sendReminders(env));
        break;
    }
  },
};

async function sendMorningBriefing(env: Env) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });

  const { results: events } = await env.DB.prepare(
    "SELECT * FROM Event WHERE startsAt >= ?1 AND startsAt < ?2"
  ).bind(`${today}T00:00`, `${today}T23:59`).all<EventRow>();

  const subs = await env.DB.prepare("SELECT * FROM PushSubscription").all<PushSub>();
  if (!subs.results?.length) return;

  const payload = {
    title: `早安 ☀️ 今日 ${events?.length || 0} 个日程`,
    body: events?.length ? events.map(e => e.title).join("、") : "今天没有安排，享受自由的一天～",
    icon: "/icon-192.png",
    url: "/",
  };

  await broadcastPush(env, subs.results, payload);
}

async function sendReminders(env: Env) {
  const now = new Date().toISOString();
  const fiveMinLater = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { results: events } = await env.DB.prepare(
    "SELECT * FROM Event WHERE startsAt >= ?1 AND startsAt <= ?2"
  ).bind(now, fiveMinLater).all<EventRow>();

  if (!events?.length) return;

  const subs = await env.DB.prepare("SELECT * FROM PushSubscription").all<PushSub>();
  if (!subs.results?.length) return;

  // Track sent reminders (in-memory within this invocation)
  const sent = new Set<string>();

  for (const event of events) {
    const reminders: number[] = JSON.parse(event.reminders || "[30]");
    for (const min of reminders) {
      const key = `${event.id}-${min}`;
      if (sent.has(key)) continue;

      // Check if the reminder should fire now
      const eventTime = new Date(event.startsAt).getTime();
      const reminderTime = eventTime - min * 60 * 1000;
      const nowTime = Date.now();

      // If reminder time is within the last 5 minutes, send it
      if (nowTime >= reminderTime && nowTime <= reminderTime + 5 * 60 * 1000) {
        sent.add(key);

        const payload = {
          title: `提醒：${event.title}`,
          body: `将在 ${min} 分钟后开始`,
          icon: "/icon-192.png",
          url: "/",
          eventId: event.id,
          tag: key,
        };

        await broadcastPush(env, subs.results, payload);
        break; // Only send one reminder per event per cycle
      }
    }
  }
}

async function broadcastPush(env: Env, subs: PushSub[], payload: Record<string, unknown>) {
  const goneEndpoints: string[] = [];
  const vapidKeys = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };
  const subject = env.VAPID_SUBJECT || "mailto:admin@example.com";

  for (const sub of subs) {
    try {
      const keys = JSON.parse(sub.keys) as { p256dh: string; auth: string };
      const endpoint = sub.endpoint;
      const origin = new URL(endpoint).origin;

      // Create VAPID JWT
      const jwt = await createVapidJWT(origin, subject, vapidKeys.privateKey);
      const jsonPayload = JSON.stringify(payload);
      const encrypted = await encryptPushPayload(jsonPayload, keys);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Encoding": "aes128gcm",
          "Authorization": `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
          "TTL": "86400",
          "Content-Type": "application/octet-stream",
        },
        body: encrypted,
      });

      if (response.status === 410) {
        goneEndpoints.push(sub.endpoint);
      }
    } catch {
      // Skip failed subscriptions
    }
  }

  // Clean up expired subscriptions
  for (const endpoint of goneEndpoints) {
    await env.DB.prepare("DELETE FROM PushSubscription WHERE endpoint = ?1")
      .bind(endpoint).run();
  }
}

// ── Web Crypto Push Helpers (same as push-edge.ts, inlined for Worker) ──

function b64encode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64decode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4 !== 0) str += "=";
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function createVapidJWT(audience: string, subject: string, privateKey: string): Promise<string> {
  const keyData = b64decode(privateKey);
  const key = await crypto.subtle.importKey(
    "pkcs8", keyData, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"],
  );
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 60 * 60, sub: subject };
  const enc = new TextEncoder();
  const token = `${b64encode(enc.encode(JSON.stringify(header)))}.${b64encode(enc.encode(JSON.stringify(payload)))}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-256" } }, key, enc.encode(token));
  return `${token}.${b64encode(sig)}`;
}

async function encryptPushPayload(
  payload: string,
  keys: { p256dh: string; auth: string },
): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const localKP = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const rawLocalPub = await crypto.subtle.exportKey("raw", localKP.publicKey);
  const remoteKey = await crypto.subtle.importKey("raw", b64decode(keys.p256dh), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = await crypto.subtle.deriveBits({ name: "ECDH", public: remoteKey }, localKP.privateKey, 256);
  const authSecret = b64decode(keys.auth);
  const ikm = new Uint8Array(sharedSecret);
  const info = new TextEncoder().encode("Content-Encoding: aes128gcm\0");

  const prk = await crypto.subtle.importKey("raw", authSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prkResult = await crypto.subtle.sign("HMAC", prk, ikm);

  const cekInfo = new Uint8Array([...info, 1]);
  const cekKey = await crypto.subtle.importKey("raw", new Uint8Array(prkResult), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const cekSig = await crypto.subtle.sign("HMAC", cekKey, cekInfo);
  const cek = await crypto.subtle.importKey("raw", new Uint8Array(cekSig).slice(0, 16), { name: "AES-GCM" }, false, ["encrypt"]);

  const nonceInfo = new Uint8Array([...info, 0]);
  const nonceSig = await crypto.subtle.sign("HMAC", cekKey, nonceInfo);
  const nonce = new Uint8Array(nonceSig).slice(0, 12);

  const plaintext = new TextEncoder().encode(payload);
  const padded = new Uint8Array(plaintext.length + 2);
  padded.set(plaintext, 0);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cek, padded);

  const result = new Uint8Array(salt.length + 65 + 2 + ciphertext.byteLength);
  let off = 0;
  result.set(salt, off); off += salt.length;
  result.set([65], off); off += 1;
  result.set([new Uint8Array(rawLocalPub).length], off); off += 1;
  result.set(new Uint8Array(rawLocalPub), off); off += new Uint8Array(rawLocalPub).length;
  result.set([0, 0], off);
  result.set(new Uint8Array(ciphertext), off + 2);
  return result;
}
