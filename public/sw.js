// Service Worker for PrivateGPT Zero — enables full offline access after model download
const CACHE_NAME = 'privategpt-zero-v2';

// Pre-cache the app shell on install
const APP_SHELL = [
  '/',
  '/index.html',
];

// Install: cache app shell, activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean old caches, claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Same-origin static assets: Cache-first (instant offline load)
// - Same-origin navigation: Network-first, cache fallback (fresh HTML but works offline)
// - Cross-origin / model files: Network only (WebLLM handles its own caching via Cache API)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests entirely — WebLLM models use their own Cache API
  if (url.origin !== self.location.origin) return;

  // Navigation requests (user typing URL, clicking links): network-first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache fresh HTML for next offline visit
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          // Offline: serve cached index.html so the SPA can boot
          caches.match('/index.html')
        )
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts — Vite uses hashed filenames):
  // Cache-first for speed and offline reliability
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        // Not cached yet — fetch, cache, return
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});