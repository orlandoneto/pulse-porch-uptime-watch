// Service worker apenas para notificações. Não faz cache de nada.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
