export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

/**
 * 前端错误日志收集
 * POST /api/log
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      message?: string;
      stack?: string;
      url?: string;
      timestamp?: string;
      userAgent?: string;
    };

    // Log to console (on Vercel/CF, this goes to logs dashboard)
    console.error(
      `[CLIENT ERROR] ${body.message || "Unknown"} | ${body.url || "?"} | ${body.timestamp || new Date().toISOString()}`
    );
    if (body.stack) {
      console.error(`[STACK] ${body.stack}`);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Never fail on logging
  }
}
