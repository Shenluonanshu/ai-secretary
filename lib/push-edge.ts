// ── Edge-Compatible Web Push (纯 Web Crypto API) ──
// 不依赖 web-push npm 包，Edge Runtime / Cloudflare Workers 可用

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface PushPayload {
  title: string;
  body?: string;
  icon?: string;
  url?: string;
  tag?: string;
  eventId?: string;
}

// ── URL-safe Base64 ──
function b64encode(buffer: ArrayBuffer | Uint8Array): string {
  const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64decode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4 !== 0) str += "=";
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

// ── VAPID JWT 签名 ──
async function createVapidJWT(
  audience: string,
  subject: string,
  privateKey: string,
): Promise<string> {
  // Parse private key from base64url
  const keyData = b64decode(privateKey).buffer as ArrayBuffer;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const enc = new TextEncoder();
  const token = `${b64encode(enc.encode(JSON.stringify(header)))}.${b64encode(enc.encode(JSON.stringify(payload)))}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key,
    enc.encode(token),
  );
  return `${token}.${b64encode(sig)}`;
}

// ── Payload Encryption (RFC 8291) ──
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string,
): Promise<{ ciphertext: ArrayBuffer; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  // Export local public key
  const rawLocalPub = await crypto.subtle.exportKey("raw", localKeyPair.publicKey) as ArrayBuffer;

  // Import subscriber's public key
  const remoteKey = await crypto.subtle.importKey(
    "raw",
    b64decode(p256dh).buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  ) as CryptoKey;

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: remoteKey as CryptoKey },
    localKeyPair.privateKey as CryptoKey,
    256,
  );

  // HKDF to derive encryption key and nonce
  const authSecret = b64decode(auth).buffer as ArrayBuffer;
  const ikm = new Uint8Array(sharedSecret).buffer as ArrayBuffer;
  const info = new TextEncoder().encode("Content-Encoding: aes128gcm\0");

  const prk = await crypto.subtle.importKey(
    "raw", authSecret,
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const prkResult = await crypto.subtle.sign("HMAC", prk, ikm);

  // Derive content encryption key
  const cekInfo = new Uint8Array([...info, 1]).buffer as ArrayBuffer;
  const cekKey = await crypto.subtle.importKey(
    "raw", (new Uint8Array(prkResult)).buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const cekSig = await crypto.subtle.sign("HMAC", cekKey, cekInfo);
  const cek = await crypto.subtle.importKey(
    "raw", (new Uint8Array(cekSig)).slice(0, 16).buffer as ArrayBuffer,
    { name: "AES-GCM" }, false, ["encrypt"],
  );

  // Derive nonce
  const nonceInfo = new Uint8Array([...info, 0]).buffer as ArrayBuffer;
  const nonceSig = await crypto.subtle.sign("HMAC", cekKey, nonceInfo);
  const nonce = (new Uint8Array(nonceSig)).slice(0, 12);

  // Encrypt
  const plaintext = new TextEncoder().encode(payload);
  // Add padding (2 bytes = 0)
  const padded = new Uint8Array(plaintext.length + 2);
  padded.set(plaintext, 0);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce as unknown as ArrayBuffer },
    cek,
    padded.buffer as unknown as ArrayBuffer,
  );

  return {
    ciphertext,
    salt,
    serverPublicKey: new Uint8Array(rawLocalPub as unknown as ArrayBuffer),
  };
}

// ── 发送 Web Push 通知 ──
export async function sendEdgePush(
  subscription: PushSubscription,
  payload: PushPayload,
  vapidKeys: VapidKeys,
): Promise<{ success: boolean; gone: boolean }> {
  try {
    const endpoint = subscription.endpoint;
    const origin = new URL(endpoint).origin;

    // Create VAPID JWT
    const jwt = await createVapidJWT(
      origin,
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      vapidKeys.privateKey,
    );

    // Encrypt payload
    const jsonPayload = JSON.stringify({
      ...payload,
      icon: payload.icon || "/icon-192.png",
      badge: "/icon-192.png",
    });
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(
      jsonPayload,
      subscription.keys.p256dh,
      subscription.keys.auth,
    );

    // Construct encrypted body (salt + key + ciphertext)
    const ct = new Uint8Array(ciphertext as unknown as ArrayBuffer);
    const body = new Uint8Array(salt.length + 2 + serverPublicKey.length + ct.byteLength);
    let offset = 0;
    body.set(salt, offset); offset += salt.length;
    body.set([65], offset); offset += 1; // key length (65 bytes for P-256 uncompressed)
    body.set(serverPublicKey as unknown as Uint8Array, offset); offset += (serverPublicKey as unknown as Uint8Array).length;
    body.set(new Uint8Array([0, 0]), offset); offset += 2; // content encoding header
    body.set(ct, offset);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Encoding": "aes128gcm",
        "Authorization": `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
        "TTL": "86400",
        "Content-Type": "application/octet-stream",
      },
      body,
    });

    if (response.status === 410) {
      return { success: false, gone: true }; // Subscription expired
    }

    return { success: response.status >= 200 && response.status < 300, gone: false };
  } catch (err) {
    console.error("Push send error:", err);
    return { success: false, gone: false };
  }
}
