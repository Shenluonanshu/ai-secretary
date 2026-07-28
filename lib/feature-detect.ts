// ── 浏览器能力检测 & 国内适配 ──
// 检测当前浏览器对 PWA / 语音 / 推送等功能的支持情况
// 针对国产浏览器给出降级提示

export interface BrowserCapabilities {
  pwaInstall: boolean | "ios-guide";     // 是否可 PWA 安装
  serviceWorker: boolean;                 // Service Worker 支持
  webPush: boolean;                       // Web Push API
  notification: boolean;                  // Notification API
  speechRecognition: boolean;             // Web Speech API
  webShare: boolean;                      // Web Share API
  indexedDB: boolean;                     // IndexedDB（离线缓存）
  isChinese: boolean;                     // 是否国产浏览器
  browserType: BrowserType;
}

export type BrowserType =
  | "chrome" | "edge" | "firefox" | "safari"
  | "uc" | "qq" | "wechat" | "baidu" | "samsung"
  | "unknown";

/**
 * 检测当前浏览器的完整能力
 */
export function detectCapabilities(): BrowserCapabilities {
  const ua = navigator.userAgent.toLowerCase();
  const bt = detectBrowserType(ua);

  const hasSW = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const hasPush = typeof window !== "undefined" && "PushManager" in window;
  const hasNotif = typeof window !== "undefined" && "Notification" in window;
  const hasSpeech = typeof window !== "undefined" &&
    (!!(window as unknown as Record<string, unknown>).SpeechRecognition ||
    !!(window as unknown as Record<string, unknown>).webkitSpeechRecognition);
  const hasShare = typeof navigator !== "undefined" && !!navigator.share;
  const hasIDB = typeof indexedDB !== "undefined";

  // PWA install: Chrome/Edge on Android, Safari on iOS
  let pwaInstall: boolean | "ios-guide" = false;
  if (bt === "safari" && /iphone|ipad|ipod/.test(ua)) {
    pwaInstall = "ios-guide"; // iOS: need share→add to home screen guide
  } else if (bt === "chrome" || bt === "edge" || bt === "samsung") {
    pwaInstall = hasSW; // Android Chrome-like browsers
  }

  const isChinese = ["uc", "qq", "wechat", "baidu"].includes(bt);

  return {
    pwaInstall,
    serviceWorker: hasSW,
    webPush: hasPush,
    notification: hasNotif,
    speechRecognition: hasSpeech,
    webShare: hasShare,
    indexedDB: hasIDB,
    isChinese,
    browserType: bt,
  };
}

function detectBrowserType(ua: string): BrowserType {
  if (/micromessenger/.test(ua)) return "wechat";
  if (/ucbrowser|ucweb/.test(ua)) return "uc";
  if (/qqbrowser|mqqbrowser/.test(ua) && !/micromessenger/.test(ua)) return "qq";
  if (/baidubrowser|baiduboxapp/.test(ua)) return "baidu";
  if (/samsungbrowser/.test(ua)) return "samsung";
  if (/edg/.test(ua)) return "edge";
  if (/firefox/.test(ua)) return "firefox";
  if (/safari/.test(ua) && !/chrome/.test(ua)) return "safari";
  if (/chrome/.test(ua)) return "chrome";
  return "unknown";
}

/**
 * 获取浏览器兼容提示文本
 */
export function getBrowserTip(caps: BrowserCapabilities): string | null {
  // In-app browsers: suggest opening in system browser
  if (caps.browserType === "wechat") {
    return "💡 在微信中部分功能受限。点击右上角「在浏览器中打开」获得完整体验（语音录入、离线使用等）。";
  }
  if (caps.browserType === "uc" || caps.browserType === "qq" || caps.browserType === "baidu") {
    return "💡 建议使用 Chrome 或 Edge 浏览器打开，以获得语音录入和离线使用等完整体验。";
  }

  // iOS Safari with PWA install guide
  if (caps.pwaInstall === "ios-guide" && !("standalone" in navigator)) {
    return "💡 点击下方分享按钮 →「添加到主屏幕」，即可像 App 一样使用。";
  }

  // No speech
  if (!caps.speechRecognition) {
    return "💡 当前浏览器不支持语音识别。你可以使用输入法的语音输入功能代替。";
  }

  return null;
}

/**
 * 生成友好的不支持功能提示
 */
export function getUnsupportedMessage(feature: string, browser: BrowserType): string {
  const tips: Record<string, Record<string, string>> = {
    voice: {
      chrome: "当前浏览器不支持语音识别，请更新 Chrome 或使用 Edge。",
      edge: "当前浏览器不支持语音识别，请更新 Edge。",
      safari: "Safari 语音识别支持有限，请使用 Chrome 或系统输入法语音输入。",
      uc: "UC 浏览器不支持语音识别。请使用系统输入法语音输入功能代替。",
      qq: "QQ 浏览器不支持语音识别。请使用系统输入法语音输入功能代替。",
      wechat: "微信内置浏览器不支持语音识别。请使用系统输入法语音输入，或点击右上角在浏览器中打开。",
      baidu: "百度浏览器不支持语音识别。请使用系统输入法语音输入功能代替。",
      unknown: "当前浏览器不支持语音识别。请使用系统输入法语音输入功能代替。",
    },
    push: {
      wechat: "微信内置浏览器不支持通知提醒。请在浏览器中打开以接收日程提醒。",
      uc: "UC 浏览器不支持通知提醒，日程提醒将在页面打开时显示。",
      qq: "QQ 浏览器不支持通知提醒，日程提醒将在页面打开时显示。",
      baidu: "百度浏览器不支持通知提醒，日程提醒将在页面打开时显示。",
      unknown: "当前浏览器不支持推送通知。",
    },
    offline: {
      wechat: "微信内置浏览器不支持离线使用。",
      uc: "UC 浏览器离线功能有限。",
      qq: "QQ 浏览器离线功能有限。",
      baidu: "百度浏览器离线功能有限。",
      unknown: "当前浏览器不支持离线使用。",
    },
  };

  return tips[feature]?.[browser] || tips[feature]?.unknown || "当前浏览器不支持此功能。";
}
