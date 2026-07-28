"use client";
import { useEffect, useState } from "react";
import { detectCapabilities, getBrowserTip } from "@/lib/feature-detect";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [browserTip, setBrowserTip] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const caps = detectCapabilities();

    // Already in standalone mode
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
      return;
    }

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => {
      setDeferredPrompt(null);
      setShowIOS(false);
      setDismissed(true);
    };
    window.addEventListener("appinstalled", installed);

    // iOS detection
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    if (isIOS && !("standalone" in (navigator as Navigator & { standalone?: boolean }))) {
      setShowIOS(true);
    }

    // Browser tips for Chinese browsers
    const tip = getBrowserTip(caps);
    if (tip && !deferredPrompt && !isIOS) {
      setBrowserTip(tip);
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
    if (outcome === "accepted") setDeferredPrompt(null);
  }

  function dismiss() {
    setDeferredPrompt(null);
    setShowIOS(false);
    setBrowserTip(null);
    setDismissed(true);
  }

  if (dismissed || isStandalone) return null;
  if (!deferredPrompt && !showIOS && !browserTip) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-text">
        <strong>
          {showIOS ? "添加到主屏幕" :
           deferredPrompt ? "安装 AI 秘书" :
           "获得更好体验"}
        </strong>
        <small>
          {showIOS
            ? "点击分享按钮 →「添加到主屏幕」，像 App 一样使用"
            : deferredPrompt
            ? "一键安装到桌面，离线也能用"
            : browserTip || "快速访问，离线可用"}
        </small>
      </div>
      <div className="install-banner-actions">
        {deferredPrompt && (
          <button className="btn btn-primary" onClick={handleInstall} style={{ fontSize: 12, padding: "6px 10px" }}>
            安装
          </button>
        )}
        <button className="btn btn-ghost" onClick={dismiss} style={{
          background: "var(--paper-hover)", color: "var(--muted)", fontSize: 12, padding: "6px 10px",
        }}>
          以后再说
        </button>
      </div>
    </div>
  );
}
