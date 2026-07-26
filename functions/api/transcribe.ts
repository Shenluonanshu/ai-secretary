// Cloudflare Pages Function — POST /api/transcribe
export async function onRequestPost({ request }: { request: Request }) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!audio || !(audio instanceof Blob)) return Response.json({ error: "缺少音频数据" }, { status: 400 });
    // Cloudflare AI could be used here; for now return not-configured
    return Response.json({ text: "" });
  } catch {
    return Response.json({ error: "转写失败" }, { status: 500 });
  }
}
