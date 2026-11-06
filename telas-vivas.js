'use strict';
/**
 * JARVÃO · telas vivas dos módulos do protótipo — miniaturas desenhadas AO VIVO a partir dos dados reais.
 * (O Caio não tem gravações; nada de vídeo de banco nem dado falso.)
 *
 * Cada módulo tem um canvas (CanvasTexture). Redesenho a 6 quadros/s nas telas em destaque e 1/s nas demais no quadro.
 *   todos        cabeçalho com o nome, o LED de status e o relógio real; varredura e cursor de bloco (tela "viva")
 *   disp         30 dias no ar do projeto (detalhes[id].disp) na mesma régua das barras do pc.html
 *   planilha     resumo horário já publicado em detalhe + última rotina + disponibilidade
 *   gabinete     % no ar em 7 dias + histórico de disponibilidade
 *   assistente/painel   livre até + saldo projetado (até 30 pontos); fallback de disponibilidade
 *   rodapé       o detalhe atual do projeto (estado.projetos[].detalhe)
 * Antes do PIN: tela morta (só o vidro escuro), sem nome nem número. Reduced-motion mantém dados/relógio, sem varredura.
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
    let ligadas = null, tempoQuadro = 0;

    function barras(ctx, x, y, w, h, lista, corDe) {
      const n = lista.length; if (!n) return false;
      const g = 2, bw = (w - g * (n - 1)) / n;
      lista.forEach((it, i) => { const r = corDe(it); ctx.globalAlpha = r.a == null ? .85 : r.a; ctx.fillStyle = r.c; const bh = Math.max(2, h * (r.h == null ? 1 : r.h)); ctx.fillRect(x + i * (bw + g), y + h - bh, bw, bh); });
      ctx.globalAlpha = 1; return true;
    }
    function desenharPainel(m, p, det, fin, t, k) {
      const ctx = m.ctx;
      ctx.save(); ctx.scale(k, k);
      ctx.fillStyle = 'rgba(255,170,100,.035)';
      for (let x = 0; x < 256; x += 16) ctx.fillRect(x, 37, .4, 103);
      for (let y = 44; y < 140; y += 16) ctx.fillRect(0, y, 256, .4);
      const txt = (v, x, y, size = 8, cor = C.mu, w = 232) => {
        ctx.font = `500 ${size}px "JetBrains Mono", monospace`; ctx.fillStyle = cor;
        let s = String(v == null ? '—' : v);
        if (ctx.measureText(s).width > w) {
          while (s.length && ctx.measureText(s + '…').width > w) s = s.slice(0, -1);
          s += '…';
        }
        ctx.fillText(s, x, y);
      };
      const regra = y => { ctx.fillStyle = C.linha; ctx.fillRect(12, y, 232, .5); };
      const pct = v => v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
      const hist = (det.disp || []).slice(-30);
      const serieDisp = hist.map(d => d.t ? d.u / d.t * 100 : null);
      const historico = (y, h = 12) => {
        txt('30 DIAS NO AR', 12, y - 5, 7);
        if (!hist.length) { txt('SEM HISTÓRICO', 12, y + 9, 8, C.di); return; }
        const dias = Array(30 - hist.length).fill(null).concat(hist);
        barras(ctx, 12, y, 232, h, dias, d => !d || !d.t ? { c: C.vazio, a: 1 } : { c: d.u / d.t >= .995 ? C.ok : d.u / d.t >= .97 ? C.av : C.er });
      };
      const grafico = (x, y, w, h, valores, cor) => {
        for (let j = 0; j <= 2; j++) { ctx.fillStyle = C.linha; ctx.fillRect(x, y + j * h / 2, w, .5); }
        if (!valores.some(Number.isFinite)) { txt('SEM SÉRIE', x, y + h / 2 + 3, 8, C.di, w); return; }
        const vs = valores.filter(Number.isFinite), min = Math.min(...vs), max = Math.max(...vs);
        ctx.strokeStyle = cor; ctx.lineWidth = 1.2; ctx.beginPath(); let aberto = false;
        valores.forEach((v, i) => {
          if (!Number.isFinite(v)) { aberto = false; return; }
          const xx = x + i * w / Math.max(1, valores.length - 1), yy = y + h - 2 - (v - min) / (max - min || 1) * (h - 4);
          if (aberto) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
          aberto = true; ctx.fillStyle = cor; ctx.fillRect(xx - .8, yy - .8, 1.6, 1.6);
        }); ctx.stroke();
      };
      txt(MapaVivo.limpar(p.nome).toUpperCase(), 12, 17, 9, C.tx, 180);
      txt(new Date().toLocaleTimeString('pt-BR'), 195, 17, 7, C.di, 49);
      txt(NOME_EST[p.status] || p.status, 12, 30, 7, ST[p.status] || C.di);
      regra(36);
      const detalhe = MapaVivo.limpar(p.detalhe || 'Sem detalhe disponível');
      if (m.id === 'planilha') {
        // A janela horária vem do resumo público. Não usar totais diários como hora.
        const normal = detalhe.match(/(\d+) execuç(?:ão|ões) na última hora/);
        const falha = detalhe.match(/(\d+) de (\d+) execuções falharam/);
        const problemas = detalhe.match(/(\d+) com problema/);
        const total = normal ? normal[1] : falha ? falha[2] : /Sem uso na última hora/.test(detalhe) ? '0' : '—';
        txt(total, 12, 75, 37, C.tx, 90); txt('EXECUÇÕES', 112, 56); txt('ÚLTIMA HORA', 112, 70);
        regra(83);
        txt('COM PROBLEMA', 12, 96); txt(problemas ? problemas[1] : falha ? falha[1] : '—', 211, 96, 10, C.tx, 33);
        const ultima = det.planilha && det.planilha.ultimaExec;
        txt('ÚLTIMA ROTINA', 12, 110);
        txt(ultima ? new Date(ultima).toLocaleTimeString('pt-BR') : '—', 178, 110, 8, C.tx, 66);
        historico(128, 9);
      } else if (m.id === 'gabinete') {
        txt(pct(p.disp7), 12, 78, 35, C.tx); txt('NO AR / 7 DIAS', 14, 92);
        historico(113, 17);
      } else if (m.id === 'assistente' || m.id === 'painel') {
        fin = fin && fin.ok !== false ? fin : null;
        const livre = fin && fin.livre != null ? fin.livre : p.extra && p.extra.livre;
        const ate = fin && fin.diaMenor || p.extra && p.extra.ate;
        const moeda = livre == null ? '—' : Number(livre).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
        const saldo = !!(fin && Array.isArray(fin.serie) && fin.serie.length);
        const valores = saldo ? fin.serie.slice(-30).map(s => s.caixa == null ? null : Number(s.caixa)) : serieDisp;
        const y = m.id === 'assistente' ? 102 : 51, base = m.id === 'assistente' ? 62 : 112;
        grafico(12, y, 232, 28, valores, saldo ? C.pri : ST[p.status] || C.di);
        txt(moeda, 12, base, 29, C.tx);
        txt('LIVRE ATÉ ' + (ate ? new Date(String(ate).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'), 12, base + 14);
        txt(saldo ? 'SALDO PROJETADO' : 'DISPONIBILIDADE / 30 DIAS', 12, y - 5, 7);
      } else {
        const coluna = proto.modulos.indexOf(m) % 2 === 0;
        txt(pct(p.disp7), coluna ? 12 : 107, 76, 31, C.tx, 137);
        txt('NO AR / 7 DIAS', coluna ? 14 : 109, 90, 7);
        grafico(coluna ? 151 : 12, 51, 90, 42, serieDisp, ST[p.status] || C.di);
        historico(119, 12);
      }
      regra(140); txt(detalhe, 12, 152, 7);
      const assinatura = JSON.stringify([p, det, fin]);
      if (m.assinaturaTela !== assinatura) { m.assinaturaTela = assinatura; m.scanTela = t; }
      const grad = ctx.createLinearGradient(0, 0, 180, 160);
      grad.addColorStop(0, 'rgba(255,224,184,.055)'); grad.addColorStop(.5, 'rgba(255,224,184,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 160);
      const fase = m.ignicaoTela!=null && t-m.ignicaoTela<.25 ? (t-m.ignicaoTela)/.25 : (t-m.scanTela)/.65;
      if (!reduzido && fase >= 0 && fase < 1) { ctx.fillStyle = 'rgba(255,138,61,.12)'; ctx.fillRect(fase * 256, 0, 3, 160); }
      ctx.restore();
    }
    function desenhar(m, t) {
      const ctx = m.ctx, W = m.cv.width, H = m.cv.height, k = W / 256, D = api.dados() || {}, P = D.P, livre = api.liberado();
      // PIN/começo da ignição: o vidro já está preto e aquecido. Uma mudança
      // de relógio/autorização não exige redesenhar e reenviar sete telas iguais.
      const apagada = !livre || !P || (ligadas && !ligadas.get(m.id));
      if (apagada && m.telaApagada) return false;
      m.telaApagada = !!apagada;
      const chave = JSON.stringify([livre, ligadas && !!ligadas.get(m.id), P && P.estado.projetos.find(p => p.id === m.id), P && P.detalhes && P.detalhes[m.id], D.fin, Math.floor(Date.now() / 1000)]);
      if (m.chaveQuadro === chave && (reduzido || !(t - m.scanTela >= 0 && t - m.scanTela < .8))) return false;
      m.chaveQuadro = chave;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      if (ligadas && !ligadas.get(m.id)) return;

      if (!livre || !P) return;
      ctx.strokeStyle = C.linha; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, W - 1, H - 1);
      const varre = ((t * .35) % 1) * W;
      const p = P.estado.projetos.find(x => x.id === m.id); if (!p) return;
      const det = (P.detalhes || {})[m.id] || {};
      desenharPainel(m, p, det, D.fin, t, k);

    }

    // Ritmo: 6 quadros/s nas telas em destaque (as da cena atual), 1 por segundo nas outras que estão no quadro,
    // nenhum fora do quadro. Subir textura para a GPU é o que pesa — medido: 12/s em todas travava a placa integrada.
    const ultimo = new Map(), fila = new Set();
    function quadro(t, d) {
      tempoQuadro=t;
      proto.modulos.forEach(m => m.tela.material.color.setScalar((ligadas ? ligadas.get(m.id) || 0 : 1) * (.6 + .4 * m.enf.v)));
      // Um único canvas desenhado/enviado por quadro, inclusive na cascata da ignição.
      // Set preserva a ordem e agrupa pedidos repetidos sem acumular trabalho antigo.
      if (fila.size) {
        const m = fila.values().next().value; fila.delete(m);
        if (proto.modulos.includes(m) && desenhar(m, t) !== false) m.tex.needsUpdate = true;
      }
      if (!proto.visivel || proto.visivel() < .02) return;
      acum += d; if (acum < 1 / 6 && quadros > 0) return; acum = 0;

      const c = cam(); c.updateMatrixWorld(); mx.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); fr.setFromProjectionMatrix(mx);
      const leve = api.qualidade ? api.qualidade() >= 2 : false;
      proto.modulos.forEach(m => {
        if (quadros > 0 && !fr.containsPoint(m.g.position)) return;      // fora do quadro: não gasta nada
        const destaque = m.enf.v > .9 && m.enf.alvo === 1 && proto.modulos.some(x => x.enf.alvo !== 1);
        const intervalo = !reduzido && !leve && (destaque || t - m.scanTela < .65) ? 1 / 6 : 1;
        if (quadros > 0 && t - (ultimo.get(m.id) || -9) < intervalo - .01) return;
        ultimo.set(m.id, t); fila.add(m);
      });
      quadros++;
    }
    return { quadro, ligar(valores) {
      const anterior = ligadas;
      if (!anterior && !valores) return;
      ligadas = valores ? new Map(proto.modulos.map((m,i) => [m.id, valores[i] || 0])) : null;
      proto.modulos.forEach(m => {
        const v = ligadas ? ligadas.get(m.id) || 0 : 1;
        m.tela.material.color.setScalar(v * (.6 + .4 * m.enf.v));
        if(v>0 && anterior && !anterior.get(m.id))m.ignicaoTela=tempoQuadro;
        if (!anterior || !ligadas || !!anterior.get(m.id) !== !!v) {
          fila.add(m);
        }
      });
    }, desenharTodas: () => proto.modulos.forEach(m => fila.add(m)) };
  }

  window.TelasVivas = { criar };
})();
