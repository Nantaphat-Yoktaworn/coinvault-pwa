// Service worker: cache the app shell so it works offline once installed.
const CACHE = 'coinvault-v4';
const ASSETS = [
  './',
  './css/styles.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/cloud.js',
  './js/login.js',
  './js/db.js',
  './js/util.js',
  './js/sheet.js',
  './js/categories.js',
  './js/budgets.js',
  './js/settings.js',
  './js/views/money.js',
  './js/views/stats.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-64.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// iOS standalone PWAs reject any navigation response with `redirected: true`
// ("Response served by service worker has redirections"). Rebuild a clean response.
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.arrayBuffer();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // Never cache API calls — they must always hit the network (auth + live data).
  if (new URL(request.url).pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return clean(cached);
    try {
      const res = await fetch(request);
      // Only cache clean, non-redirected, same-origin 200s.
      if (res && res.status === 200 && !res.redirected && new URL(request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return clean(res);
    } catch {
      return cached || Response.error();
    }
  })());
});
