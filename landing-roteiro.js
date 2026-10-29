'use strict';
/**
 * JARVÃO · landing — roteiro de 10 cenas (o coração do trabalho).
 *
 * Um ScrollTrigger (pin + scrub) sobre um hero de 900vh dá um progresso 0→1 que decide:
 *   - qual cena está visível (cada .cena some/aparece só na sua janela; nunca duas competindo)
 *   - a câmera do núcleo (landing-cinema.js), o congelamento/explosão/intensidade das veias
 *     (mapa-vivo.js, aditivo)
 *   - o plano (principal/secundário/fundo) de cada elemento marcado com [data-plano-ini]
 *   - as linhas-guia da anatomia (landing-anatomia.js) ligadas aos rótulos reais
 *
 * Tabela cena → intervalo → plano (ver cabeçalho de landing-cinema.js para a câmera):
 *   0 Abertura    0–8%   texto principal · núcleo fundo
 *   1 Resumo      8–18%  métricas principal · texto secundário
 *   2 Construção  18–28% rótulo secundário · núcleo ainda fundo (câmera parada no plano geral)
 *   3 Projetos    28–38% projetos principal · veias com mais pacotes (fluxoIntensidade)
 *   4 Travessia   38–48% câmera em zoom; projetos indo a secundário
 *   5 Virada      48–58% núcleo assume principal; distorção breve na troca
 *   6 Anatomia 1  58–66% casca em destaque → status real dos projetos
 *   7 Anatomia 2  66–74% interior em destaque → financeiro real
 *   8 Anatomia 3  74–88% malha em destaque → clientes/pedidos reais
 *   9 Fecho       88–100% núcleo reagrupa; link para a Central do PC
 *
 * Sem build: carregado por <script> em index.html. Não guarda dados nem chaves.
 */
(function () {
  const CENAS = [
    { id: 0, ini: 0, fim: .08 }, { id: 1, ini: .08, fim: .18 }, { id: 2, ini: .18, fim: .28 },
    { id: 3, ini: .28, fim: .38 }, { id: 4, ini: .38, fim: .48 }, { id: 5, ini: .48, fim: .58 },
    { id: 6, ini: .58, fim: .66 }, { id: 7, ini: .66, fim: .74 }, { id: 8, ini: .74, fim: .88 },
    { id: 9, ini: .88, fim: 1.001 },
  ];
  const PLANO = { 0: { op: 1, bl: 0, sc: 1 }, 1: { op: .55, bl: 1.5, sc: .92 }, 2: { op: .25, bl: 4, sc: .85 } };

  /** 0 fora da janela, sobe/desce .015 nas bordas (fade curto, pra cena nunca "competir" com a vizinha). */
  function janela(p, ini, fim) {
    const m = .015;
    if (p < ini - m || p > fim + m) return 0;
    if (p < ini + m) return Math.max(0, Math.min(1, (p - (ini - m)) / (2 * m)));
    if (p > fim - m) return Math.max(0, Math.min(1, ((fim + m) - p) / (2 * m)));
    return 1;
  }

  function aplicarPlano(el, n) {
    const alvo = PLANO[n] || PLANO[0], atual = el.dataset.planoAtual ? Number(el.dataset.planoAtual) : -1;
    if (atual === n) return;
    el.dataset.planoAtual = n;
    (window.gsap ? gsap.to(el, { opacity: alvo.op, filter: 'blur(' + alvo.bl + 'px)', scale: alvo.sc, duration: .5, ease: 'power2.out', overwrite: true })
      : Object.assign(el.style, { opacity: alvo.op, filter: 'blur(' + alvo.bl + 'px)', transform: 'scale(' + alvo.sc + ')' }));
  }

  function montar(op) {
    const hero = op.hero, mapa = op.mapa, reduzido = !!op.reduzido, dados = op.dados || {};
    const cinema = window.LandingCinema ? LandingCinema.criar(mapa, reduzido) : null;
    const cenaEls = {}; document.querySelectorAll('.cena[data-cena]').forEach(el => { cenaEls[el.dataset.cena] = el; });
    const planoEls = Array.from(document.querySelectorAll('[data-plano-ini]'));
    const anatomia = window.LandingAnatomia ? LandingAnatomia.montar(document.getElementById('anatomia')) : null;

    // partículas + ponteiro (técnicas A e D), presas à mesma cena/câmera do mapa-vivo
    let particulas = null, ponteiro = null;
    if (mapa) {
      const d = mapa.depurar();
      if (window.LandingParticulas && d.scene) particulas = LandingParticulas.montar(d.scene, { leve: innerWidth < 700 });
      if (particulas && window.LandingPonteiro && !reduzido) ponteiro = LandingPonteiro.montar({ camera: d.camera, particulas });
    }

    function estadoCena(p) {
      for (const c of CENAS) if (p >= c.ini - .02 && p <= c.fim + .02) return c.id; return 9;
    }

    function aplicar(p) {
      // visibilidade de cada cena (nunca duas competindo: a janela de fade é curta e as cenas não se sobrepõem)
      for (const c of CENAS) {
        const el = cenaEls[c.id]; if (!el) continue;
        const v = janela(p, c.ini, c.fim);
        el.style.opacity = v; el.style.pointerEvents = v > .5 ? '' : 'none';
      }
      // três planos: cada elemento declara em que cena muda de plano (data-plano-ini="cena:plano,cena:plano,...")
      for (const el of planoEls) {
        const regras = el.dataset.planoIni.split(',').map(r => r.split(':').map(Number));
        let alvo = regras[0][1];
        for (const [cena, plano] of regras) if (p >= CENAS[cena].ini) alvo = plano;
        aplicarPlano(el, alvo);
      }
      if (cinema) cinema.aplicar(p);
      if (mapa) {
        // cena 3-8: mais pacotes nas veias (fluxoIntensidade); cena 6-8: núcleo explodido (anatomia)
        const fluxo = 1 + Math.max(0, janela(p, .28, .88)) * 1.3;
        mapa.fluxoIntensidade(fluxo);
        const exp = Math.max(0, Math.min(1, (p - .58) / .06)) - Math.max(0, Math.min(1, (p - .86) / .04));
        mapa.explodir(Math.max(0, Math.min(1, exp)));
      }
      if (anatomia) desenharAnatomia(p);
      aplicarDados(p);
    }

    // ---- anatomia: casca (cena 6, status dos projetos), interior (cena 7, financeiro), malha (cena 8, clientes/pedidos)
    function desenharAnatomia(p) {
      if (!mapa || p < .56 || p > .9) { anatomia.limpar(); return; }
      const partes = mapa.partesExplodidas(), linhas = [];
      const emF = (ini, fim) => janela(p, ini, fim);
      const rot = (id) => document.getElementById(id);
      const ponto = (rotEl) => { if (!rotEl) return null; const r = rotEl.getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2 }; };
      const rCasca = ponto(rot('rotAnatCasca')), rInterior = ponto(rot('rotAnatInterior')), rMalha = ponto(rot('rotAnatMalha'));
      if (rCasca) linhas.push({ de: partes.casca, ate: rCasca, opacidade: emF(.58, .66) });
      if (rInterior) linhas.push({ de: partes.interior, ate: rInterior, opacidade: emF(.66, .74) });
      if (rMalha) linhas.push({ de: partes.malha, ate: rMalha, opacidade: emF(.74, .88) });
      anatomia.desenhar(linhas);
    }

    // ---- dados reais nos blocos (chamado a cada quadro, mas só escreve texto quando muda — barato)
    let ultimoEstado = '';
    function aplicarDados(p) {
      const assinatura = JSON.stringify([dados.temChave, !!dados.pc, !!dados.fin]);
      if (assinatura === ultimoEstado) return; ultimoEstado = assinatura;
      preencherDOM(dados);
    }

    // laço de suavização própria (scrub macio) + ticker das partículas
    const alvo = { p: 0 }, atual = { p: 0 }; let girando = false, tParticulas = 0, ultimoT = 0;
    function quadroTicker() {
      const agora = performance.now(); const d = Math.min(.05, (agora - ultimoT) / 1000) || 0; ultimoT = agora; tParticulas += d;
      if (particulas) particulas.quadro(tParticulas, d);
    }
    if (window.gsap && !reduzido) gsap.ticker.add(quadroTicker);   // reduzido: nada de partículas animadas

    function laço() {
      const d = alvo.p - atual.p; atual.p += d * (reduzido ? 1 : .16);
      if (Math.abs(d) < .0004 || reduzido) { atual.p = alvo.p; girando = false; aplicar(atual.p); return; }
      aplicar(atual.p); requestAnimationFrame(laço);
    }
    const acordar = () => { if (!girando) { girando = true; requestAnimationFrame(laço); } };

    if (reduzido) {
      // estado estático: uma tela só, legível, sem roteiro de scroll (cena 0+1 visíveis juntas, sem câmera animada)
      document.body.classList.add('estatico');
      Object.values(cenaEls).forEach(el => { el.style.opacity = ''; el.style.pointerEvents = ''; });
      planoEls.forEach(el => aplicarPlano(el, 0));
      if (cinema) cinema.aplicar(0);
      if (mapa) { mapa.fluxoIntensidade(1); mapa.explodir(0); }
      preencherDOM(dados);
      return { atualizarDados: (d) => { Object.assign(dados, d); preencherDOM(dados); } };
    }

    if (window.ScrollTrigger && window.gsap) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: (self) => { alvo.p = self.progress; acordar(); }, onRefresh: (self) => { alvo.p = self.progress; acordar(); } });
    } else {
      const medir = () => { const r = hero.getBoundingClientRect(), total = hero.offsetHeight - innerHeight; alvo.p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0; acordar(); };
      addEventListener('scroll', medir, { passive: true }); addEventListener('resize', medir); medir();
    }
    aplicar(0);
    return { atualizarDados: (d) => { Object.assign(dados, d); aplicarDados(alvo.p); }, progresso: () => atual.p, cenaAtual: () => estadoCena(atual.p) };
  }

  /** Escreve os dados reais (ou "sem dados" honesto) nos blocos HTML. Chamado toda vez que landing-dados termina de carregar. */
  function preencherDOM(dados) {
    const $ = (id) => document.getElementById(id);
    const semChave = !dados.temChave;
    const pc = dados.pc, erroPc = dados.erroPc, fin = dados.fin, erroFin = dados.erroFin;

    const saud = $('saudacao'); if (saud) saud.textContent = 'Olá, Caio';
    const dt = $('dataResumo'); if (dt) dt.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const frase = $('fraseDia');
    if (frase) frase.textContent = semChave ? 'Abra pelo link da Central do PC para ver os dados reais aqui.'
      : erroPc ? 'Sem conexão com o Jarvão agora.' : (pc && window.LandingDados ? LandingDados.fraseDoDia(pc, LandingDados.metricas(pc)) : '');

    const hud = $('hud');
    if (hud) {
      if (semChave) hud.innerHTML = '<div class="sem-dados">Sem chave neste navegador. <a href="pc.html">Abrir pelo link do PC</a> uma vez.</div>';
      else if (erroPc) hud.innerHTML = '<div class="sem-dados">Sem dados agora (sem conexão com o Jarvão).</div>';
      else if (pc && window.LandingDados) {
        const m = LandingDados.metricas(pc);
        hud.innerHTML = [
          ['Situação', '<b class="' + m.situacao[0] + '">' + m.situacao[1] + '</b>'],
          ['Projetos no ar', '<b>' + m.projetosNoAr + '</b>'],
          ['Pedidos abertos', '<b>' + m.pedidosAbertos + '</b>'],
          ['Avisos novos', '<b>' + m.avisosNovos + '</b>'],
        ].map(([t, v]) => '<div><small>' + t + '</small>' + v + '</div>').join('');
      }
    }

    const lista = $('lista');
    if (lista) {
      if (semChave || erroPc || !pc) lista.innerHTML = '<div class="sem-dados">' + (semChave ? 'Sem chave neste navegador.' : 'Sem dados agora.') + '</div>';
      else lista.innerHTML = pc.estado.projetos.map(p => '<span class="pill" data-st="' + p.status + '">' + (window.MapaVivo ? MapaVivo.icone(p.id) : '') + MapaVivo.limpar(p.nome) + '</span>').join('');
    }

    const vCasca = $('valAnatCasca');
    if (vCasca && pc && window.LandingDados) { const m = LandingDados.metricas(pc); vCasca.textContent = m.erros ? m.erros + ' com problema' : m.atencoes ? m.atencoes + ' pedindo atenção' : 'Todos no ar'; }
    else if (vCasca) vCasca.textContent = '—';

    const vFin = $('valFinanceiro');
    if (vFin) {
      if (semChave) vFin.innerHTML = 'Sem chave neste navegador.';
      else if (erroFin || !fin) vFin.innerHTML = 'Sem dados financeiros agora.';
      else {
        const f = LandingDados.financeiro(fin);
        vFin.innerHTML = 'Conta: <b>' + fmtReal(f.conta) + '</b> · Livre: <b>' + fmtReal(f.livre) + '</b>' + (f.atrasadas ? ' · ' + f.atrasadas + ' atrasada(s)' : '') + (f.acao ? '<br><span class="peq">' + esc(f.acao.titulo) + '</span>' : '');
      }
    }

    const vCli = $('valClientes');
    if (vCli) {
      if (semChave || erroPc || !pc) vCli.textContent = semChave ? 'Sem chave neste navegador.' : 'Sem dados agora.';
      else { const cli = pc.estado.projetos.filter(p => p.cliente); const m = LandingDados.metricas(pc); vCli.textContent = cli.map(c => MapaVivo.limpar(c.nome)).join(', ') + ' · ' + m.pedidosAbertos + ' pedido(s) aberto(s)'; }
    }
  }
  function fmtReal(v) { return v == null ? '—' : 'R$ ' + Math.round(v).toLocaleString('pt-BR'); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  window.LandingRoteiro = { montar, preencherDOM, CENAS };
})();
