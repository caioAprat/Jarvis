// Jarvão: guarda a tela para abrir sem internet e mostra as notificações.
// O push chega vazio; aqui buscamos o texto do aviso no Jarvão com a chave guardada pelo app.
// Regra do iPhone: TODO push precisa mostrar uma notificação, senão o Safari cancela a inscrição.
const VERSAO = 'jarvis-v7-orbitas2d';
const CASCA = ['./', 'index.html', 'pc.html', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
  'mapa-2d.js', 'cena-2d.js', 'cena-2d.css', 'jornada.js', 'demo.js',
  'vendor/pixi.min.js', 'vendor/gsap.min.js', 'vendor/ScrollTrigger.min.js', 'vendor/lenis.min.js', 'vendor/lenis.css',
  'assets/scene/fallback-nucleo.webp', ...['nucleo-0','nucleo-1','universo'].flatMap(n=>['json','webp'].map(ext=>'assets/scene/'+n+'.'+ext))];

self.addEventListener('install', e => e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCA)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k !== VERSAO && k !== 'jarvis-cfg').map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.searchParams.has('demo') || /\/(?:demo\.html|assets\/demo\.json|__demo_sem_servidor__)$/.test(url.pathname)) return;
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(x => x.put(url.pathname.endsWith('pc.html') ? 'pc.html' : 'index.html', c)); return r; })
      .catch(() => caches.match(url.pathname.endsWith('pc.html') ? 'pc.html' : 'index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(g => g || fetch(e.request)));
});

async function lerCache(chave) {
  try { const r = await (await caches.open('jarvis-cfg')).match(chave); return r ? await r.text() : null; } catch (e) { return null; }
}
async function gravarCache(chave, valor) {
  try { await (await caches.open('jarvis-cfg')).put(chave, new Response(valor)); } catch (e) { /* sem espaço: segue */ }
}

self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let n = null;
    try {
      const cfg = JSON.parse(await lerCache('cfg'));
      const ultimo = Number(await lerCache('ultimo')) || 0;
      const ctl = new AbortController();
      const prazo = setTimeout(() => ctl.abort(), 6000);           // o iOS encerra o service worker se demorar
      const r = await fetch(cfg.u + '?k=' + encodeURIComponent(cfg.k) + '&acao=avisos&desde=' + ultimo, { redirect: 'follow', signal: ctl.signal });
      clearTimeout(prazo);
      const avisos = (await r.json()).avisos || [];
      if (avisos.length) {
        const a = avisos[0];
        n = { titulo: a.titulo, corpo: (a.texto || '') + (avisos.length > 1 ? `\n+${avisos.length - 1} aviso(s) no Jarvão` : ''), url: a.url || './', tag: 'aviso-' + a.id };
        await gravarCache('ultimo', String(a.id));
        await gravarCache('ultimoAviso', JSON.stringify(n));
      }
    } catch (err) { /* sem conexão ou demorou: usa o último aviso conhecido */ }
    if (!n) { try { n = JSON.parse(await lerCache('ultimoAviso')); } catch (err) { n = null; } }
    if (!n) n = { titulo: 'Jarvão', corpo: 'Novo aviso. Toque para ver.', url: './', tag: 'jarvis' };
    await self.registration.showNotification(n.titulo, { body: String(n.corpo || '').slice(0, 300), tag: n.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: n.url } });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const destino = new URL(url, self.location.href).href;
    const mesma = abertas.find(c => c.url.split('#')[0] === destino.split('#')[0]);
    if (mesma) return mesma.focus();
    return self.clients.openWindow(destino);
  })());
});
