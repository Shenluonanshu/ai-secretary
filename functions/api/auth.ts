// Cloudflare Pages Function — POST /api/auth
export async function onRequestPost({ request, env }: { request: Request; env: { DB: D1Database; AUTH_PASSPHRASE: string; JWT_SECRET: string } }) {
  try {
    const { passphrase } = await request.json() as { passphrase?: string };
    if (!passphrase) return Response.json({ error: "请输入密码" }, { status: 400 });
    if (passphrase !== (env.AUTH_PASSPHRASE || "admin")) return Response.json({ error: "密码不正确" }, { status: 401 });

    const secret = env.JWT_SECRET || env.AUTH_PASSPHRASE || "default";
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: "user", iat: now, exp: now + 30 * 24 * 60 * 60 };
    const header = { alg: "HS256", typ: "JWT" };
    const enc = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const hp = enc(JSON.stringify(header)) + "." + enc(JSON.stringify(payload));
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(hp));
    const token = hp + "." + enc(String.fromCharCode(...new Uint8Array(sig)));
    return Response.json({ token });
  } catch (e) {
    return Response.json({ error: "登录失败" }, { status: 500 });
  }
}
