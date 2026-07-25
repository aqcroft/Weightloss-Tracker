/* Progress Tracker service worker
   - makes the app installable on Android
   - caches the app shell so it opens instantly / offline
   - NEVER caches the Google Sheet data (that always goes to the network, stays fresh)
   - network-first for the page itself, so pushing a new index.html reaches her next time she's online
   Bump CACHE_VERSION whenever you want to force a clean refresh. */
const CACHE_VERSION = "bmt-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                 // saves are POST, never touch them
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;        // let fonts, Chart.js CDN and the Sheet API go straight to network

  if (req.mode === "navigate") {                     // the page: network-first so updates land
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match("./index.html")))
    );
    return;
  }
  // other same-origin assets: cache-first, fall back to network
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, cp)); return r; }))
  );
});
