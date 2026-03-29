// LifeReady Service Worker (v7)

const CACHE_NAME = 'lifeready-v7';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/privacy.html',
  '/accessibility.html',
  '/contact.html',
  '/health-disclaimer.html',
  '/CashReady.html',
  '/TimeReady.html',
  '/JobReady.html',
  '/HomeReady.html',
  '/TravelReady.html',
  '/SocialReady.html',
  '/TechReady.html',
  '/HealthReady.html',
  '/icon_192.png',
  '/icon_512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(req)) ||
            (await caches.match('/index.html'))
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((response) => {
          if (response && response.status === 200 && url.origin === location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(async () => {
          if (req.destination === 'image') {
            return caches.match('/icon_192.png');
          }
          return caches.match('/index.html');
        });
    })
  );
});