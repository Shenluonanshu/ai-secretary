"use client";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushManager() {
  const [status, setStatus] = useState<
    "loading" | "unsupported" | "denied" | "subscribing" | "subscribed" | "error"
  >("loading");

  useEffect(() => {
    async function setup() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      try {
        // Get VAPID public key from server
        const keyRes = await authFetch("/api/push/check?action=key");
        const { publicKey } = await keyRes.json();
        if (!publicKey) {
          setStatus("error");
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          setStatus("subscribing");
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
          });
        }

        // Send subscription to server
        await authFetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });

        setStatus("subscribed");
      } catch {
        setStatus("error");
      }
    }

    setup();
  }, []);

  // Silent component - manages push subscription in background
  // Status is available for debugging via React DevTools
  return null;
}
