import { getRequestContext } from "@cloudflare/next-on-pages";

export function onCloudflare(): boolean {
  try {
    getRequestContext();
    return true;
  } catch {
    return false;
  }
}
