// LifeReady Service Worker (v9 - stable, GitHub Pages safe)

const CACHE_NAME = 'lifeready-v9';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './privacy.html',
  './accessibility.html',
  './contact.html',
  './health-disclaimer.html',

  './CashReady.html',
  './TimeReady.html',
  './JobReady.html',
  './HomeReady.html',
  './TravelReady.html',
  './SocialReady.html',
  './TechReady.html',
  './HealthReady.html',

  './icon_192.png',
  './icon_512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  // Page navigation
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Assets
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});