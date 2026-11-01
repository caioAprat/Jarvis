// Jarvão: guarda a tela para abrir sem internet e mostra as notificações.
// O push chega vazio; aqui buscamos o texto do aviso no Jarvão com a chave guardada pelo app.
// Regra do iPhone: TODO push precisa mostrar uma notificação, senão o Safari cancela a inscrição.
const VERSAO = 'jarvis-landing-v6';
const CASCA = ['./', 'index.html', 'app.html', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'pc.html', 'landing-acesso.js', 'landing-dados.js', 'landing-roteiro.js', 'chamadas.js', 'landing-ponteiro.js', 'cadeado.js', 'landing-particulas.js', 'mapa-vivo.js', 'landing-escrita.js', 'prototipo.js', 'landing-cinema.js', 'telas-vivas.js', 'landing-telas.js', 'nav-cenas.js', 'fundo.js', 'planeta.js', 'landing-scroll.js'];
const BIBLIOTECAS = ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/MaskPass.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrambleTextPlugin.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/SplitText.min.js', 'https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(VERSAO).then(async c => { await c.addAll(CASCA); await Promise.allSettled(BIBLIOTECAS.map(u => c.add(u))); }).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k !== VERSAO && k !== 'jarvis-cfg').map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) {
    if (!BIBLIOTECAS.includes(url.href) && !['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) return;
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') caches.open(VERSAO).then(c => c.put(e.request, r.clone())); return r; }))); return;
  }
  if (e.request.mode === 'navigate') {
    // index.html = landing; app.html = app do iPhone; pc.html = Central do PC
    const pagina = url.pathname.endsWith('pc.html') ? 'pc.html' : url.pathname.endsWith('app.html') ? 'app.html' : 'index.html';
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(x => x.put(pagina, c)); return r; })
      .catch(() => caches.match(pagina)));
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
        n = { titulo: a.titulo, corpo: (a.texto || '') + (avisos.length > 1 ? `\n+${avisos.length - 1} aviso(s) no Jarvão` : ''), url: a.url || './app.html', tag: 'aviso-' + a.id };
        await gravarCache('ultimo', String(a.id));
        await gravarCache('ultimoAviso', JSON.stringify(n));
      }
    } catch (err) { /* sem conexão ou demorou: usa o último aviso conhecido */ }
    if (!n) { try { n = JSON.parse(await lerCache('ultimoAviso')); } catch (err) { n = null; } }
    if (!n) n = { titulo: 'Jarvão', corpo: 'Novo aviso. Toque para ver.', url: './app.html', tag: 'jarvis' };
    await self.registration.showNotification(n.titulo, { body: String(n.corpo || '').slice(0, 300), tag: n.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: n.url } });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './app.html';
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const destino = new URL(url, self.location.href).href;
    const mesma = abertas.find(c => c.url.split('#')[0] === destino.split('#')[0]);
    if (mesma) return mesma.focus();
    return self.clients.openWindow(destino);
  })());
});
