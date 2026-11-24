// Maskob orders — service worker for fast repeat visits.
// - Page and config (same-origin HTML/JS): network first, cached copy only when offline,
//   so every deploy is picked up on the next open.
// - Versioned libraries, fonts and images: cache first (they never change at the same URL).
// - Firebase traffic (Firestore, Auth, token refresh) is never intercepted.
const VERSION = 'maskob-v2';
const CDN_HOSTS = new Set(['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.gstatic.com', 'fonts.googleapis.com']);

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    if (url.pathname.startsWith('/__/')) return;                       // Firebase reserved URLs
    const isPage = req.mode === 'navigate' || url.pathname === '/' || /\.(html|js|webmanifest)$/.test(url.pathname);
    event.respondWith(isPage ? networkFirst(req) : cacheFirst(req));
    return;
  }
  if (CDN_HOSTS.has(url.hostname)) {
    // the Google Fonts stylesheet can change; the font files and versioned libraries cannot
    event.respondWith(url.hostname === 'fonts.googleapis.com' ? networkFirst(req) : cacheFirst(req));
  }
  // everything else (googleapis.com Firestore/Auth, firebaseapp.com) goes straight to the network
});
