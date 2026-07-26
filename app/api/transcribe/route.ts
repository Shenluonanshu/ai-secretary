import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

    const client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    });

    const file = new File([audio], "recording.webm", { type: audio.type });

    const transcription = await client.audio.transcriptions.create({
      model: "whisper-1",
      file,
      language: "zh",
      response_format: "json",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Transcribe error:", message);
    return NextResponse.json(
      { error: "语音转写失败，请重试" },
      { status: 500 },
    );
  }
}
