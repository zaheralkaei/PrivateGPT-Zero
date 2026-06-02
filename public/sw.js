// Service Worker for PrivateGPT Zero — enables full offline access after model download
const CACHE_NAME = 'privategpt-zero-v3';
const APP_SHELL = ['/', '/index.html'];

// Install: pre-cache the app shell, take over immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean old caches, claim all clients, warm the asset cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop old caches
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
      await self.clients.claim();

      // Warm cache: read index.html, extract /assets/* URLs, fetch and cache them.
      // This way the very first offline visit works — we don't have to wait for
      // a previous online visit to have fetched the JS/CSS chunks.
      try {
        const cache = await caches.open(CACHE_NAME);
        const indexReq = await cache.match('/index.html') || await fetch('/index.html');
        if (indexReq && indexReq.ok) {
          const html = await indexReq.text();
          // Match src="/assets/..." and href="/assets/..." (Vite's hashed chunks)
          const matches = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)];
          const assetUrls = [...new Set(matches.map((m) => m[1]))];
          await Promise.all(
            assetUrls.map(async (url) => {
              // Skip if already cached
              const existing = await cache.match(url);
              if (existing) return;
              try {
                const resp = await fetch(url, { cache: 'reload' });
                if (resp.ok) await cache.put(url, resp);
              } catch (_) {
                // Offline at activation time — assets will be cached on next online visit
              }
            })
          );
        }
      } catch (err) {
        // Activation warming is best-effort; don't fail activation if it errors
      }
    })()
  );
});

// Allow the page to ask the SW to (re)warm its cache with a specific list of URLs.
// Used after the app loads so any assets that didn't exist in index.html (e.g. lazy
// chunks) also get pre-cached.
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'PRECACHE_URLS') return;
  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        urls.map(async (url) => {
          try {
            const existing = await cache.match(url);
            if (existing) return;
            const resp = await fetch(url, { cache: 'reload' });
            if (resp.ok) await cache.put(url, resp);
          } catch (_) {
            // best-effort
          }
        })
      );
    })()
  );
});

// Fetch strategy:
// - Navigation (page loads, refreshes): network-first, fall back to cached /index.html
// - /assets/* (Vite's hashed JS/CSS): cache-first (instant + works offline)
// - Other same-origin GET: network-first, fall back to cache
// - Cross-origin: not intercepted (WebLLM uses its own Cache API for model weights)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GETs; let everything else pass through
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  // Cross-origin: let it through (CDN model weights etc.)
  if (url.origin !== self.location.origin) return;

  // Navigation: network-first, fall back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(request)) ||
            (await caches.match('/index.html'));
          if (cached) return cached;
          // Last-resort offline response
          return new Response(
            '<!doctype html><html><head><meta charset="utf-8"><title>Offline</title></head>' +
            '<body style="font-family:system-ui;padding:2rem;text-align:center">' +
            '<h1>You are offline</h1>' +
            '<p>Open this app once while online so the service worker can cache it for offline use.</p>' +
            '</body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Vite's hashed /assets/* — cache-first (works fully offline once warmed)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          // Asset not in cache and we're offline — return a clear error rather
          // than letting the browser show "Failed to fetch" generically
          return new Response('Offline and asset not cached', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
    );
    return;
  }

  // Other same-origin GETs: network-first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
