"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Hide after install
    const installed = () => {
      setDeferredPrompt(null);
      setShowIOS(false);
      setDismissed(true);
    };
    window.addEventListener("appinstalled", installed);

    // iOS detection: Safari, not in standalone mode
    const isIOS =
      /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) &&
      !("standalone" in (navigator as Navigator & { standalone?: boolean }));
    if (isIOS) {
      setShowIOS(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function dismiss() {
    setDeferredPrompt(null);
    setShowIOS(false);
    setDismissed(true);
  }

  if (dismissed) return null;
  if (!deferredPrompt && !showIOS) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-text">
        <strong>将 AI 秘书添加到主屏幕</strong>
        <small>
          {showIOS
            ? "点击分享按钮，选择「添加到主屏幕」"
            : "快速访问，离线可用"}
        </small>
      </div>
      <div className="install-banner-actions">
        {deferredPrompt && (
          <button className="primary" onClick={handleInstall}>
            安装
          </button>
        )}
        <button className="ghost" onClick={dismiss}>
          以后再说
        </button>
      </div>
    </div>
  );
}
