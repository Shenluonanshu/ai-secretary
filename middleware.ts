import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "./lib/auth";

export const runtime = "experimental-edge";

const PUBLIC_PATHS = ["/api/auth", "/login", "/manifest.json", "/icon.svg", "/icon-", "/sw.js"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const valid = await validateRequest(request as unknown as Request);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
