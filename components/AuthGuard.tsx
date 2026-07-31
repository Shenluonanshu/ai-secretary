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

  if (!ready) {
    return (
      <div className="skeleton-screen">
        <div className="skeleton-header" />
        <div className="skeleton-body">
          <div className="skeleton-bubble skeleton-bubble-user" />
          <div className="skeleton-bubble skeleton-bubble-ai" />
          <div className="skeleton-bubble skeleton-bubble-ai skeleton-bubble-short" />
        </div>
        <div className="skeleton-input-bar" />
      </div>
    );
  }
  return <>{children}</>;
}
