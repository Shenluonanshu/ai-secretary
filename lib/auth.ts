import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const getSecret = () => {
  const secret = process.env.JWT_SECRET || process.env.AUTH_PASSPHRASE || "ai-secretary-default";
  return new TextEncoder().encode(secret);
};

const AUTH_PASSPHRASE = process.env.AUTH_PASSPHRASE || "admin";

export async function createToken(passphrase: string): Promise<string | null> {
  if (passphrase !== AUTH_PASSPHRASE) return null;
  return new SignJWT({ sub: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function validateRequest(request: NextRequest): Promise<boolean> {
  const token = getTokenFromRequest(request);
  if (!token) return false;
  return verifyToken(token);
}
