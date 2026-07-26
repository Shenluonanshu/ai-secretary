const CACHE = "ai-secretary-v3";

// Static assets to precache on install
const SHELL = ["/", "/manifest.json", "/icon.svg"];

// ── Install ──
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)),
  );
});

// ── Activate ──
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  ),
);

// ── Fetch ──
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API calls: network only (no caching)
  if (url.pathname.startsWith("/api/")) return;

  // Static assets: cache-first
  const isStatic =
    url.pathname.match(/\.(js|css|png|svg|ico|woff2?)$/) ||
    url.pathname === "/" ||
    url.pathname.startsWith("/_next/");

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        // Return cached immediately, update cache in background
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
        return cached || fetchPromise;
      }),
    );
    return;
  }

  // Pages: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});

// ── Push ──
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const { title, body, icon, tag, url, eventId } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body || "",
      icon: icon || "/icon.svg",
      badge: "/icon.svg",
      tag: tag || eventId || title,
      data: { url: url || "/", eventId },
      vibrate: [200, 100, 200],
      requireInteraction: true,
      renotify: true,
      actions: [
        { action: "view", title: "查看" },
        { action: "dismiss", title: "忽略" },
      ],
    }),
  );
});

// ── Notification Click ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const client = clientList.find(
          (c) => c.url.includes(self.location.origin) && "focus" in c,
        );
        if (client) return (client as WindowClient).focus();
        return self.clients.openWindow(
          event.notification.data?.url || "/",
        );
      }),
  );
});
