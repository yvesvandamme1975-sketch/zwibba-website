// Zwibba PWA service worker - offline app shell for flaky networks (DRC).
// CACHE_VERSION is replaced at build time so each deploy ships a fresh cache.
const CACHE_VERSION = "__ZWIBBA_BUILD__";
const APP_SHELL = [
  "/App/",
  "/assets/app/app.js",
  "/assets/app/app.css",
  "/assets/styles.css",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Cross-origin (API, fonts) bypass the worker and go straight to the network.
  if (url.origin !== self.location.origin) {
    return;
  }

  // SPA navigations: network first, fall back to the cached app shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/App/").then((cached) => cached || caches.match(request)),
      ),
    );
    return;
  }

  // App assets: stale-while-revalidate so the ESM modules work offline after the
  // first online visit, while staying fresh when the network is up.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/App/")) {
    event.respondWith(
      caches.open(CACHE_VERSION).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => cached);
          return cached || network;
        }),
      ),
    );
  }
});
