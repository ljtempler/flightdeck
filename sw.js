// FlightDeck service worker v2
// Key fix: never cache Worker API calls or any external fetch

const CACHE = 'flightdeck-v2';
const SHELL = ['/', '/index.html', '/manifest.json'];

// These must always go to the network — never serve from cache
const NETWORK_ONLY = [
  'workers.dev',       // Cloudflare Worker (our API proxy)
  'adsb.lol',
  'airplanes.live',
  'nominatim',         // Reverse geocoding on location set
  'googleapis.com/api',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  // Clear any old cache versions
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // API calls — always network, never cache
  if (NETWORK_ONLY.some(p => url.includes(p))) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ ac: [] }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Google Fonts — network first, cache for offline fallback
  if (url.includes('fonts.gstatic') || url.includes('fonts.googleapis')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const toCache = response.clone();    // clone BEFORE returning
          caches.open(CACHE).then(c => c.put(e.request, toCache));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
