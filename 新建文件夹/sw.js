/* 口语帮手 Service Worker：缓存页面与应用图标，支持离线打开 */
const CACHE = "speakup-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/pwa/icon-512.png",
  "./icons/pwa/icon-192.png",
  "./icons/pwa/icon-144.png",
  "./icons/pwa/icon-96.png",
  "./icons/pwa/apple-touch-icon-180.png",
  "./icons/pwa/apple-touch-icon-167.png",
  "./icons/pwa/apple-touch-icon-152.png",
  "./icons/pwa/apple-touch-icon-120.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
