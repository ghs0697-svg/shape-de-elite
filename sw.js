const CACHE_NAME = 'shape-de-elite-v45';
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
  './assets/bf-10.jpg?v=2',
  './assets/bf-15.jpg?v=2',
  './assets/bf-20.jpg?v=2',
  './assets/bf-25.jpg?v=2'
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
  // Imagens: network-first (nunca fica preso em resposta velha/quebrada do cache)
  if (e.request.destination === 'image' || /\.(jpg|jpeg|png|webp)(\?|$)/.test(e.request.url)) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first pros demais assets estáticos (JSONs), só serve resposta válida
  e.respondWith(caches.match(e.request).then(r => (r && r.ok ? r : fetch(e.request))));
});
