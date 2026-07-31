// Edge-compatible JWT using Web Crypto API
// 安全性：JWT_SECRET 和 AUTH_PASSPHRASE 不再有硬编码默认值。
// 部署时必须通过环境变量设置，否则启动时抛出错误。
let _secretKey: CryptoKey | null = null;

async function getSecretKey(): Promise<CryptoKey> {
  if (_secretKey) return _secretKey;
  const secret = process.env.JWT_SECRET || process.env.AUTH_PASSPHRASE;
  if (!secret) {
    throw new Error(
      "[auth] 致命错误：未设置 JWT_SECRET 或 AUTH_PASSPHRASE 环境变量。" +
      "请在 Cloudflare Dashboard → Settings → Environment Variables 中配置。"
    );
  }
  const keyData = new TextEncoder().encode(secret);
  _secretKey = await crypto.subtle.importKey(
    "raw",
    keyData.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return _secretKey;
}

function getAuthPassphrase(): string {
  const pass = process.env.AUTH_PASSPHRASE;
  if (!pass) {
    throw new Error(
      "[auth] 致命错误：未设置 AUTH_PASSPHRASE 环境变量。"
    );
  }
  return pass;
}

function base64urlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function sign(payload: Record<string, unknown>, key: CryptoKey): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = new TextEncoder();
  const encodedHeader = base64urlEncode(enc.encode(JSON.stringify(header)));
  const encodedPayload = base64urlEncode(enc.encode(JSON.stringify(payload)));
  const data = enc.encode(`${encodedHeader}.${encodedPayload}`);
  const sig = await crypto.subtle.sign("HMAC", key, data.buffer as ArrayBuffer);
  return `${encodedHeader}.${encodedPayload}.${base64urlEncode(new Uint8Array(sig))}`;
}

async function verify(token: string, key: CryptoKey): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const enc = new TextEncoder();
    const data = enc.encode(`${parts[0]}.${parts[1]}`);
    const signature = base64urlDecode(parts[2]);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature.buffer as ArrayBuffer,
      data.buffer as ArrayBuffer,
    );
    if (!valid) return null;
    return JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1])));
  } catch {
    return null;
  }
}

export async function createToken(passphrase: string): Promise<string | null> {
  if (passphrase !== getAuthPassphrase()) return null;
  const key = await getSecretKey();
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: "user", iat: now, exp: now + 30 * 24 * 60 * 60 }, key);
}

export async function verifyToken(token: string): Promise<boolean> {
  const key = await getSecretKey();
  const payload = await verify(token, key);
  if (!payload) return false;
  return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
}

export function getTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function validateRequest(request: Request): Promise<boolean> {
  const token = getTokenFromRequest(request);
  if (!token) return false;
  return verifyToken(token);
}
