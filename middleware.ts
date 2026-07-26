import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "./lib/auth";

const PUBLIC_PATHS = ["/api/auth", "/login", "/manifest.json", "/icon.svg", "/sw.js"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only protect API routes
  if (pathname.startsWith("/api/")) {
    const valid = await validateRequest(request);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
