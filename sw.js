// FlightDeck SW — caches app shell, network-first for API calls
const CACHE   = 'flightdeck-v1';
const SHELL   = ['/', '/index.html', '/manifest.json'];
const OPENSKY = 'opensky-network.org';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // OpenSky API — network only (live data, never cache)
  if (url.includes(OPENSKY)) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ states: [] }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Google Fonts — network first, fall back to cache
  if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
