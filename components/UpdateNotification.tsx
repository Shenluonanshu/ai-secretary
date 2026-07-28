"use client";
import { useEffect, useState } from "react";

/**
 * 监听 Service Worker 更新，提示用户刷新
 */
export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Listen for new service worker
    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New content is available
            setUpdateAvailable(true);
          }
        });
      });
    });

    // Also check for controllerchange (when skipWaiting completes)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  function handleUpdate() {
    // Tell SW to skip waiting and activate immediately
    navigator.serviceWorker.ready.then((reg) => {
      reg.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
  }

  if (!updateAvailable) return null;

  return (
    <div
      className="install-banner"
      style={{ background: "var(--blue)", bottom: "calc(var(--safe-bottom) + 80px)" }}
    >
      <div className="install-banner-text">
        <strong>有新版本可用 ✨</strong>
        <small style={{ color: "#c8d0ff" }}>点击更新获得最新功能和修复</small>
      </div>
      <div className="install-banner-actions">
        <button
          className="btn"
          onClick={handleUpdate}
          style={{
            background: "#fff", color: "var(--blue)", fontSize: 12,
            padding: "6px 10px", borderRadius: "var(--radius-sm)", fontWeight: 600, border: 0,
          }}
        >
          立即更新
        </button>
      </div>
    </div>
  );
}
