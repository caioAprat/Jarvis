// Jarvis: guarda a tela para abrir sem internet e mostra as notificações.
// O push chega vazio; aqui buscamos o texto do aviso no Jarvis com a chave guardada pelo app.
const VERSAO = 'jarvis-v1';
const CASCA = ['./', 'index.html', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCA)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k !== VERSAO && k !== 'jarvis-cfg').map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(x => x.put('index.html', c)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(g => g || fetch(e.request)));
});

async function lerCache(chave) {
  try { const r = await (await caches.open('jarvis-cfg')).match(chave); return r ? await r.text() : null; } catch (e) { return null; }
}

self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let titulo = 'Jarvis', corpo = 'Novo aviso', url = './', tag = 'jarvis';
    try {
      const cfg = JSON.parse(await lerCache('cfg'));
      const ultimo = Number(await lerCache('ultimo')) || 0;
      const r = await fetch(cfg.u + '?k=' + encodeURIComponent(cfg.k) + '&acao=avisos&desde=' + ultimo, { redirect: 'follow' });
      const avisos = (await r.json()).avisos || [];
      if (avisos.length) {
        const a = avisos[0];
        titulo = a.titulo; corpo = a.texto || ''; url = a.url || './'; tag = 'aviso-' + a.id;
        if (avisos.length > 1) corpo += `\n+${avisos.length - 1} aviso(s) no Jarvis`;
        await (await caches.open('jarvis-cfg')).put('ultimo', new Response(String(a.id)));
      }
    } catch (err) { /* sem conexão: mostra o genérico */ }
    await self.registration.showNotification(titulo, { body: corpo.slice(0, 300), tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url } });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.openWindow(url));
});
