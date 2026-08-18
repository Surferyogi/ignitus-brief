/* Ignitus Brief service worker — v2026:08:18-12:05
   BUMP SHELL_CACHE ON EVERY index.html DEPLOY. The shell is served cache-first,
   so an unchanged cache name lets an old index.html survive a refresh; changing
   the name makes the activate handler delete the stale cache. (CK 2026-08-18)
   Shell: cache-first. API data is cached by the page itself (Cache API, DATA_CACHE). */
const SHELL_CACHE = "ignitus-shell-v15";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith("ignitus-shell-") && k !== SHELL_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    // app shell: cache-first, refresh in background
    e.respondWith(
      caches.match(e.request).then(hit => {
        const net = fetch(e.request).then(r => {
          if (r.ok) caches.open(SHELL_CACHE).then(c => c.put(e.request, r.clone()));
          return r;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
  // Supabase API requests pass through — the page handles its own data caching/fallback.
});
