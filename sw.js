const CACHE_NAME = "supertor-equations-v3";
const OFFLINE_URL = new URL("./index.html", self.registration.scope).href;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./mascot.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (!response || !response.ok) {
            throw new Error(`Navigation request failed: ${response ? response.status : "no response"}`);
          }
          const cache = await caches.open(CACHE_NAME);
          cache.put(OFFLINE_URL, response.clone());
          return response;
        } catch (error) {
          const cached = await caches.match(OFFLINE_URL);
          return (
            cached ||
            new Response("Игра недоступна без интернета. Откройте её один раз онлайн.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            })
          );
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        return new Response("", { status: 503, statusText: "Offline" });
      }
    })()
  );
});
