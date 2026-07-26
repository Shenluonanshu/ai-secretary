export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { passphrase } = await request.json();
  if (!passphrase) {
    return NextResponse.json({ error: "请输入密码" }, { status: 400 });
  }
  const token = await createToken(passphrase);
  if (!token) {
    return NextResponse.json({ error: "密码不正确" }, { status: 401 });
  }
  return NextResponse.json({ token });
}
