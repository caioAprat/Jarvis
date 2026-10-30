'use strict';
/**
 * JARVÃO · telas vivas (técnica Nothing) — miniaturas pequenas, desenhadas AO VIVO a partir dos dados reais.
 * Nada de vídeo de banco: cada tela é um canvas 2D que redesenha um dado que o pc.html já tem.
 *
 *   'disp'  — 30 dias no ar somando todos os projetos (P.detalhes[id].disp = [{d,u,t}]); mesma régua de pc.html barras30()
 *   'execs' — execuções por dia da Planilha J Hissnauer (P.detalhes.planilha.planilha.dias = [{d,total,falhas,...}])
 *   'caixa' — projeção do caixa em 36 dias (assistente-dados .serie = [{dia,caixa}])
 *
 * criar(canvas, tipo) → { dados(x), ativar(bool) }. Só anima enquanto ativa (a cena dela está na tela); fora disso,
 * nenhum quadro. prefers-reduced-motion: desenha o primeiro quadro (completo) e para. Sem dados: escreve "sem dados".
 * Cores: só tokens do DESIGN.md (status só onde o dado é status: dia no ar / com queda).
 */
(function () {
  const reduzido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const COR = { ok: '#7bf0b4', av: '#ffc247', er: '#ff4d5e', pri: '#ff9a4d', amb: '#ff8a3d', di: '#9a8670', vazio: '#1b1510', linha: 'rgba(255,170,100,.1)' };

  function criar(canvas, tipo) {
    const ctx = canvas.getContext('2d'); if (!ctx) return null;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let W = 0, H = 0, dado = null, ativo = false, t0 = 0, raf = 0;

    function medir() {
      const r = canvas.getBoundingClientRect(); W = Math.max(60, r.width); H = Math.max(36, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function semDados() { ctx.fillStyle = COR.di; ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.fillText('SEM DADOS', 0, H / 2 + 3); }

    function desenhar(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = COR.linha; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, .5); ctx.lineTo(W, .5); ctx.stroke();
      if (!dado || !dado.length) { semDados(); return; }
      const ent = reduzido ? 1 : Math.min(1, t / 1.1);                  // entrada: barras/linha crescem em ~1,1 s
      const varre = reduzido ? -1 : ((t * .35) % 1.3) - .15;             // varredura contínua (tela "viva")
      if (tipo === 'caixa') {
        const vs = dado.map(x => Number(x.caixa) || 0), mn = Math.min(0, ...vs), mx = Math.max(1, ...vs), n = vs.length;
        const X = i => (i / (n - 1)) * (W - 4) + 2, Y = v => H - 6 - ((v - mn) / (mx - mn || 1)) * (H - 14);
        if (mn < 0) { ctx.strokeStyle = 'rgba(255,77,94,.35)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke(); ctx.setLineDash([]); }
        const ate = Math.max(1, Math.floor((n - 1) * ent));
        ctx.strokeStyle = COR.pri; ctx.lineWidth = 1.6; ctx.beginPath();
        for (let i = 0; i <= ate; i++) { i ? ctx.lineTo(X(i), Y(vs[i])) : ctx.moveTo(X(i), Y(vs[i])); } ctx.stroke();
        const k = Math.max(0, Math.min(ate, Math.round(((varre + .15) / 1.3) * (n - 1))));
        if (!reduzido && ent >= 1) { ctx.fillStyle = COR.amb; ctx.beginPath(); ctx.arc(X(k), Y(vs[k]), 2.6, 0, 6.2832); ctx.fill(); }
        return;
      }
      const n = dado.length, gap = 2, bw = (W - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const x = dado[i], px = i * (bw + gap), cresce = Math.max(0, Math.min(1, ent * n * 1.4 - i * .9));
        let cor, alt;
        if (tipo === 'execs') { const tot = x.total || 0, ruim = (x.falhas || 0) + (x.travadas || 0); const mxv = Math.max(1, ...dado.map(y => y.total || 0)); alt = (tot / mxv) * (H - 8); cor = ruim ? COR.er : COR.amb; }
        else { if (!x || !x.t) { cor = COR.vazio; alt = H - 8; } else { const p = x.u / x.t * 100; cor = p >= 99.5 ? COR.ok : p >= 97 ? COR.av : COR.er; alt = H - 8; } }
        const perto = Math.abs(i / n - varre) < .06;
        ctx.globalAlpha = (perto ? 1 : .72) * cresce;
        ctx.fillStyle = cor; ctx.fillRect(px, H - 2 - alt * cresce, bw, alt * cresce);
      }
      ctx.globalAlpha = 1;
    }
    function laço(agora) {
      if (!ativo) { raf = 0; return; }
      desenhar((agora - t0) / 1000);
      if (reduzido) { raf = 0; return; }
      raf = requestAnimationFrame(laço);
    }
    function ativar(v) {
      v = !!v; if (v === ativo) return; ativo = v;
      if (ativo) { medir(); t0 = performance.now(); if (!raf) raf = requestAnimationFrame(laço); }
    }
    function dados(x) { dado = x; if (!ativo) { medir(); desenhar(reduzido ? 9 : 9); } }
    addEventListener('resize', () => { medir(); if (!ativo) desenhar(9); });
    medir();
    return { dados, ativar };
  }

  /** Junta os 30 dias de todos os projetos (mesmo formato {d,u,t}). */
  function dispTotal(P) {
    const porDia = {};
    Object.values(P.detalhes || {}).forEach(det => (det.disp || []).forEach(x => { const a = porDia[x.d] || (porDia[x.d] = { d: x.d, u: 0, t: 0 }); a.u += x.u || 0; a.t += x.t || 0; }));
    return Object.values(porDia).sort((a, b) => a.d < b.d ? -1 : 1).slice(-30);
  }

  window.LandingTelas = { criar, dispTotal };
})();
