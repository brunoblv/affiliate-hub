self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Aviso genérico se payload inválido. */ }
  event.waitUntil(self.registration.showNotification("Affiliate Hub — alerta de preço", {
    body: typeof data.body === "string" ? data.body.slice(0, 300) : "Confira seus alertas na conta.",
    tag: typeof data.tag === "string" ? data.tag : "price-alert",
    data: { url: typeof data.url === "string" ? data.url : "/conta#alertas" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let url = new URL("/conta#alertas", self.location.origin);
  try {
    const requested = new URL(event.notification.data?.url, self.location.origin);
    if (requested.origin === self.location.origin && /^\/produto\/[^/]+$/.test(requested.pathname)) url = requested;
  } catch { /* Nunca abrir destinos externos. */ }
  event.waitUntil(self.clients.openWindow(url.href));
});
