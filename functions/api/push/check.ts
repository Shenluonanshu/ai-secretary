// Cloudflare Pages Function — GET /api/push/check
export async function onRequestGet({ request }: { request: Request }) {
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "key") {
    return Response.json({ publicKey: "" });
  }
  return Response.json({ sent: 0, message: "提醒由客户端管理" });
}
