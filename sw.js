/* Ship Happens service worker — offline app shell with zero build-step
   discipline. Navigations: network-first, falling back to the cached shell.
   Same-origin assets: stale-while-revalidate; a real content change
   (ETag/Last-Modified delta) notifies the page, which shows one debounced
   "update ready" toast. No per-deploy cache version bumps needed. */

const CACHE = 'shiphappens-shell-v1'; // bump ONLY if the cache layout changes

const PRECACHE = [
  'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/layout.css', 'css/components.css', 'css/effects.css',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/ui/icons.js', 'js/ui/art.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' }))))
      .catch(() => { /* partial precache OK; runtime caching fills gaps */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch { /* optional */ }
    }
    await self.clients.claim();
  })());
});

const stamp = (res) =>
  res ? (res.headers.get('etag') || res.headers.get('last-modified') || '') : '';

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // no third parties exist

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = (await e.preloadResponse) || await fetch(req);
        if (fresh && fresh.ok) {
          e.waitUntil(cache.put('index.html', fresh.clone()));
        }
        return fresh;
      } catch {
        const shell = await cache.match('index.html');
        return shell || Response.error();
      }
    })());
    return;
  }

  // Stale-while-revalidate for all other same-origin GETs.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const refresh = fetch(req).then(async (fresh) => {
      if (fresh && fresh.ok) {
        const changed = cached && stamp(cached) && stamp(fresh) && stamp(cached) !== stamp(fresh);
        await cache.put(req, fresh.clone());
        if (changed) {
          for (const c of await self.clients.matchAll({ type: 'window' })) {
            c.postMessage({ type: 'sw-updated', path: url.pathname });
          }
        }
      }
      return fresh;
    }).catch(() => null);
    if (cached) {
      e.waitUntil(refresh);
      return cached;
    }
    return (await refresh) || Response.error();
  })());
});
