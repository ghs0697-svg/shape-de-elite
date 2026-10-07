const CACHE_NAME = 'shape-de-elite-v69';
// Os JSON levam a versão no endereço (igual ao APP_V do index.html): o HTML novo nunca roda com dado velho
// do cache antigo, nem na primeira abertura depois de uma atualização.
const V = '69';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './data/treinos.json?v=' + V,
  './data/dietas.json?v=' + V,
  './data/exercise-videos.json?v=' + V,
  './data/suplementos.json?v=' + V,
  './data/aulas.json?v=' + V,
  './data/upsell.json?v=' + V,
  './data/sets-legacy-map-v1.json',
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

// Abertura do app: rede primeiro, mas com limite de tempo. Com o celular conectado e o sinal travando (o caso
// da academia), o pedido não falha, fica pendurado, e o app abria em branco até o navegador desistir sozinho.
// Agora, se a rede não responde em 3 s, abre a cópia guardada; a resposta da rede, quando chegar, renova a cópia.
const LIMITE_MS = 3000;
async function abreApp(request) {
  const cache = await caches.open(CACHE_NAME);
  const guardada = () => cache.match('./index.html');
  const rede = fetch(request).then(res => {
    if (res && res.ok) cache.put('./index.html', res.clone()).catch(() => {});
    return res;
  });
  rede.catch(() => {}); // se perder a corrida e falhar depois, não vira erro solto
  const limite = new Promise(resolve => setTimeout(() => resolve(null), LIMITE_MS));
  try {
    const res = await Promise.race([rede, limite]);
    if (res && res.ok) return res;
    return (await guardada()) || res || (await rede); // rede lenta ou erro do servidor: cópia guardada; sem cópia, espera a rede
  } catch (err) {
    const c = await guardada();
    if (c) return c;
    throw err;
  }
}

self.addEventListener('fetch', e => {
  // Chamadas da API (login etc.): sempre pela rede, sem cache
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }
  // Abertura do app (a página em si). PDF aberto em outra aba também é "navegação", mas não é o app:
  // passa direto pra rede, senão ele seria guardado no lugar do index.html.
  const caminho = new URL(e.request.url).pathname;
  const raiz = new URL('./', self.registration.scope).pathname;
  if (caminho === raiz || caminho === raiz + 'index.html') {
    e.respondWith(abreApp(e.request));
    return;
  }
  if (e.request.mode === 'navigate') return; // outra página ou PDF: o navegador resolve sozinho
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
