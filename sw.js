// LifeReady Service Worker (v12 - TimeReady schedule master next fix)

const VERSION = 'v12';
const STATIC_CACHE = `lifeready-static-${VERSION}`;
const RUNTIME_CACHE = `lifeready-runtime-${VERSION}`;

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
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

function isSameOrigin(requestUrl) {
  try {
    return new URL(requestUrl).origin === self.location.origin;
  } catch {
    return false;
  }
}

// CACHE-FIRST (good for assets)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && isSameOrigin(request.url)) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

// NETWORK-FIRST (good for pages)
async function networkFirstPage(request) {
  try {
    const response = await fetch(request);

    if (response && response.ok && isSameOrigin(request.url)) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // fallback to homepage
    const home = await caches.match('./index.html');
    if (home) return home;

    throw err;
  }
}

// STALE-WHILE-REVALIDATE (best balance)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok && isSameOrigin(request.url)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ignore weird non-http requests
  if (!url.protocol.startsWith('http')) return;

  // PAGE NAVIGATION → NETWORK FIRST
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  const destination = request.destination;

  // STATIC ASSETS → STALE WHILE REVALIDATE
  if (
    isSameOrigin(request.url) &&
    ['style', 'script', 'worker', 'font', 'image'].includes(destination)
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // HTML FETCHES
  if (
    isSameOrigin(request.url) &&
    request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // FALLBACK
  event.respondWith(
    cacheFirst(request).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      throw new Error('Request failed and no cache available.');
    })
  );
});