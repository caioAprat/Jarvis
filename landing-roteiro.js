'use strict';
/**
 * JARVÃO · narrativa — UMA história só, no mesmo canvas e na mesma câmera do pc.html:
 *   abertura → (link) → PIN → portal → momentos dos dados reais → projetos (portal por planeta) → anatomia → fecho
 *
 * Mora em #narrativa (fora do #raiz, que o pc.html redesenha a cada atualização). Não valida nada: o
 * link e o PIN são conferidos pelo código de sempre (pc.html colarLink() e Cadeado.tentar()), recebidos em `api`.
 *
 * Trechos (cada um tem sua trilha de rolagem com ScrollTrigger pin/scrub e sua tabela de câmera):
 *   A (antes dos dados)        ola · constroi · travessia · acesso      — sem nenhum número na tela
 *   B (depois do portal)       situacao · noar · pedidos · avisos · projetos · casca · interior · malha · fecho
 *
 * Tabela cena → intervalo → elementos → plano (B, progresso do trecho B; A no fim deste comentário)
 *   situacao 0,00–0,12  núcleo de frente → "Tudo certo" se escreve → linha pequena      conjunto principal; sai p/ secundário
 *   noar     0,12–0,23  câmera gira 50° → "4/6" → linha + tela viva (30 dias no ar)      idem
 *   pedidos  0,23–0,34  câmera desce → número → linha (pedidos abertos de verdade)        idem
 *   avisos   0,34–0,45  câmera sobe → número → último aviso                              idem
 *   projetos 0,45–0,57  câmera recua, planetas com status real; clique = portal no planeta
 *   casca    0,57–0,68  núcleo explode; casca → clientes no ar (linha-guia)
 *   interior 0,68–0,79  interior → financeiro real (linha-guia + tela viva do caixa)
 *   malha    0,79–0,90  malha → execuções da Planilha (linha-guia + tela viva)
 *   fecho    0,90–1,00  núcleo reagrupa, plano geral = a câmera normal do pc.html; métricas compactas pousam na barra
 *   A: ola 0–0,23 (núcleo longe, fundo) · constroi 0,23–0,45 (câmera anda) · travessia 0,45–0,68 (zoom) · acesso 0,68–1 (núcleo
 *      centralizado → "Seu link"/"Seu PIN" se escreve; liberado: o portal se abre com a rolagem)
 *
 * Sem build: carregado por <script> em pc.html. Não guarda dados nem chaves.
 */
(function () {
  const reduzido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const PLANO = { 0: { op: 1, bl: 0, sc: 1 }, 1: { op: .55, bl: 1.5, sc: .92 }, 2: { op: .25, bl: 4, sc: .85 } };
  const ESTADO_PALAVRA = { ok: 'Tudo certo', atencao: 'Atenção', erro: 'Problema' };
  const COR_STATUS = { ok: 'var(--ok)', atencao: 'var(--av)', erro: 'var(--er)' };

  //            p      dist   alt   fov  giro   gelo distorção
  const CAM_A = [
    { p: 0,    d: 1.6,  a: .42, f: 40, o: -.3,  g: 0, x: 0 },
    { p: .23,  d: 1.45, a: .38, f: 40, o: -.05, g: 0, x: 0 },
    { p: .45,  d: 1.25, a: .3,  f: 40, o: .4,   g: 0, x: 0 },
    { p: .7,   d: .9,   a: .13, f: 36, o: .05,  g: 0, x: 0 },
    { p: 1,    d: .86,  a: .12, f: 36, o: 0,    g: 0, x: 0 },
  ];
  const CENAS_A = [['ola', 1], ['prototipo', 1.1], ['travessia', 1], ['acesso', 1.4]];
  const CENAS_B = [['situacao', 1], ['noar', 1], ['pedidos', 1], ['avisos', 1], ['clientes', 1.1], ['meus1', 1.1], ['meus2', 1.1], ['base', 1], ['fios', 1], ['planeta', 1.2], ['fecho', .9]];
  const ROTULO = { ola: 'Abertura', prototipo: 'Protótipo', travessia: 'Travessia', acesso: 'Acesso', situacao: 'Situação', noar: 'Projetos no ar', pedidos: 'Pedidos',
    avisos: 'Avisos', clientes: 'Clientes', meus1: 'Assistente e Painel', meus2: 'Meus projetos', base: 'Base e coroa', fios: 'Fios', planeta: 'Planeta', fecho: 'Visão geral' };
  const GRUPOS = { clientes: ['gabinete', 'planilha'], meus1: ['assistente', 'painel'], meus2: ['pedalada', 'atrasos', 'cacador'] };
  const ESTADO_TXT = { ok: 'no ar', atencao: 'atenção', erro: 'problema', pausado: 'pausado', config: 'configurar', aguardando: 'aguardando' };

  const CSS = `
  #narrativa{position:relative;z-index:2}
  .narr-trilho{position:relative}
  .narr-fix{position:sticky;top:0;height:100vh;min-height:520px;overflow:hidden;pointer-events:none}
  .narr-cena{position:absolute;inset:0;display:grid;grid-template-columns:1fr minmax(140px,24vw) 1fr;align-items:center;padding:0 clamp(64px,7vw,104px) 0 clamp(18px,4.5vw,64px);opacity:0;will-change:opacity,filter,transform}
  .narr-cena .mom-esq{grid-column:1;grid-row:1;justify-self:start;min-width:0}
  .narr-cena .mom-dir{grid-column:3;grid-row:1;justify-self:end;max-width:360px;min-width:0}
  .narr-cena.inv .mom-esq{grid-column:3;justify-self:end;text-align:right}
  .narr-cena.inv .mom-dir{grid-column:1;justify-self:start}
  .mom-g{font:700 clamp(56px,9vw,140px)/1 var(--disp);letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--tx);white-space:nowrap;
    filter:drop-shadow(0 0 8px #000) drop-shadow(0 2px 3px #000);-webkit-mask-image:linear-gradient(to right,#000 72%,rgba(0,0,0,.45));mask-image:linear-gradient(to right,#000 72%,rgba(0,0,0,.45))}
  .narr-cena.inv .mom-g{-webkit-mask-image:linear-gradient(to left,#000 72%,rgba(0,0,0,.45));mask-image:linear-gradient(to left,#000 72%,rgba(0,0,0,.45))}
  .mom-g.medio{font-size:clamp(44px,6.4vw,104px)}
  .esc-svg{display:block;overflow:visible;font:inherit;letter-spacing:inherit}
  .esc-svg text{font:inherit;letter-spacing:inherit}
  .mom-p{font:500 11.5px/1.75 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mu);text-shadow:0 0 8px #000,0 1px 2px #000;min-height:1.75em}
  .mom-tela{display:block;width:min(220px,100%);height:58px;margin-top:16px;opacity:0;transition:opacity .4s}
  .narr-cena.pronto .mom-tela{opacity:1}
  .acesso-campo{pointer-events:auto;position:relative;margin-top:22px;width:max-content;max-width:100%}
  .orbes{display:flex;gap:13px;padding:6px 2px}
  .orbes i{width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,170,100,.45);transition:background-color .15s,box-shadow .15s,transform .15s cubic-bezier(.2,0,0,1)}
  .orbes i.aceso{background:var(--pri);box-shadow:0 0 12px #ff8a3d;transform:scale(1.1)}
  .orbes i.erro{background:var(--er);box-shadow:0 0 10px #ff4d5e}
  .acesso-campo:focus-within .orbes{outline:2px solid var(--pri);outline-offset:8px;border-radius:999px}
  .pin-real{position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:16px;cursor:text;border:0}
  .link-real{display:block;width:min(360px,80vw);background:none;border:0;border-bottom:1px solid rgba(255,170,100,.4);color:var(--tx);font:500 13px var(--mono);padding:9px 0;outline:none}
  .link-real:focus{border-bottom-color:var(--pri)}
  .acesso-aviso{min-height:1.5em;margin-top:12px;font:500 11.5px var(--mono);letter-spacing:.08em;color:var(--di)}
  .acesso-aviso.erro{color:var(--er)}
  .treme .acesso-campo{animation:treme .4s}
  @keyframes treme{20%{transform:translateX(-6px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
  .ir-direto{position:fixed;z-index:36;top:18px;right:20px;pointer-events:auto;display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:8px 12px;border-radius:10px;
    font:500 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mu);box-shadow:inset 0 0 0 1px var(--linha);background:rgba(8,7,6,.55);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:color .15s}
  .ir-direto:hover{color:var(--tx)} .ir-direto kbd{font-size:10px}
  body.narr-b .ir-direto{display:none}
  .proj-sair{pointer-events:auto;margin-top:18px;font:500 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mu);box-shadow:inset 0 0 0 1px var(--linha);border-radius:10px;padding:9px 12px;min-height:36px}
  .proj-sair:hover{color:var(--tx)}
  body.narr-on .mv-fundo .mv-nucleo{opacity:0}
  body.narr-sem-rotulos .mv-fundo .mv-hud{opacity:0;transition:opacity .4s}
  body.narr-b #raiz .barra{position:fixed;top:0;left:0;right:0;margin:0;background:rgba(8,7,6,.55);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 1px 0 var(--linha);padding:10px 32px}
  body.narr-b #raiz .barra .marca{transform:scale(.7)}
  body.narr-b:not(.momentos-vistos) .hud-c{opacity:0;pointer-events:none}
  @media (max-width:700px){
    .narr-cena{grid-template-columns:1fr;grid-template-rows:auto 1fr auto;align-items:start;padding:84px 18px 116px}
    .narr-cena .mom-esq,.narr-cena.inv .mom-esq{grid-column:1;grid-row:1;justify-self:start;text-align:left}
    .narr-cena .mom-dir,.narr-cena.inv .mom-dir{grid-column:1;grid-row:3;justify-self:start;align-self:end}
    .mom-g,.narr-cena.inv .mom-g{-webkit-mask-image:none;mask-image:none}
    .ir-direto{top:12px;right:12px}
    body.narr-b #raiz .barra{padding:8px 18px}
  }
  .narr-estatico .narr-fix{position:relative;height:auto;min-height:0;overflow:visible}
  .narr-estatico .narr-cena{position:relative;inset:auto;opacity:1 !important;filter:none !important;transform:none !important;min-height:62vh}
  .narr-estatico .narr-trilho{height:auto !important}`;

  function janela(p, ini, fim, m) {
    m = m || .014;
    if (ini <= 0 && p <= fim - m) return 1;            // a primeira cena já nasce inteira no topo
    if (fim >= 1 && p >= ini + m) return 1;            // a última fica inteira até o fim
    if (p < ini - m || p > fim + m) return 0;
    if (p < ini + m) return Math.max(0, Math.min(1, (p - (ini - m)) / (2 * m)));
    if (p > fim - m) return Math.max(0, Math.min(1, ((fim + m) - p) / (2 * m)));
    return 1;
  }
  /** Regra dos três planos: muda UM conjunto por vez, em .5 s (opacidade, desfoque e escala). */
  function aplicarPlano(c, n) {
    if (c.plano === n) return;
    c.plano = n;
    const a = PLANO[n];
    if (reduzido || !window.gsap) { c.pl.op = 1; return; }
    gsap.to(c.el, { filter: 'blur(' + a.bl + 'px)', scale: a.sc, duration: .5, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(c.pl, { op: a.op, duration: .5, ease: 'power2.out', overwrite: 'auto', onUpdate: () => { c.el.style.opacity = String(c.jan * c.pl.op); } });
  }
  function intervalos(lista) {
    const soma = lista.reduce((s, x) => s + x[1], 0); let acc = 0;
    return lista.map(([id, w]) => { const ini = acc / soma; acc += w; return { id, ini, fim: acc / soma }; });
  }
  const real = (v) => v == null ? '—' : 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const dm = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? m[3] + '/' + m[2] : ''; };

  /**
   * op: { host, mapa, api: { acesso()->'link'|'pin'|'livre', aoLink(t)->bool, aoPin(v)->bool, dados()->{P, fin},
   *        ha(iso)->'há X min', abrirPainel(id), aoEntrar(), aoTerminar() } }
   */
  function montar(op) {
    if (document.getElementById('narr-css') == null) { const s = document.createElement('style'); s.id = 'narr-css'; s.textContent = CSS; document.head.appendChild(s); }
    const host = op.host, mapa = op.mapa, api = op.api;
    const cine = window.LandingCinema && mapa ? LandingCinema.criar(mapa, reduzido, CAM_A) : null;   // as chaves de verdade vêm de chavesA()/chavesB(), montadas sobre o protótipo
    const passe = cine ? cine.passe() : null;
    const leve = innerWidth < 700, dep = mapa ? mapa.depurar() : null, E = dep ? dep.escala : 2.6;
    let particulas = null;
    if (mapa && window.LandingParticulas) {
      particulas = LandingParticulas.montar(dep.scene, { leve });
      if (particulas && !reduzido && window.LandingPonteiro) LandingPonteiro.montar({ camera: dep.camera, particulas });
    }
    // v5: protótipo do Jarvão + fios + telas vivas + planeta tech + fundo que muda + chamadas + navegação numerada
    let trecho = 'A', ativa = true;
    const D0 = api.dados() || {}, P0 = D0.P;
    const listaInicial = api.acesso() === 'livre' && P0 ? P0.estado.projetos : Array.from({ length: P0 ? P0.estado.projetos.length : 7 }, (_, i) => ({ id: 'm' + i, status: 'aguardando' }));
    const proto = mapa && window.Prototipo ? Prototipo.montar(mapa, { projetos: listaInicial, leve }) : null;
    const fios = proto && window.Fios ? Fios.montar(mapa, proto, { leve }) : null;
    const telas = proto && window.TelasVivas ? TelasVivas.criar(proto, { dados: api.dados, liberado: () => trecho === 'B' && api.acesso() === 'livre', camera: () => dep.camera, qualidade: () => mapa.qualidade() }) : null;
    const planeta = mapa && window.Planeta ? Planeta.montar(mapa, { posicao: new THREE.Vector3(-17 * E, 2.2 * E, -15 * E), raio: 2.6 * E, leve }) : null;
    const fundo = window.Fundo ? Fundo.montar(mapa, { particulas, chao: -3.2 * E }) : null;
    const chamadas = mapa && window.Chamadas ? Chamadas.montar({ camera: () => dep.camera, nucleoRaio: () => 2.1 * E }) : null;
    const nav = window.NavCenas ? NavCenas.montar() : null;
    if (mapa) mapa.orbitas(false);
    // ao sair/recarregar: devolve a memória de vídeo na hora (GPU integrada não recupera a tempo e a próxima carga fica a 1 quadro/s)
    addEventListener('pagehide', () => { try { if (dep && dep.renderer) { dep.renderer.dispose(); dep.renderer.forceContextLoss(); } } catch (e) {} });
    const intro = { v: reduzido ? 1 : 0 };                       // os fios do chão acendem sozinhos na chegada
    if (!reduzido && window.gsap) gsap.to(intro, { v: 1, duration: 3.2, delay: .6, ease: 'power1.inOut', onUpdate: () => { if (trecho === 'A' && atual.p < .05) aplicar(atual.p); } });
    if (mapa && window.gsap) {
      let t = 0, tp = 0, u = performance.now();
      gsap.ticker.add(() => {
        if (!ativa) return;
        const n = performance.now(), d = Math.min(.05, (n - u) / 1000); u = n; t += reduzido ? 0 : d; tp += reduzido ? 0 : d * (fundo ? fundo.velocidade() : 1);
        if (particulas) particulas.quadro(tp, d);
        if (proto) proto.quadro(t, reduzido ? 0 : d);
        if (fios) fios.quadro(t, reduzido ? 0 : d);
        if (telas) telas.quadro(t, d);
        if (planeta) planeta.quadro(t, reduzido ? 0 : d);
        if (chamadas) chamadas.quadro();
      });
    }
    // clique/toque numa tela de módulo → portal → painel lateral do projeto
    addEventListener('pointerdown', (ev) => {
      if (!ativa || trecho !== 'B' || projeto || !proto || (ev.target.closest && ev.target.closest('button,a,input,.dock,.barra,.pal,.painel-sel'))) return;
      const id = proto.telaEm((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
      if (id && !/^m[0-9]+$/.test(id)) entrarProjeto(id);
    });
    const ir = document.createElement('button'); ir.type = 'button'; ir.className = 'ir-direto'; ir.innerHTML = 'Ir direto <kbd>D</kbd>'; ir.setAttribute('aria-label', 'Ir direto aos dados (tecla D)');
    ir.addEventListener('click', () => irDireto()); document.body.appendChild(ir);
    document.body.classList.add('narr-on', 'narr-sem-rotulos');

    let cenas = [], trigger = null, emPortal = false, projeto = null, voando = false, pulso = { v: 0 };
    const alvo = { p: 0 }, atual = { p: 0 }; let girando = false;
    let acesso = null, modoAcesso = '';
    let camAtual = { dist: 1, alt: .34, fov: 40, orbita: 0 };
    const porCamera = (c) => { camAtual = c; if (mapa) mapa.cinema(c); };
    const mob = leve ? 1.85 : 1;                                   // tela alta e estreita: a câmera recua
    const camZ = () => (mapa && mapa.depurar().camZ) || 28;
    const K = (p, dw, a, f, o, c) => ({ p, d: dw * mob / camZ(), a, f, o, g: 0, x: 0, cx: c ? c.x : 0, cy: c ? c.y : 0, cz: c ? c.z : 0 });
    const modMob = leve ? 1.55 : 1;                                // celular: nas cenas dos módulos, recua mais para as telas e as chamadas caberem
    function chavesA() {
      const ints = intervalos(CENAS_A), at = id => ints.find(c => c.id === id);
      const a = at('prototipo'), tr = at('travessia'), ac = at('acesso');
      return [
        K(0, 14 * E, .08, 40, -.5, { x: 0, y: -2.4 * E, z: 0 }),
        K(a.ini, 13 * E, .12, 40, -.35, { x: 0, y: -1.6 * E, z: 0 }),
        K((a.ini + a.fim) / 2, 14.5 * E, .2, 40, -.1, { x: 0, y: 1.2 * E, z: 0 }),
        K(tr.ini, 13 * E, .3, 40, .2, { x: 0, y: 1.4 * E, z: 0 }),
        K((tr.ini + tr.fim) / 2, 7.5 * E, .55, 38, .6, { x: 0, y: 2.4 * E, z: 0 }),
        K(ac.ini + .04, 8.6 * E, .12, 36, .1, null),
        K(1, 8.4 * E, .12, 36, 0, null),
      ];
    }
    function chavesB() {
      const ints = intervalos(CENAS_B), at = id => ints.find(c => c.id === id), meio = c => c.ini + (c.fim - c.ini) * .38;
      const foco = (ids) => proto ? proto.centroModulos(ids) : { x: 0, y: 0, z: 0, ang: 0 };
      const cl = foco(GRUPOS.clientes), m1 = foco(GRUPOS.meus1), m2 = foco(GRUPOS.meus2), pl = planeta ? planeta.posicao : { x: 0, y: 0, z: 0 };
      const L = [
        K(0, 7 * E, .1, 36, .05, null), K(.03, 7 * E, .1, 36, .05, null),
        K(meio(at('noar')), 7.4 * E, .22, 36, .9, null),
        K(meio(at('pedidos')), 7.2 * E, .02, 36, 1.75, null),
        K(meio(at('avisos')), 7.6 * E, .26, 36, 2.55, null),
        K(meio(at('clientes')), 5.6 * E * modMob, .08, 36, cl.ang, cl), K(at('clientes').fim - .01, 5.6 * E * modMob, .08, 36, cl.ang + .12, cl),
        K(meio(at('meus1')), 5.6 * E * modMob, .1, 36, m1.ang, m1), K(at('meus1').fim - .01, 5.6 * E * modMob, .1, 36, m1.ang + .12, m1),
        K(meio(at('meus2')), 6.6 * E * modMob, .12, 38, m2.ang, m2), K(at('meus2').fim - .01, 6.6 * E * modMob, .12, 38, m2.ang + .1, m2),
        K(meio(at('base')), 8 * E, .38, 38, m2.ang + .7, { x: 0, y: -1.4 * E, z: 0 }),
        K(meio(at('fios')), 21 * E, .3, 40, m2.ang + 1.3, { x: 0, y: .8 * E, z: 0 }),
        K(meio(at('planeta')), 9 * E, .1, 36, Math.atan2(pl.x, pl.z) + .5, pl), K(at('planeta').fim - .01, 9 * E, .14, 36, Math.atan2(pl.x, pl.z) + .7, pl),
      ];
      // fecho: exatamente a pose normal do pc.html (centro no núcleo, giro múltiplo de uma volta) — a entrega não tem salto
      const ult = L[L.length - 1].o, volta = Math.ceil(ult / 6.2832) * 6.2832;
      L.push({ p: .97, d: 1, a: .34, f: 40, o: volta, g: 0, x: 0, cx: 0, cy: 0, cz: 0 }, { p: 1, d: 1, a: .34, f: 40, o: volta, g: 0, x: 0, cx: 0, cy: 0, cz: 0 });
      return L.sort((x, y) => x.p - y.p);
    }
    addEventListener('resize', () => { if (cine && ativa) cine.trocar(trecho === 'A' ? chavesA() : chavesB()); });
    function definirNav() {
      if (!nav) return;
      nav.definir(cenas.map((c, i) => ({ n: (trecho === 'B' ? CENAS_A.length : 0) + i + 1, rotulo: ROTULO[c.id] || c.id, ir: () => irCena(c) })));
    }
    function irCena(c) {
      const tr = host.querySelector('.narr-trilho'); if (!tr) return;
      const total = tr.offsetHeight - innerHeight;
      window.scrollTo({ top: host.offsetTop + total * (c.ini + (c.fim - c.ini) * .45), behavior: reduzido ? 'auto' : 'smooth' });
    }
    // projetos reais nos módulos (depois do PIN); refaz os fios se a quantidade mudou
    function sincronizarProjetos() {
      const P = (api.dados() || {}).P;
      if (!proto || !P || api.acesso() !== 'livre') return;
      const antes = proto.modulos.map(m => m.id).join('|');
      proto.atualizarStatus(P.estado.projetos);
      if (fios) { if (antes !== proto.modulos.map(m => m.id).join('|')) fios.refazer(); fios.status(P.estado.projetos); }
      if (cine && trecho === 'B') cine.trocar(chavesB());
    }

    // ------------------------------------------------------------ montagem dos trechos
    function construir(lista) {
      const ints = intervalos(lista), soma = lista.reduce((s, x) => s + x[1], 0);
      host.innerHTML = `<div class="narr-trilho" style="height:${Math.round((soma + 1) * 100)}vh"><div class="narr-fix"></div></div>`;
      const fix = host.querySelector('.narr-fix');
      cenas = ints.map((c, i) => {
        const el = document.createElement('section'); el.className = 'narr-cena' + (i % 2 ? ' inv' : ''); el.dataset.cena = c.id;
        el.style.opacity = '0'; fix.appendChild(el);
        return Object.assign(c, { el, escrito: false, tela: null, partes: {}, plano: 0, pl: { op: 1 }, jan: 0 });
      });
      return soma;
    }
    function cena(id) { return cenas.find(c => c.id === id); }

    function montarA() {
      trecho = 'A'; document.body.classList.remove('narr-b', 'momentos-vistos');
      construir(CENAS_A);
      cenaTexto(cena('ola'), '', '');
      cena('prototipo').el.innerHTML = ''; cena('travessia').el.innerHTML = '';
      if (cine) cine.trocar(chavesA());
      definirNav();
      montarAcesso();
      ligarTrilho();
    }
    function montarAcesso() {
      const c = cena('acesso'); if (!c) return;
      modoAcesso = api.acesso();
      if (modoAcesso === 'livre') { c.el.innerHTML = ''; acesso = null; return; }
      acesso = LandingAcesso.montar(c.el, { modo: modoAcesso,
        aoLink: (t) => { const ok = api.aoLink(t); if (ok) setTimeout(() => { montarAcesso(); if (acesso) { acesso.escrever(); acesso.focar(); } }, 450); return ok; },
        aoPin: (v) => { const ok = api.aoPin(v); if (ok) setTimeout(abrirPortalDados, 380); return ok; } });
      c.escrito = false;
    }
    function cenaTexto(c, g, p) {
      c.el.innerHTML = `<div class="mom-lado mom-esq"><div class="mom-g" data-g></div></div><div class="mom-lado mom-dir"><p class="mom-p" data-p></p>${c.temTela ? '<canvas class="mom-tela" aria-hidden="true"></canvas>' : ''}</div>`;
      c.partes = { g: c.el.querySelector('[data-g]'), p: c.el.querySelector('[data-p]') };
      if (c.temTela) c.tela = LandingTelas.criar(c.el.querySelector('.mom-tela'), c.temTela);
    }

    function montarB() {
      trecho = 'B'; document.body.classList.add('narr-b'); document.body.classList.remove('momentos-vistos');
      construir(CENAS_B);
      const telasMom = { noar: 'disp' }, soChamadas = ['clientes', 'meus1', 'meus2', 'base', 'fios', 'planeta'];
      cenas.forEach(c => {
        c.temTela = telasMom[c.id] && window.LandingTelas ? telasMom[c.id] : '';
        if (soChamadas.includes(c.id)) { c.el.innerHTML = ''; c.partes = {}; }
        else if (c.id === 'fecho') { c.el.classList.add('inv'); c.el.style.alignItems = 'end'; c.el.style.paddingBottom = '120px'; c.el.innerHTML = '<div class="mom-lado mom-dir"><p class="mom-p" data-p></p></div>'; c.partes = { p: c.el.querySelector('[data-p]') }; }
        else cenaTexto(c);
      });
      sincronizarProjetos();
      if (cine) cine.trocar(chavesB());
      definirNav();
      ligarTrilho();
      preencherTelas();
    }

    // ------------------------------------------------------------ textos reais de cada momento (calculados na hora de escrever)
    function textos(id) {
      const D = api.dados() || {}, P = D.P, fin = D.fin;
      if (id === 'ola') return { g: 'Olá, Caio', p: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) };
      if (id === 'constroi') return { p: 'Núcleo de controle' };
      if (id === 'fecho') return { p: 'Buscar (Ctrl K), Conferir tudo e o dock ficam sempre à mão. Role para a visão geral.' };
      if (!P) return { g: '—', p: api.erro && api.erro() ? 'sem dados agora · sem conexão com o Jarvão' : 'carregando os dados reais…' };
      const m = LandingDados.metricas(P), ps = P.estado.projetos;
      switch (id) {
        case 'situacao': return { g: m.situacao[0] === 'erro' && /parado/i.test(m.situacao[1]) ? 'Parado' : ESTADO_PALAVRA[m.situacao[0]], cor: COR_STATUS[m.situacao[0]], p: m.situacao[1] + ' · conferido ' + api.ha(P.estado.verificadoEm) };
        case 'noar': return { g: m.projetosNoAr, p: 'projetos no ar · os pausados não contam' };
        case 'pedidos': { const ab = P.pedidos.filter(x => x.status === 'novo' || x.status === 'andamento'); return { g: String(ab.length), p: ab.length ? 'pedidos abertos · ' + ab.slice(0, 2).map(x => '#' + x.id + ' ' + x.titulo).join(' · ') : 'pedidos abertos · fila vazia' }; }
        case 'avisos': { const a = P.estado.avisos[0]; return { g: String(m.avisosNovos), p: 'avisos que você ainda não viu' + (a ? ' · último: ' + MapaVivo.limpar(a.titulo || '') : '') }; }
      }
      return { g: '', p: '' };
    }
    function preencherTelas() {
      const D = api.dados() || {}, P = D.P;
      cenas.forEach(c => {
        if (!c.tela) return;
        if (c.temTela === 'disp') c.tela.dados(P ? LandingTelas.dispTotal(P) : null);
      });
    }
    let primeira = true;
    async function escrever(c) {
      if (c.escrito) return; c.escrito = true;
      if (primeira && c.ini === 0 && !reduzido) { primeira = false; await new Promise(r => setTimeout(r, 900)); }   // o núcleo entra e se firma; só então a palavra se escreve
      if (c.id === 'acesso') { if (acesso) { await acesso.escrever(); if (!('ontouchstart' in window)) acesso.focar(); } return; }
      const T = textos(c.id); c.vers = JSON.stringify(T);
      if (c.partes.g && T.g !== undefined) { c.partes.g.classList.toggle('medio', !!T.medio); await Escrita.grande(c.partes.g, T.g, { cor: T.cor }); }
      if (c.partes.p) await Escrita.decodificar(c.partes.p, T.p);
      c.el.classList.add('pronto');
    }
    function zerar(c) {
      if (!c.escrito) return; c.escrito = false; c.el.classList.remove('pronto');
      if (c.id === 'acesso') { if (acesso) acesso.zerar(); return; }
      if (c.partes.g) Escrita.zerar(c.partes.g); if (c.partes.p) Escrita.zerar(c.partes.p);
    }

    // ------------------------------------------------------------ rolagem → cenas, planos, câmera
    function aplicar(p) {
      const ativas = [];
      for (const c of cenas) {
        const v = janela(p, c.ini, c.fim);
        c.jan = v; c.el.style.opacity = String(v * c.pl.op);
        const s = (p - c.ini) / (c.fim - c.ini);
        if (v > 0) ativas.push(c.id);
        if (v > .6 && s >= (c.ini === 0 ? 0 : .28) && s < .97) escrever(c);
        else if (v === 0 && (s < -.05 || s > 1.05)) zerar(c);
        // conjunto sai para o plano secundário antes da próxima cena entrar (um elemento por vez)
        aplicarPlano(c, s > .84 ? 1 : 0);
        if (c.tela) c.tela.ativar(v > .5 && c.escrito);
      }
      if (trecho === 'B' && p >= .999 && !projeto && !voando) { if (mapa) mapa.cinema(null); }   // fim: devolve a câmera normal do pc.html (mesma pose)
      else if (!voando && !projeto && cine) {
        const v = cine.interp(p);
        porCamera({ dist: v.d, alt: v.a, fov: v.f, orbita: v.o, cx: v.cx, cy: v.cy, cz: v.cz });
        if (mapa) mapa.congelar(v.g);
        if (passe) passe.uniforms.uForca.value = Math.max(v.x, pulso.v);
      }
      cenasV5(p, ativas);
      const comRotulos = trecho === 'B' && p >= .95;              // rótulos dos planetas só voltam na entrega para a visão geral
      document.body.classList.toggle('narr-sem-rotulos', !comRotulos);
      if (trecho === 'B' && p > .9) document.body.classList.add('momentos-vistos');
      // liberado: na cena de acesso, o portal se abre com a rolagem
      if (trecho === 'A') {
        const c = cena('acesso');
        if (modoAcesso === 'livre' && c) {
          const pp = Math.max(0, Math.min(1, (p - (c.ini + (c.fim - c.ini) * .25)) / ((c.fim - c.ini) * .7)));
          if (pp > 0 && !portalDados) criarPortalDados();
          if (portalDados) { portalDados.progresso(pp); if (pp >= .999 && !emPortal) trocarParaB(); if (pp <= 0 && portalDados) { portalDados.destruir(); portalDados = null; } }
        }
      }
    }
    const clamp = (x) => Math.max(0, Math.min(1, x));
    function emCena(id, p) { const c = cena(id); return c ? janela(p, c.ini, c.fim) : 0; }
    function sub(id, p) { const c = cena(id); return c ? (p - c.ini) / (c.fim - c.ini) : -1; }
    /** Protótipo, fios, planeta, fundo, ênfase, chamadas e navegação — tudo amarrado ao progresso (scrub). */
    function cenasV5(p, ativas) {
      const atualId = cenas.reduce((m, c) => (c.jan > (m ? m.jan : 0) ? c : m), null);
      if (nav && atualId) nav.ativa(cenas.indexOf(atualId));
      if (trecho === 'A') {
        if (fios) { fios.mostrar(true); fios.acenderChao(Math.max(intro.v * .55, clamp(sub('ola', p) * 1.15))); fios.acenderEsticados(0); fios.pacotes(0); }
        if (proto) proto.aparecer(clamp(sub('prototipo', p) * 1.6));
        if (mapa) mapa.deformar(.35 * emCena('prototipo', p) + .6 * emCena('travessia', p));
        if (planeta) planeta.mostrar(0);
        if (fundo) fundo.estado(p < cena('prototipo').ini ? clamp(sub('ola', p)) : 1 + clamp(sub('prototipo', p)));
        if (proto) proto.enfatizar([]);
        if (mapa) mapa.fluxoIntensidade(1);
        chamadasDaCena(atualId ? atualId.id : '', p);
        return;
      }
      const fimProto = 1 - clamp(sub('fecho', p) * 1.6);
      if (proto) proto.aparecer(fimProto);
      if (fios) { fios.mostrar(fimProto > .01); fios.acenderChao(fimProto); const fe = clamp(sub('fios', p) * 1.4); fios.acenderEsticados(Math.min(fe, fimProto)); fios.pacotes(fe > .1 ? fimProto : 0); }
      if (planeta) planeta.mostrar(emCena('planeta', p));
      if (mapa) { mapa.orbitas(p >= .93); mapa.deformar(.2 * emCena('situacao', p) + .3 * emCena('fios', p)); mapa.fluxoIntensidade(1 + .8 * emCena('fios', p)); }
      // fundo: protótipo (2) → fios (3) → planeta (4) → volta ao calmo (1) na entrega
      if (fundo) {
        let x = 2;
        if (p >= cena('fios').ini) x = 2 + clamp(sub('fios', p) * 2);
        if (p >= cena('planeta').ini) x = 3 + clamp(sub('planeta', p) * 2.5);
        if (p >= cena('fecho').ini) x = 4 - clamp(sub('fecho', p)) * 3;
        fundo.estado(x);
      }
      if (proto) proto.enfatizar(atualId && GRUPOS[atualId.id] ? GRUPOS[atualId.id] : []);
      chamadasDaCena(atualId ? atualId.id : '', p);
    }
    let cenaChamadas = '';
    function chamadasDaCena(id, p) {
      if (!chamadas) return;
      if (projeto) { if (cenaChamadas !== '#proj') { chamadas.limpar(); cenaChamadas = '#proj'; } return; }
      const lista = listaChamadas(id);
      chamadas.definir(lista);
      cenaChamadas = id;
    }
    /** O que cada parte do protótipo explica — sempre dado real (ou "sem dados", nunca inventado). */
    function listaChamadas(id) {
      if (!proto) return [];
      if (trecho === 'A') return id === 'prototipo' || id === 'travessia' ? [{ id: 'micro', ancora: () => proto.ancora('nucleo'), rotulo: 'Núcleo', grande: '', explica: '', marcador: 'circulo', micro: 'ROLE PARA ENTRAR' }] : [];
      const D = api.dados() || {}, P = D.P; if (!P) return [];
      const ps = P.estado.projetos, det = P.detalhes || {}, fin = D.fin && D.fin.ok !== false && D.fin.livre != null ? LandingDados.financeiro(D.fin) : null;
      const pct = (x) => x == null ? null : (Math.round(x * 10) / 10).toLocaleString('pt-BR') + '%';
      const modulo = (pid, i) => {
        const pr = ps.find(x => x.id === pid); if (!pr || !proto.modulos.find(m => m.id === pid)) return null;
        const d = det[pid] || {}; let g = pct(pr.disp7), ex = ESTADO_TXT[pr.status] || pr.status;
        if (pid === 'planilha' && d.planilha && d.planilha.dias && d.planilha.dias.length) { const u = d.planilha.dias[d.planilha.dias.length - 1]; g = (u.total || 0) + ' exec.'; ex += ' · ' + ((u.falhas || 0) + (u.travadas || 0)) + ' com problema em ' + dm(u.d); }
        else if (pid === 'gabinete' && d.ms && d.ms.site) { g = Math.round(d.ms.site) + ' ms'; ex += ' · site respondeu' + (d.ms.banco ? ' · banco ' + Math.round(d.ms.banco) + ' ms' : ''); }
        else if (pid === 'assistente' && fin) { g = real(fin.livre); ex += ' · livre até ' + dm(fin.diaMenor) + ' · conta ' + real(fin.conta); }
        if (pr.detalhe) ex += ' · ' + MapaVivo.limpar(pr.detalhe);
        if (pr.desde) ex += ' · desde ' + api.ha(pr.desde);
        return { id: pid, ancora: () => proto.ancoraFora(pid, dep.camera), rotulo: MapaVivo.limpar(pr.nome), grande: g || (ESTADO_TXT[pr.status] || '').toUpperCase(), explica: ex.slice(0, 150), marcador: 'circulo', micro: i === 0 ? 'CLIQUE NA TELA PARA ABRIR' : '' };
      };
      if (GRUPOS[id]) return GRUPOS[id].map(modulo).filter(Boolean);
      if (id === 'base') {
        const hoje = new Date().toISOString().slice(0, 10), log = P.log || [], deHoje = log.filter(l => String(l.quando || '').slice(0, 10) === hoje).length;
        const ab = P.pedidos.filter(x => x.status === 'novo' || x.status === 'andamento'), m = LandingDados.metricas(P), av = P.estado.avisos[0];
        return [
          { id: 'base', ancora: () => proto.ancora('base'), rotulo: 'Base · fluxo de arquivos', grande: String(deHoje), explica: 'eventos no registro hoje' + (log[0] ? ' · último: ' + log[0].texto : ''), marcador: 'cruz' },
          { id: 'coroa', ancora: () => proto.ancora('coroa'), rotulo: 'Coroa · avisos', grande: String(m.avisosNovos), explica: 'avisos novos' + (av ? ' · último: ' + MapaVivo.limpar(av.titulo || '') : ''), marcador: 'cruz' },
          { id: 'trilho', ancora: () => proto.ancora('trilho'), rotulo: 'Trilhos · pedidos', grande: String(ab.length), explica: ab.length ? ab.slice(0, 2).map(x => '#' + x.id + ' ' + x.titulo).join(' · ') : 'fila de pedidos vazia', marcador: 'circulo' },
        ];
      }
      if (id === 'planeta' && planeta) {
        const cl = ps.filter(x => x.cliente), ok = cl.filter(x => x.status === 'ok').length;
        return [{ id: 'planeta', ancora: () => planeta.ancora(), zona: () => ({ centro: planeta.posicao, raio: planeta.raio * 1.15 }), rotulo: 'Mundo dos clientes', grande: ok + '/' + cl.length, explica: 'clientes no ar · ' + cl.map(x => MapaVivo.limpar(x.nome)).join(' · '), marcador: 'circulo', acao: { texto: 'Saiba mais', f: () => api.irClientes() } }];
      }
      return [];
    }

    function laço() {
      const d = alvo.p - atual.p; atual.p += d * (reduzido ? 1 : .16);
      if (Math.abs(d) < .0004 || reduzido) { atual.p = alvo.p; girando = false; aplicar(atual.p); return; }
      aplicar(atual.p); requestAnimationFrame(laço);
    }
    const acordar = () => { if (!girando) { girando = true; requestAnimationFrame(laço); } };
    function ligarTrilho() {
      if (trigger) { trigger.kill(); trigger = null; }
      alvo.p = atual.p = 0;
      if (reduzido) {
        host.classList.add('narr-estatico');
        if (trecho === 'A' && modoAcesso === 'livre') { setTimeout(trocarParaB, 0); return; }
        cenas.forEach(c => { if (c.id === 'constroi' || c.id === 'travessia') { c.el.style.display = 'none'; return; } c.jan = 1; c.el.style.opacity = '1'; escrever(c); if (c.tela) c.tela.ativar(true); });
        if (mapa && cine) { const v = cine.interp(trecho === 'B' ? .4 : .99); porCamera({ dist: v.d, alt: v.a, fov: v.f, orbita: v.o, cx: v.cx, cy: v.cy, cz: v.cz }); }
        if (proto) proto.aparecer(1); if (fios) { fios.acenderChao(1); fios.acenderEsticados(trecho === 'B' ? 1 : 0); } if (fundo) fundo.estado(2);
        return;
      }
      if (window.ScrollTrigger && window.gsap) {
        gsap.registerPlugin(ScrollTrigger);
        trigger = ScrollTrigger.create({ id: 'narrativa', trigger: host.querySelector('.narr-trilho'), start: 'top top', end: 'bottom bottom', scrub: true,
          onUpdate: (self) => { alvo.p = self.progress; acordar(); }, onRefresh: (self) => { alvo.p = self.progress; acordar(); } });
      }
      aplicar(0);
    }

    // ------------------------------------------------------------ portal 1: núcleo → ambiente dos dados
    let portalDados = null;
    function poseB0() { const k = chavesB()[0]; return { dist: k.d, alt: k.a, orbita: k.o, fov: k.f, cx: 0, cy: 0, cz: 0 }; }
    function criarPortalDados() {
      if (!mapa || !mapa.portal) return null;
      portalDados = mapa.portal({ origem: () => new THREE.Vector3(0, 0, 0), pose: poseB0() });
      return portalDados;
    }
    function abrirPortalDados() {
      if (emPortal) return;
      if (reduzido || !mapa || !mapa.portal || !window.gsap) { trocarParaB(); return; }
      travarRolagem(true);
      const ca = cena('acesso'); if (ca) gsap.to(ca.el, { opacity: 0, duration: .45, ease: 'power2.out' });   // a pergunta sai; só o portal fica
      const pd = portalDados || criarPortalDados();
      if (!pd) { trocarParaB(); return; }
      const est = { p: 0 };
      gsap.to(est, { p: 1, duration: 1.6, ease: 'power2.inOut', onUpdate: () => pd.progresso(est.p), onComplete: () => { trocarParaB(); } });
    }
    function trocarParaB() {
      if (emPortal) return; emPortal = true;
      porCamera(poseB0());                                    // a câmera assume exatamente o que a janela mostrava
      if (portalDados) { portalDados.destruir(); portalDados = null; }
      if (passe && window.gsap && !reduzido) gsap.fromTo(pulso, { v: .9 }, { v: 0, duration: .7, ease: 'power3.out' });   // a distorção quente cobre a troca
      montarB();
      window.scrollTo(0, host.offsetTop);
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      travarRolagem(false);
      emPortal = false;
      api.aoEntrar();
    }
    function travarRolagem(v) { document.documentElement.style.overflow = v ? 'hidden' : ''; }

    // ------------------------------------------------------------ portal 2: planeta → projeto
    function entrarProjeto(id) {
      if (!ativa || trecho !== 'B' || projeto || voando || !mapa || !mapa.portal) return false;
      let pose = null, ponto = null;
      const mod = proto && proto.modulos.find(m => m.id === id);
      if (mod) { ponto = mod.g.getWorldPosition(new THREE.Vector3()); pose = { dist: 2.4 * E * mob / camZ(), alt: .04, orbita: Math.atan2(ponto.x, ponto.z), fov: 34, cx: ponto.x, cy: ponto.y, cz: ponto.z }; }
      else { const pp = mapa.poseProjeto(id); if (pp) { ponto = pp.ponto.clone(); pose = { dist: pp.dist, alt: pp.alt, orbita: pp.orbita, fov: pp.fov }; } }
      if (!pose) return false;
      projeto = id; travarRolagem(true); mapa.congelar(1);
      const destino = pose;
      const fim = () => {
        porCamera(destino);
        if (pd) pd.destruir();
        if (passe && window.gsap && !reduzido) gsap.fromTo(pulso, { v: .8 }, { v: 0, duration: .6, ease: 'power3.out', onUpdate: () => { passe.uniforms.uForca.value = pulso.v; } });
        mostrarProjeto(id);
      };
      const pd = reduzido ? null : mapa.portal({ origem: () => ponto, pose: destino, tamanho: 1.2 * E });
      if (!pd) { fim(); return true; }
      const est = { p: 0 };
      gsap.to(est, { p: 1, duration: 1.4, ease: 'power2.inOut', onUpdate: () => pd.progresso(est.p), onComplete: fim });
      return true;
    }
    let camadaProj = null;
    function mostrarProjeto(id) {
      const D = api.dados() || {}, P = D.P, p = P && P.estado.projetos.find(x => x.id === id); if (!p) return sairProjeto();
      camadaProj = document.createElement('section'); camadaProj.className = 'narr-cena'; camadaProj.style.opacity = '1';
      camadaProj.innerHTML = `<div class="mom-lado mom-esq"><div class="mom-g" data-g></div></div><div class="mom-lado mom-dir"><p class="mom-p" data-p></p><button type="button" class="proj-sair">Voltar ao núcleo · Esc</button></div>`;
      host.querySelector('.narr-fix').appendChild(camadaProj);
      cenas.forEach(c => { c.el.style.visibility = 'hidden'; });
      const fin = D.fin && D.fin.ok !== false && D.fin.livre != null ? LandingDados.financeiro(D.fin) : null;
      const linhas = [MapaVivo.limpar(p.nome), p.detalhe ? MapaVivo.limpar(p.detalhe) : '', p.disp7 != null ? Math.round(p.disp7 * 10) / 10 + '% no ar em 7 dias' : ''];
      if ((id === 'painel' || id === 'assistente') && fin) linhas.push('livre ' + real(fin.livre) + ' até ' + dm(fin.diaMenor) + ' · conta ' + real(fin.conta));
      const est = { ok: 'No ar', atencao: 'Atenção', erro: 'Problema', pausado: 'Pausado', config: 'Configurar', aguardando: 'Aguardando' };
      Escrita.grande(camadaProj.querySelector('[data-g]'), est[p.status] || p.status, { cor: COR_STATUS[p.status] }).then(() => Escrita.pequeno(camadaProj.querySelector('[data-p]'), linhas.filter(Boolean).join(' · ')));
      camadaProj.querySelector('.proj-sair').addEventListener('click', sairProjeto);
      api.abrirPainel(id);
      addEventListener('keydown', escProjeto); addEventListener('wheel', sairProjeto, { once: true, passive: true }); addEventListener('touchmove', sairProjeto, { once: true, passive: true });
    }
    function escProjeto(ev) { if (ev.key === 'Escape') sairProjeto(); }
    function sairProjeto() {
      if (!projeto) return;
      removeEventListener('keydown', escProjeto); removeEventListener('wheel', sairProjeto); removeEventListener('touchmove', sairProjeto);
      projeto = null; if (camadaProj) { camadaProj.remove(); camadaProj = null; }
      cenas.forEach(c => { c.el.style.visibility = ''; });
      api.abrirPainel('');
      if (!cine || !window.gsap) { voando = false; travarRolagem(false); if (mapa) mapa.congelar(0); aplicar(atual.p); return; }
      const v = cine.interp(atual.p), alvoC = { dist: v.d, alt: v.a, fov: v.f, orbita: v.o, cx: v.cx, cy: v.cy, cz: v.cz }, de = Object.assign({ cx: 0, cy: 0, cz: 0 }, camAtual);
      voando = true;
      const k = { t: 0 };
      gsap.to(k, { t: 1, duration: reduzido ? 0 : .9, ease: 'power2.inOut', onUpdate: () => porCamera({ dist: de.dist + (alvoC.dist - de.dist) * k.t, alt: de.alt + (alvoC.alt - de.alt) * k.t, fov: de.fov + (alvoC.fov - de.fov) * k.t, orbita: de.orbita + (alvoC.orbita - de.orbita) * k.t,
          cx: de.cx + (alvoC.cx - de.cx) * k.t, cy: de.cy + (alvoC.cy - de.cy) * k.t, cz: de.cz + (alvoC.cz - de.cz) * k.t }),
        onComplete: () => { voando = false; travarRolagem(false); if (mapa) mapa.congelar(0); aplicar(atual.p); } });
    }

    // ------------------------------------------------------------ fim da narrativa / ir direto
    function terminar() {
      if (!ativa) return; ativa = false;
      if (projeto) { projeto = null; if (camadaProj) camadaProj.remove(); }
      if (trigger) { trigger.kill(); trigger = null; }
      if (portalDados) { portalDados.destruir(); portalDados = null; }
      host.innerHTML = ''; host.style.display = 'none'; ir.remove();
      if (chamadas) { chamadas.limpar(); chamadas.esconder(true); } if (nav) nav.remover(); if (fundo) fundo.remover();
      if (proto) proto.aparecer(0); if (fios) fios.mostrar(false); if (planeta) planeta.mostrar(0);
      if (mapa) { mapa.orbitas(true); mapa.deformar(0); }
      document.body.classList.remove('narr-on', 'narr-b', 'narr-sem-rotulos'); document.body.classList.add('momentos-vistos');
      travarRolagem(false);
      if (mapa) { mapa.cinema(null); mapa.explodir(0); mapa.fluxoIntensidade(1); mapa.congelar(0); }
      if (passe) passe.uniforms.uForca.value = 0;
      cenas = [];
      window.scrollTo(0, 0);
      api.aoTerminar();
    }
    function irAoAcesso() {
      if (!ativa || trecho !== 'A') return;
      const c = cena('acesso'), tr = host.querySelector('.narr-trilho'); if (!c || !tr) return;
      const total = tr.offsetHeight - innerHeight, y = host.offsetTop + total * (c.ini + (c.fim - c.ini) * .45);
      window.scrollTo({ top: y, behavior: reduzido ? 'auto' : 'smooth' });
      setTimeout(() => { if (acesso) acesso.focar(); }, reduzido ? 0 : 900);
    }
    function irDireto() {
      if (!ativa) return;
      if (api.acesso() !== 'livre') { irAoAcesso(); return; }
      terminar();
    }
    addEventListener('keydown', (ev) => {
      if (!ativa || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
      if (ev.key === 'd' || ev.key === 'D') { ev.preventDefault(); irDireto(); }
    });

    // ------------------------------------------------------------ interface com o pc.html
    function atualizar() {
      if (!ativa) return;
      if (trecho === 'A') {
        const m = api.acesso();
        if (m !== modoAcesso) {
          if (m === 'livre' && modoAcesso !== 'livre' && acesso) return;   // acabou de acertar: o portal já está a caminho
          montarAcesso(); const c = cena('acesso'); if (c) { c.escrito = false; aplicar(atual.p); }
        }
        return;
      }
      preencherTelas(); sincronizarProjetos();
      cenas.forEach(c => { if (!c.escrito || c.id === 'fecho') return; const T = textos(c.id); if (JSON.stringify(T) !== c.vers) { c.escrito = false; escrever(c); } });
    }

    montarA();
    return {
      ativa: () => ativa, emB: () => ativa && trecho === 'B', acessoPendente: () => ativa && trecho === 'A' && api.acesso() !== 'livre',
      altura: () => (ativa ? host.offsetHeight : 0), atualizar, entrarProjeto, irDireto, irAoAcesso, terminar,
      progresso: () => atual.p, trecho: () => trecho, cenaEm: (p) => (cenas.find(c => p >= c.ini && p < c.fim) || {}).id,
    };
  }

  window.Narrativa = { montar };
})();
