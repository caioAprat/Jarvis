'use strict';
/**
 * Landing v2 · Seção 1 (o Núcleo): roteiro de rolagem em 7 cenas, numa só timeline GSAP com pin + scrub.
 *  0 Abertura · 1 Núcleo (métricas) · 2 Construção · 3 Travessia · 4 Distorção · 5 Projetos · 6 Fecho
 * A cena 3D é a do mapa-vivo.js (modo cinema); os objetos extras vêm de landing-cena.js.
 * Não guarda dados nem chaves: os números só aparecem se o navegador já tiver o acesso salvo pela Central (pc.html).
 */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduzido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const temCena = !!(window.MapaVivo && window.THREE && window.gsap && window.LandingCena);

  // os 7 projetos reais, na ordem do servidor (apps-script/Codigo.gs)
  const PROJETOS = [
    { id: 'gabinete', nome: 'Gabinete Chamados' },
    { id: 'planilha', nome: 'Planilha J Hissnauer', cliente: true },
    { id: 'assistente', nome: 'Assistente financeiro' },
    { id: 'painel', nome: 'Painel Meu dinheiro' },
    { id: 'pedalada', nome: 'Pedalada do Delei' },
    { id: 'atrasos', nome: 'Bot de atrasos' },
    { id: 'cacador', nome: 'Caçador de clientes' },
  ];
  const ESTADO_TXT = { ok: 'no ar', atencao: 'atenção', erro: 'problema', pausado: 'pausado', config: 'configurar', aguardando: 'aguardando' };
  let PS = null;                                      // projetos reais, quando houver acesso

  const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  if (window.MapaVivo) { $('#logo').innerHTML = MapaVivo.logo(); $('#nome').innerHTML = MapaVivo.marca(); }

  // ---------------------------------------------------------------- painel lateral (o mesmo da Central)
  const painel = $('#painel');
  function abrir(id) {
    const base = PROJETOS.find(p => p.id === id); if (!base) return;
    const p = (PS && PS.find(x => x.id === id)) || base, nome = window.MapaVivo ? MapaVivo.limpar(p.nome) : p.nome;
    painel.innerHTML = `<button type="button" class="fechar" aria-label="Fechar detalhes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <div class="cab">${window.MapaVivo ? MapaVivo.icone(p.id) : ''}<span>${esc(nome)}</span></div>
      ${PS ? `<span class="pill ${esc(p.status)}">${esc(ESTADO_TXT[p.status] || p.status)}</span>${p.detalhe ? `<div class="det">${esc(p.detalhe)}</div>` : ''}`
           : '<div class="peq">O estado aparece aqui depois que este navegador entrar na Central.</div>'}
      <a class="ir" href="pc.html#mapa">Abrir na Central</a>`;
    painel.setAttribute('aria-label', 'Detalhes de ' + nome);
    painel.hidden = false;
    painel.querySelector('.fechar').addEventListener('click', fechar);
    painel.querySelector('.fechar').focus({ preventScroll: true });
    if (mapa) mapa.selecionar(id);
  }
  function fechar() { painel.hidden = true; if (mapa) mapa.selecionar(''); }
  addEventListener('keydown', e => { if (e.key === 'Escape' && !painel.hidden) fechar(); });

  // ---------------------------------------------------------------- cena
  let rotuloTimer = new Map();
  const mapa = temCena ? MapaVivo.montar({
    fundo: true, cinema: true, dica: 'Ver detalhes', aoSelecionar: abrir,
    aoPassar: id => { const n = id && cine.nos().find(x => x.id === id); if (n && pac) pac.enviar(n, 1); },
    aoChegar: id => {
      const n = cine.nos().find(x => x.id === id); if (!n || !n.btn) return;
      n.btn.classList.add('chegou'); clearTimeout(rotuloTimer.get(id));
      rotuloTimer.set(id, setTimeout(() => n.btn.classList.remove('chegou'), 450));
    },
  }) : null;
  const cine = mapa && mapa.cinema;
  if (mapa) {
    document.body.prepend(mapa.el);
    mapa.el.dataset.semDados = '';
    mapa.atualizar(PROJETOS.map(p => Object.assign({ status: 'aguardando' }, p)), { estado: 'ok', titulo: '' });
  }
  const R0 = () => cine ? cine.camPadrao().z : 28;      // o enquadramento da main nesta tela
  const U = cine ? cine.raio / 11.8 : 1;                 // a cena do celular é menor
  const C = window.LandingCena;
  const amb = cine ? C.ambiente(cine, R0(), cine.baixo) : null;
  const cons = cine && !reduzido ? C.construcao(cine, U, cine.baixo) : null;
  const pele = cine && !reduzido ? C.pele(cine) : null;
  const pac = cine && !reduzido ? C.pacotes(cine) : null;
  const ris = cine && !reduzido ? C.riscos(cine, cine.baixo) : null;
  const reg = cine ? C.regua(cine) : null;

  // distorção (Igloo): refração + aberração contida e quente + névoa; ligada só na cena 4
  const DISTORCAO = {
    uniforms: { tDiffuse: { value: null }, uForca: { value: 0 }, uTempo: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uForca, uTempo, uAspect; varying vec2 vUv;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
        return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
      float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
      void main(){
        vec2 c = vUv - .5; c.x *= uAspect; float r = length(c);
        vec2 q = vUv * vec2(uAspect, 1.) * 2.6;
        vec2 warp = vec2(n2(q + uTempo * .12), n2(q * 1.3 - uTempo * .1 + 7.3)) - .5;
        vec2 uv = vUv + warp * .075 * uForca * (.35 + r);
        vec2 dir = normalize(vUv - .5 + 1e-4) * (.0015 + .0045 * min(r, 1.)) * uForca;
        vec3 base = texture2D(tDiffuse, uv).rgb;
        vec3 a = texture2D(tDiffuse, uv + dir).rgb, b = texture2D(tDiffuse, uv - dir).rgb;
        vec2 px = vec2(.004 * uForca);
        vec3 nev = (texture2D(tDiffuse, uv + vec2(px.x, 0.)).rgb + texture2D(tDiffuse, uv - vec2(px.x, 0.)).rgb
                  + texture2D(tDiffuse, uv + vec2(0., px.y)).rgb + texture2D(tDiffuse, uv - vec2(0., px.y)).rgb) * .25;
        vec3 col = mix(base, nev, .6 * uForca);
        col += vec3(1., .54, .24) * abs(lum(a) - lum(b)) * 1.6 * uForca;
        col = mix(col, col * .8 + vec3(1., .54, .24) * .035, uForca * .6);
        gl_FragColor = vec4(col, 1.);
      }`,
  };
  let passo = null;
  if (cine && !reduzido && THREE.ShaderPass) { passo = new THREE.ShaderPass(DISTORCAO); passo.enabled = false; if (!cine.adicionarPasso(passo)) passo = null; }

  // ---------------------------------------------------------------- câmera: p → ângulo, raio, altura, FOV, mira (raio/altura/mira em múltiplos do enquadramento da main)
  const CHAVES = [
    // p     âng  raio  alt   FOV  mira
    [0,      0,   1,    .34,  40,  0],     // 0 Abertura: o enquadramento da main
    [.10,    0,   1,    .34,  40,  0],
    [.25,    0,   .86,  .29,  40,  0],     // 1 Núcleo: aproxima devagar
    [.40,    55,  1.2,  .95,  40, -.18],   // 2 Construção: sobe e gira para ver os blocos
    [.55,    10,  .5,   .09,  58,  0],     // 3 Travessia: mergulho rápido até a órbita
    [.65,   -25,  .55,  .1,   54,  0],     // 4 Distorção: só a câmera gira em volta da cena parada
    [.90,    0,   1,    .34,  40,  0],     // 5 Projetos: recua até a visão geral
    [1,      0,   1,    .34,  40,  0],     // 6 Fecho: estabiliza
  ];
  function monotona(xs, ys) {
    const n = xs.length, d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
    }
    return x => {
      if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const hgt = xs[i + 1] - xs[i], t = (x - xs[i]) / hgt, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * hgt * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * hgt * m[i + 1];
    };
  }
  const xs = CHAVES.map(c => c[0]), [ANG, RAIO, ALT, FOV, MIRA] = [1, 2, 3, 4, 5].map(k => monotona(xs, CHAVES.map(c => c[k])));

  // ---------------------------------------------------------------- estado que a timeline anima
  const est = { p: 0 }, st = { pele: 0, cons: 0, consOp: 0, risc: 0, dist: 0, regua: 0 }, abre = { k: reduzido ? 1 : 2.1 };
  const vis = PROJETOS.map(() => ({ v: reduzido ? 1 : 0 }));

  // ---------------------------------------------------------------- quadro a quadro
  let giro = 0, pAnt = 0, vel = 0, ultimaLeitura = '';
  const leitura = $('#leitura');
  function aplicar(dt) {
    if (!cine) return;
    const p = est.p, r0 = R0(), congela = cine.congela.v;
    // tela em pé: na visão geral a câmera olha mais de cima, para as órbitas usarem a altura da tela
    const alto = innerHeight > innerWidth ? 1.6 * (1 - suave(.25, .4, p) * (1 - suave(.6, .85, p))) : 0;
    const a = ANG(p) * Math.PI / 180, r = RAIO(p) * r0 * abre.k;
    Object.assign(cine.cam, { x: Math.sin(a) * r, z: Math.cos(a) * r, y: ALT(p) * (1 + alto) * r0 * abre.k, fov: FOV(p), ly: MIRA(p) * r0, cursor: 1 - .7 * suave(.4, .55, p) * (1 - suave(.65, .9, p)) });
    giro += dt * .06 * (1 - congela); cine.giro.v = giro + p * 2.2;
    const nos = cine.nos(); nos.forEach((n, i) => { n.cineVis.v = vis[i] ? vis[i].v : 1; });
    vel += (Math.abs(p - pAnt) / Math.max(dt, .001) - vel) * Math.min(1, dt * 8); pAnt = p;
    amb.quadro(dt, cine.giro.v, p, congela, cine.nivel());
    if (cons) cons.aplicar(st.cons, st.consOp);
    if (pele) pele.aplicar(st.pele, dt * (1 - congela));
    if (pac) pac.quadro(dt, nos, congela, reduzido);
    if (ris) ris.quadro(dt, vel, st.risc);
    if (reg) reg.aplicar(nos, st.regua);
    if (passo) { passo.uniforms.uForca.value = st.dist; passo.enabled = st.dist > .002; passo.uniforms.uTempo.value += dt; passo.uniforms.uAspect.value = innerWidth / innerHeight; }
    if (leitura.style.visibility !== 'hidden') {
      const txt = `Câmera ${String(Math.round(((ANG(p) % 360) + 360) % 360)).padStart(3, '0')}° · FOV ${Math.round(FOV(p))}°`;
      if (txt !== ultimaLeitura) { leitura.textContent = txt; ultimaLeitura = txt; }
    }
  }
  if (cine && !reduzido) gsap.ticker.add((t, dtMs) => aplicar(Math.min(.05, dtMs / 1000)));

  // ---------------------------------------------------------------- o roteiro
  const hud = $$('#hud > div');
  function roteiro() {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.to(est, { p: 1, duration: 1, ease: 'none' }, 0);
    // 0 Abertura (0–10%): fundo, partículas, logo e núcleo já entraram ao carregar; aqui só saem
    tl.addLabel('abertura', 0)
      .fromTo('#dica', { autoAlpha: 1 }, { autoAlpha: 0, duration: .02, immediateRender: false }, .02)
      .fromTo('#c-logo', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -24, duration: .025, immediateRender: false }, .08);
    // 1 Núcleo (10–25%): colchetes, depois as 4 métricas uma a uma, depois a pele hexagonal
    tl.addLabel('nucleo', .10)
      .to('#cantos', { opacity: 1, duration: .015 }, .105);
    hud.forEach((el, i) => tl.fromTo(el, { autoAlpha: 0, y: 14, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: .02 }, .12 + i * .025));
    tl.to(st, { pele: 1, duration: .02 }, .215)
      .to(hud, { autoAlpha: 0, y: -10, duration: .02, ease: 'power2.in' }, .24)
      .to(st, { pele: 0, duration: .02, ease: 'power2.in' }, .245);
    // 2 Construção (25–40%): blocos montando-se um a um ao fundo; leitura da câmera
    tl.addLabel('construcao', .25)
      .to(st, { consOp: 1, duration: .01 }, .258)
      .to(st, { cons: 1, duration: .11, ease: 'none' }, .26)
      .fromTo('#leitura', { autoAlpha: 0 }, { autoAlpha: .35, duration: .015 }, .27)
      .to(st, { consOp: 0, duration: .03, ease: 'power2.in' }, .38)
      .to('#cantos', { opacity: 0, duration: .03 }, .38);
    // 3 Travessia (40–55%): mergulho com riscos de velocidade
    tl.addLabel('travessia', .40)
      .to(st, { risc: 1, duration: .015 }, .40)
      .to(st, { risc: 0, duration: .03, ease: 'power2.in' }, .525)
      .to('#leitura', { autoAlpha: 0, duration: .03 }, .52);
    // 4 Distorção (55–65%): tudo para no ar, distorção cobre a tela, depois a frase nítida
    tl.addLabel('distorcao', .55)
      .to(cine.congela, { v: 1, duration: .02 }, .55)
      .to(st, { dist: 1, duration: .035, ease: 'power1.inOut' }, .56)
      .to(st, { dist: 0, duration: .03, ease: 'power1.inOut' }, .60)
      .fromTo('#frase', { autoAlpha: 0, filter: 'blur(8px)' }, { autoAlpha: 1, filter: 'blur(0px)', duration: .025 }, .62)
      .to('#frase', { autoAlpha: 0, y: -16, duration: .02, ease: 'power2.in' }, .66)
      .to(cine.congela, { v: 0, duration: .03 }, .65);
    // 5 Projetos (65–90%): um de cada vez, cada um com o fluxo de pacotes começando na entrada; régua de graus no fim
    tl.addLabel('projetos', .65);
    vis.forEach((v, i) => tl.to(v, { v: 1, duration: .02, ease: 'back.out(1.5)' }, .665 + i * .035));
    tl.to(st, { regua: 1, duration: .02 }, .88);
    // 6 Fecho (90–100%): nada novo; a câmera estabiliza e o pin solta
    tl.addLabel('fecho', .90);
    return tl;
  }

  function abertura() {
    if (mapa) gsap.fromTo(mapa.el, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' });
    gsap.to(abre, { k: 1, duration: 2.6, ease: 'power3.out', delay: .05 });
    gsap.fromTo('#c-logo .marca', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .9, delay: .5, ease: 'power3.out' });
    gsap.to('.dica-in', { autoAlpha: 1, duration: .8, delay: 1.6 });
  }

  if (cine && !reduzido && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const tl = roteiro();
    ScrollTrigger.create({ trigger: '#nucleo', start: 'top top', end: () => '+=' + innerHeight * (innerWidth < 700 ? 5.5 : 7),
      pin: true, scrub: 1, animation: tl, invalidateOnRefresh: true });
    abertura();
  } else {
    // movimento reduzido (ou sem cena): visão geral parada, com logo, frase, métricas e os 7 projetos
    $$('.entra').forEach(e => { e.style.opacity = '1'; e.style.visibility = 'visible'; });
    if (cine) {
      st.regua = 1; aplicar(0);
      const desenhar = () => { aplicar(0); amb.estatico(); cine.quadroEstatico(); };
      setTimeout(desenhar, 80); setTimeout(desenhar, 600); addEventListener('resize', () => setTimeout(desenhar, 60));
    }
  }

  // ---------------------------------------------------------------- números reais (só se o navegador já tem o acesso da Central)
  async function dados() {
    let cfg = null; try { cfg = JSON.parse(localStorage.getItem('jarvis.pc.cfg')); } catch (e) { cfg = null; }
    if (!cfg || !cfg.k || !/^https:\/\//.test(String(cfg.u || ''))) return;
    let P;
    try { const r = await fetch(cfg.u + '?' + new URLSearchParams({ k: cfg.k, acao: 'pc' }), { cache: 'no-store', redirect: 'follow' }); P = JSON.parse(await r.text()); }
    catch (e) { return; }
    if (!P || P.ok === false || !P.estado || !Array.isArray(P.estado.projetos)) return;
    const ps = P.estado.projetos, plural = (n, s, pl) => n + ' ' + (n === 1 ? s : pl);
    const erros = ps.filter(p => p.status === 'erro').length, atencoes = ps.filter(p => p.status === 'atencao').length;
    const parado = P.estado.verificadoEm && Date.now() - new Date(P.estado.verificadoEm).getTime() > 30 * 60e3;
    const sit = parado ? ['erro', 'Jarvão parado'] : erros ? ['erro', plural(erros, 'projeto com problema', 'projetos com problema')] : atencoes ? ['atencao', plural(atencoes, 'projeto pedindo atenção', 'projetos pedindo atenção')] : ['ok', 'Tudo certo'];
    const ativos = ps.filter(p => p.status !== 'pausado'), noAr = ativos.filter(p => p.status === 'ok').length;
    const ped = (P.pedidos || []).filter(x => x.status === 'novo' || x.status === 'andamento').length;
    const novos = (P.estado.avisos || []).filter(a => a.id > (P.estado.avisosVistosAte || 0)).length;
    const por = (k, txt, cls) => { const b = $(`[data-m=${k}]`); b.textContent = txt; b.className = cls || ''; };
    por('sit', sit[1], sit[0]); por('noar', noAr + '/' + ativos.length); por('ped', String(ped)); por('avisos', String(novos));
    PS = ps;
    if (mapa) { delete mapa.el.dataset.semDados; mapa.atualizar(ps, { estado: sit[0], titulo: sit[1] }); if (reduzido) setTimeout(() => cine.quadroEstatico(), 60); }
  }
  dados();
})();
