const CACHE_NAME = 'shape-de-elite-v22';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './data/treinos.json',
  './data/dietas.json',
  './data/exercise-videos.json',
  './data/suplementos.json',
  './data/aulas.json',
  './data/upsell.json',
  './assets/bf-10.jpg',
  './assets/bf-15.jpg',
  './assets/bf-20.jpg',
  './assets/bf-25.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // API calls (login, etc.) sempre network — sem cache
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }
  // index.html / navegação: network-first com fallback offline
  if (e.request.url.includes('index.html') || e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Cache-first pros assets estáticos (JSONs, imagens)
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
