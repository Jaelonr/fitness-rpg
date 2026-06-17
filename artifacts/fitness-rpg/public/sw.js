self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "Fitness RPG", body: event.data.text() }; }

  const options = {
    body: payload.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag ?? "default",
    data: { url: payload.url ?? "/" },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(payload.title ?? "Fitness RPG", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(clients.openWindow(url));
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));
