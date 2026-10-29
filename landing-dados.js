'use strict';
/**
 * JARVÃO · landing — dados reais (nenhum número inventado).
 *
 * A landing é mais um cliente da mesma API que pc.html já usa: mesma captura de chave
 * (#k=...&u=... uma vez, depois localStorage['jarvis.pc.cfg']), mesma chamada api('pc').
 * Como fica no mesmo site, o localStorage já é compartilhado com pc.html — se o Caio já
 * abriu o PC uma vez neste navegador, a landing já tem a chave.
 *
 * Financeiro real: apps-script/Pc.gs ganhou 'assistente-dados' (proxy só-leitura, mesma
 * chave de operador que 'assistente-config'/'assistente-log' já usam).
 *
 * Nada aqui guarda chave nova nem fala direto com o assistente: tudo passa pelo Jarvis.
 * Sem build: carregado por <script> em index.html.
 */
(function () {
  const LS = 'jarvis.pc.cfg';

  function cfgDeTexto(texto) {
    const i = String(texto || '').indexOf('#');
    const h = new URLSearchParams(String(texto).slice(i + 1).replace(/&amp;/g, '&'));
    return i >= 0 && h.get('k') && h.get('u') ? { k: h.get('k'), u: h.get('u') } : null;
  }

  function lerCfg() {
    let cfg = cfgDeTexto(location.href);
    if (cfg) { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} history.replaceState(null, '', location.pathname + location.search); }
    else { try { cfg = JSON.parse(localStorage.getItem(LS)); } catch (e) { cfg = null; } }
    return cfg;
  }

  async function api(cfg, acao, extra) {
    const q = new URLSearchParams(Object.assign({ k: cfg.k, acao }, extra || {}));
    const r = await fetch(cfg.u + '?' + q, { cache: 'no-store', redirect: 'follow' });
    const j = JSON.parse(await r.text());
    if (j && j.ok === false) throw new Error(j.erro || 'erro');
    return j;
  }

  /** Mesmo cálculo de telaGeral() em pc.html — não existe endpoint dedicado, é derivado do mesmo payload. */
  function metricas(P) {
    const ps = P.estado.projetos, erros = ps.filter(p => p.status === 'erro').length, atencoes = ps.filter(p => p.status === 'atencao').length;
    const parado = P.estado.verificadoEm && Date.now() - new Date(P.estado.verificadoEm).getTime() > 30 * 60e3;   // mesmo cálculo de pc.html:304
    const pedAbertos = P.pedidos.filter(x => x.status === 'novo' || x.status === 'andamento').length;
    const novos = P.estado.avisos.filter(a => a.id > (P.estado.avisosVistosAte || 0)).length;
    const sit = parado ? ['erro', 'Jarvão parado'] : erros ? ['erro', erros + (erros > 1 ? ' projetos com problema' : ' projeto com problema')]
      : atencoes ? ['atencao', atencoes + (atencoes > 1 ? ' projetos pedindo atenção' : ' projeto pedindo atenção')] : ['ok', 'Tudo certo'];
    const ativos = ps.filter(p => p.status !== 'pausado'), noAr = ativos.filter(p => p.status === 'ok').length;
    return { situacao: sit, projetosNoAr: noAr + '/' + ativos.length, pedidosAbertos: pedAbertos, avisosNovos: novos, erros, atencoes };
  }

  /** Linha honesta para a cena 0 (frase do dia), a partir dos avisos reais mais recentes. */
  function fraseDoDia(P, m) {
    if (m.erros) return (m.erros > 1 ? m.erros + ' projetos pedem atenção agora.' : 'Um projeto pede atenção agora.');
    if (m.atencoes) return (m.atencoes > 1 ? m.atencoes + ' projetos de olho.' : 'Um projeto de olho.');
    const a = (P.estado.avisos || [])[0];
    if (a) return String(a.titulo || a.texto || '').slice(0, 90);
    return 'Tudo certo por aqui.';
  }

  /** Resumo financeiro honesto a partir de dadosPainel_() (assistente). */
  function financeiro(d) {
    if (!d) return null;
    const a = (d.acoes || [])[0] || null;
    return { conta: d.conta, livre: d.livre, diaMenor: d.diaMenor, atrasadas: (d.atrasadas || []).length, acao: a };
  }

  /**
   * Carrega tudo. Cada fonte falha independente — nunca derruba as outras nem mostra número inventado.
   * Devolve: { temChave, pc, erroPc, fin, erroFin }
   */
  async function carregar() {
    const cfg = lerCfg();
    if (!cfg) return { temChave: false, pc: null, erroPc: 'sem-chave', fin: null, erroFin: 'sem-chave' };
    const out = { temChave: true, pc: null, erroPc: null, fin: null, erroFin: null };
    await Promise.all([
      api(cfg, 'pc').then(r => { out.pc = r; }).catch(e => { out.erroPc = e.message; }),
      api(cfg, 'assistente-dados').then(r => { out.fin = r; }).catch(e => { out.erroFin = e.message; }),
    ]);
    return out;
  }

  window.LandingDados = { carregar, metricas, fraseDoDia, financeiro };
})();
