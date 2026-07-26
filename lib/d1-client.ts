import { getRequestContext } from "@cloudflare/next-on-pages";

let _db: D1Database | null = null;

export function getDB(): D1Database {
  if (!_db) {
    try {
      const ctx = getRequestContext();
      _db = ctx.env.DB as D1Database;
    } catch {
      throw new Error("D1 database not available — not running on Cloudflare Pages");
    }
  }
  return _db;
}

export function isCloudflare(): boolean {
  try {
    getRequestContext();
    return true;
  } catch {
    return false;
  }
}
