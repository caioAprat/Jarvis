// Modelo do worker exclusivo da v3. scripts/preparar-v3.cjs grava a versão final
// em /v3/sw-v3.js. Nunca registrar este modelo na raiz do site da main.
const PREFIXO_V3 = 'jarvao-v3-casca-';
const CACHE_V3 = PREFIXO_V3 + '__BUILD_V3__';
const ARQUIVOS_V3 = /*__ARQUIVOS_V3__*/[];
const urlsV3 = new Set(ARQUIVOS_V3.map(p => new URL(p, self.registration.scope).href));
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE_V3);
  await cache.addAll([...urlsV3].map(url => new Request(url, { cache: 'reload' })));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith(PREFIXO_V3) && k !== CACHE_V3).map(k => caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = ''; url.hash = '';
  // Lista explícita de recursos estáticos. API, parâmetros, chaves e dados
  // pessoais jamais entram neste cache, nem mesmo se a API usar a mesma origem.
  if (!urlsV3.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_V3);
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type !== 'opaque') await cache.put(url.href, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(url.href);
      if (cached) return cached;
      throw error;
    }
  })());
});
