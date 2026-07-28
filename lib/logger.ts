// ── 全局错误捕获 & 上报 ──

/**
 * 安装全局错误处理器
 * 在 layout 或 _app 中调用一次
 */
export function installErrorHandler(): void {
  if (typeof window === "undefined") return;

  const report = async (error: Error | string, source?: string) => {
    const body = JSON.stringify({
      message: typeof error === "string" ? error : error.message,
      stack: error instanceof Error ? error.stack?.slice(0, 1000) : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    try {
      // Use sendBeacon for guaranteed delivery (even on page unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/log", body);
      } else {
        await fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } catch {
      // Never throw from error handler
    }
  };

  window.addEventListener("error", (event) => {
    report(event.error || event.message, event.filename);
  });

  window.addEventListener("unhandledrejection", (event) => {
    report(event.reason || "Unhandled Promise rejection");
  });

  console.log("[logger] Error handler installed");
}
