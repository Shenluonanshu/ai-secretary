"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hasToken } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") {
      setReady(true);
      return;
    }
    if (!hasToken()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
