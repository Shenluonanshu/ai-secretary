export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "语音转写服务未配置" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as Blob;
    if (!audio) {
      return NextResponse.json({ error: "缺少音频数据" }, { status: 400 });
    }

    const file = new File([audio], "recording.webm", { type: audio.type });

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: (() => {
        const fd = new FormData();
        fd.append("model", "whisper-1");
        fd.append("file", file);
        fd.append("language", "zh");
        return fd;
      })(),
    });

    const data = await response.json() as { text?: string; error?: { message: string } };
    if (!response.ok) {
      throw new Error(data.error?.message || "转写失败");
    }
    return NextResponse.json({ text: data.text || "" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "语音转写失败" },
      { status: 500 },
    );
  }
}
