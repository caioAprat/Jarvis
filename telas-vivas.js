'use strict';
/**
 * JARVÃO · telas vivas dos módulos do protótipo — miniaturas desenhadas AO VIVO a partir dos dados reais.
 * (O Caio não tem gravações; nada de vídeo de banco nem dado falso.)
 *
 * Cada módulo tem um canvas (CanvasTexture). Redesenho a 6 quadros/s nas telas em destaque e 1/s nas demais no quadro.
 *   todos        cabeçalho com o nome, o LED de status e o relógio real; varredura e cursor de bloco (tela "viva")
 *   disp         30 dias no ar do projeto (detalhes[id].disp) na mesma régua das barras do pc.html
 *   planilha     execuções por dia + falhas (detalhes.planilha.planilha.dias)
 *   gabinete     resposta do site e do banco em ms (detalhes.gabinete.ms)
 *   assistente/painel   caixa projetado em 36 dias (assistente-dados .serie), quando o assistente responde
 *   rodapé       o detalhe atual do projeto (estado.projetos[].detalhe)
 * Antes do PIN: só varredura de espera, sem nome nem número. prefers-reduced-motion: um quadro e para.
 */
(function () {
  const reduzido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const C = { bg: '#080706', linha: 'rgba(255,170,100,.1)', tx: '#f6eadb', mu: '#b09c86', di: '#9a8670', pri: '#ff9a4d', amb: '#ff8a3d', ok: '#7bf0b4', av: '#ffc247', er: '#ff4d5e', vazio: '#1b1510' };
  const ST = { ok: C.ok, atencao: C.av, erro: C.er };
  const NOME_EST = { ok: 'NO AR', atencao: 'ATENÇÃO', erro: 'PROBLEMA', pausado: 'PAUSADO', config: 'CONFIGURAR', aguardando: 'AGUARDANDO' };

  function criar(proto, api) {
    if (!proto) return null;
    const fr = new THREE.Frustum(), mx = new THREE.Matrix4(), cam = () => api.camera();
    let acum = 0, quadros = 0;

    function barras(ctx, x, y, w, h, lista, corDe) {
      const n = lista.length; if (!n) return false;
      const g = 2, bw = (w - g * (n - 1)) / n;
      lista.forEach((it, i) => { const r = corDe(it); ctx.globalAlpha = r.a == null ? .85 : r.a; ctx.fillStyle = r.c; const bh = Math.max(2, h * (r.h == null ? 1 : r.h)); ctx.fillRect(x + i * (bw + g), y + h - bh, bw, bh); });
      ctx.globalAlpha = 1; return true;
    }
    function desenhar(m, t) {
      const ctx = m.ctx, W = m.cv.width, H = m.cv.height, k = W / 256, D = api.dados() || {}, P = D.P, livre = api.liberado();
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.linha; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, W - 1, H - 1);
      const varre = ((t * .35) % 1) * W;
      if (!livre || !P) {                                           // espera: nada de dado antes do PIN
        ctx.fillStyle = C.di; ctx.font = `500 ${10 * k}px "JetBrains Mono", monospace`; ctx.fillText('AGUARDANDO', 12 * k, 22 * k);
        if (Math.floor(t * 2) % 2) ctx.fillRect(12 * k + ctx.measureText('AGUARDANDO').width + 4 * k, 13 * k, 6 * k, 11 * k);
        ctx.globalAlpha = .18; ctx.fillStyle = C.amb; ctx.fillRect(varre, 0, 2 * k, H); ctx.globalAlpha = 1;
        return;
      }
      const p = P.estado.projetos.find(x => x.id === m.id); if (!p) return;
      const det = (P.detalhes || {})[m.id] || {};
      // cabeçalho
      ctx.font = `600 ${10.5 * k}px "JetBrains Mono", monospace`; ctx.fillStyle = C.mu;
      ctx.fillText(MapaVivo.limpar(p.nome).toUpperCase().slice(0, 24), 12 * k, 20 * k);
      ctx.fillStyle = ST[p.status] || C.di; ctx.beginPath(); ctx.arc(W - 14 * k, 16 * k, 4 * k, 0, 6.2832); ctx.fill();
      const agora = new Date(); ctx.font = `500 ${9 * k}px "JetBrains Mono", monospace`; ctx.fillStyle = C.di;
      ctx.fillText(agora.toLocaleTimeString('pt-BR'), W - 70 * k, 20 * k);
      ctx.fillStyle = ST[p.status] || C.mu; ctx.fillText(NOME_EST[p.status] || String(p.status).toUpperCase(), 12 * k, 34 * k);
      // corpo
      const x0 = 12 * k, y0 = 44 * k, w0 = W - 24 * k, h0 = 64 * k;
      let ok = false;
      if (m.id === 'planilha' && det.planilha && det.planilha.dias && det.planilha.dias.length) {
        const dias = det.planilha.dias.slice(-14), mxv = Math.max(1, ...dias.map(d => d.total || 0));
        ok = barras(ctx, x0, y0, w0, h0, dias, d => ({ c: (d.falhas || 0) + (d.travadas || 0) ? C.er : C.amb, h: (d.total || 0) / mxv }));
        ctx.fillStyle = C.di; ctx.font = `500 ${8.5 * k}px "JetBrains Mono", monospace`; ctx.fillText('EXECUÇÕES / DIA', x0, y0 - 2 * k);
      } else if ((m.id === 'assistente' || m.id === 'painel') && D.fin && D.fin.serie && D.fin.serie.length) {
        const vs = D.fin.serie.map(s => Number(s.caixa) || 0), mn = Math.min(0, ...vs), mxv = Math.max(1, ...vs), n = vs.length;
        const X = i => x0 + i / (n - 1) * w0, Y = v => y0 + h0 - (v - mn) / (mxv - mn || 1) * h0;
        if (mn < 0) { ctx.strokeStyle = 'rgba(255,77,94,.4)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x0, Y(0)); ctx.lineTo(x0 + w0, Y(0)); ctx.stroke(); ctx.setLineDash([]); }
        ctx.strokeStyle = C.pri; ctx.lineWidth = 1.6 * k; ctx.beginPath(); vs.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))); ctx.stroke();
        const kk = Math.floor(((t * .2) % 1) * n); ctx.fillStyle = C.amb; ctx.beginPath(); ctx.arc(X(kk), Y(vs[kk]), 3 * k, 0, 6.2832); ctx.fill();
        ctx.fillStyle = C.di; ctx.font = `500 ${8.5 * k}px "JetBrains Mono", monospace`; ctx.fillText('CAIXA · 36 DIAS', x0, y0 - 2 * k);
        ok = true;
      } else if (m.id === 'gabinete' && det.ms && (det.ms.site || det.ms.banco)) {
        ctx.font = `600 ${26 * k}px "JetBrains Mono", monospace`; ctx.fillStyle = C.tx;
        ctx.fillText((det.ms.site ? Math.round(det.ms.site) : '—') + ' ms', x0, y0 + 26 * k);
        ctx.font = `500 ${9 * k}px "JetBrains Mono", monospace`; ctx.fillStyle = C.di;
        ctx.fillText('SITE · BANCO ' + (det.ms.banco ? Math.round(det.ms.banco) + ' MS' : '—'), x0, y0 + 42 * k);
        ok = true;
        if (det.disp && det.disp.length) barras(ctx, x0, y0 + 50 * k, w0, 12 * k, det.disp.slice(-30), d => !d.t ? { c: C.vazio, a: 1 } : { c: d.u / d.t >= .995 ? C.ok : d.u / d.t >= .97 ? C.av : C.er });
      }
      if (!ok) {
        if (det.disp && det.disp.length) {
          barras(ctx, x0, y0, w0, h0, det.disp.slice(-30), d => !d.t ? { c: C.vazio, a: 1 } : { c: d.u / d.t >= .995 ? C.ok : d.u / d.t >= .97 ? C.av : C.er });
          ctx.fillStyle = C.di; ctx.font = `500 ${8.5 * k}px "JetBrains Mono", monospace`; ctx.fillText('30 DIAS NO AR', x0, y0 - 2 * k);
        } else { ctx.fillStyle = C.di; ctx.font = `500 ${9 * k}px "JetBrains Mono", monospace`; ctx.fillText('SEM HISTÓRICO AINDA', x0, y0 + 20 * k); }
      }
      // rodapé: o detalhe real + cursor de bloco
      ctx.font = `500 ${9 * k}px "JetBrains Mono", monospace`; ctx.fillStyle = C.mu;
      const det1 = MapaVivo.limpar(p.detalhe || '').slice(0, 38); ctx.fillText(det1, 12 * k, H - 14 * k);
      if (!reduzido && Math.floor(t * 2) % 2) { ctx.fillStyle = C.pri; ctx.fillRect(12 * k + ctx.measureText(det1).width + 3 * k, H - 22 * k, 5 * k, 10 * k); }
      if (!reduzido) { ctx.globalAlpha = .14; ctx.fillStyle = C.amb; ctx.fillRect(varre, 0, 2 * k, H); ctx.globalAlpha = 1; }
    }

    // Ritmo: 6 quadros/s nas telas em destaque (as da cena atual), 1 por segundo nas outras que estão no quadro,
    // nenhum fora do quadro. Subir textura para a GPU é o que pesa — medido: 12/s em todas travava a placa integrada.
    const ultimo = new Map();
    function quadro(t, d) {
      if (!proto.visivel || proto.visivel() < .02) return;
      acum += d; if (acum < 1 / 6 && quadros > 0) return; acum = 0;
      if (reduzido && quadros > 2) return;
      const c = cam(); c.updateMatrixWorld(); mx.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); fr.setFromProjectionMatrix(mx);
      const leve = api.qualidade ? api.qualidade() >= 2 : false;
      proto.modulos.forEach(m => {
        if (quadros > 0 && !fr.containsPoint(m.g.position)) return;      // fora do quadro: não gasta nada
        const destaque = m.enf.v > .9 && m.enf.alvo === 1 && proto.modulos.some(x => x.enf.alvo !== 1);
        const intervalo = destaque && !leve ? 1 / 6 : 1;
        if (quadros > 0 && t - (ultimo.get(m.id) || -9) < intervalo - .01) return;
        ultimo.set(m.id, t); desenhar(m, t); m.tex.needsUpdate = true;
      });
      quadros++;
    }
    return { quadro, desenharTodas: (t) => proto.modulos.forEach(m => { desenhar(m, t || 0); m.tex.needsUpdate = true; }) };
  }

  window.TelasVivas = { criar };
})();
