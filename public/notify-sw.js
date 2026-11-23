// Service worker: notificações + critério de PWA (Chrome exige fetch handler).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Rede pura — sem cache. Só existe para o Chrome considerar o app instalável.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = all[0];
      if (existing) return existing.focus();
      return self.clients.openWindow("/");
    })(),
  );
});
