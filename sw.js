// SignOn Service Worker
// Bump this version every time you update the app — users get the new version automatically
const CACHE = 'signon-v3';

// Install: cache the app shell immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['/', '/index.html']))
      .then(() => self.skipWaiting()) // take over immediately, don't wait
  );
});

// Activate: delete old caches, take control of all open tabs right away
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // control all open tabs immediately
  );
});

// Fetch strategy:
// - HTML page: network first, fall back to cache (ensures updates are picked up)
// - Google Fonts: network first, cache as fallback
// - Everything else: cache first for speed
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Google Fonts — network first
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // HTML page — network first so updates are always picked up on next visit
  if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
    return;
  }

  // Everything else — cache first for speed
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
