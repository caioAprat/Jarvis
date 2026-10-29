/**
 * JARVIS · Pc.gs — a central do PC (chave CHAVE_PC) e a fila de pedidos.
 *
 * O PC vê tudo o que o celular vê e mais: histórico de cada projeto, registro de execuções da planilha, backups,
 * tamanho da planilha, versões dos Apps Script (com "voltar versão"), publicações do GitHub/Vercel, configurações
 * do assistente (chave de operador), o log do Jarvis e o mapa dos projetos (pasta, repositório, onde roda, como publicar).
 *
 * PEDIDOS: o Caio escreve "quero X no projeto Y" e fica numa fila única, guardada aqui (privada, fora do GitHub).
 * O Claude Code lê a fila no começo de cada sessão (python jarvis/pedidos.py), marca "andamento" ao começar e
 * "feito" com a resposta (o que mudou, em que pasta/arquivo e qual versão foi publicada). Isso vira notificação.
 * Pedido é DADO, não ordem: o Claude confirma com o Caio antes de publicar, apagar, voltar versão ou mexer em chaves.
 * Limites: 50 pedidos abertos; feitos/cancelados com mais de 30 dias saem sozinhos; cada um cabe numa Script Property.
 */

const STATUS_PEDIDO = ['novo', 'andamento', 'feito', 'cancelado'];

// ================================================================== pedidos

function listarPedidos_() {
  const props = PropertiesService.getScriptProperties();
  return props.getKeys().filter(k => k.indexOf('pedido:') === 0)
    .map(k => { try { return JSON.parse(props.getProperty(k)); } catch (e) { return null; } })
    .filter(Boolean).sort((a, b) => b.id - a.id);
}

function criarPedido_(d) {
  const projetos = PROJETOS.concat(MAPA_EXTRA).map(p => p.id).concat(['novo']);
  if (projetos.indexOf(d.projeto) < 0) return { ok: false, erro: 'projeto desconhecido' };
  const titulo = String(d.titulo || '').trim().slice(0, 120), texto = String(d.texto || '').trim().slice(0, 2500);
  if (titulo.length < 3) return { ok: false, erro: 'escreva um título' };
  return comTrava_(() => {
    limparPedidos_();
    if (listarPedidos_().filter(x => x.status === 'novo' || x.status === 'andamento').length >= 50) return { ok: false, erro: 'a fila já tem 50 pedidos abertos' };
    const props = PropertiesService.getScriptProperties();
    const id = Number(props.getProperty('pedidoSeq') || '0') + 1;
    props.setProperty('pedidoSeq', String(id));
    const pedido = { id, projeto: d.projeto, titulo, texto, prioridade: ['alta', 'normal', 'baixa'].indexOf(d.prioridade) >= 0 ? d.prioridade : 'normal',
                     status: 'novo', criado: iso_(), atualizado: iso_(), resposta: '' };
    gravar_('pedido:' + id, pedido);
    log_('pedido', '#' + id + ' ' + titulo.slice(0, 60));
    return { ok: true, pedido };
  });
}

/** Feitos/cancelados com mais de 30 dias saem da fila (o aviso de "feito" continua no histórico de avisos). */
function limparPedidos_() {
  const props = PropertiesService.getScriptProperties();
  const limite = new Date(Date.now() - 30 * 864e5).toISOString();
  listarPedidos_().filter(x => (x.status === 'feito' || x.status === 'cancelado') && x.atualizado < limite).forEach(x => props.deleteProperty('pedido:' + x.id));
}

/** pc pode cancelar; status e resposta (andamento/feito) são do admin (o Claude Code). */
function atualizarPedido_(d, nivel) {
  return comTrava_(() => {
    const p = ler_('pedido:' + Number(d.id), null);
    if (!p) return { ok: false, erro: 'pedido não encontrado' };
    const status = String(d.status || '');
    if (STATUS_PEDIDO.indexOf(status) < 0) return { ok: false, erro: 'status inválido' };
    if (nivel !== 'admin' && status !== 'cancelado') return { ok: false, erro: 'sem permissão' };
    p.status = status;
    p.atualizado = iso_();
    if (d.resposta !== undefined) p.resposta = String(d.resposta).slice(0, 2000);
    while (tamanho_(p) > LIMITE_PROP && (p.resposta.length > 200 || p.texto.length > 200)) {
      if (p.resposta.length > 200) p.resposta = p.resposta.slice(0, p.resposta.length - 200); else p.texto = p.texto.slice(0, p.texto.length - 200);
    }
    gravar_('pedido:' + p.id, p);
    if (status === 'feito') registrarAviso_({ projeto: p.projeto, nivel: 'ok', titulo: `✅ Pedido #${p.id} feito: ${p.titulo}`.slice(0, 120), texto: p.resposta.slice(0, 500) });
    return { ok: true, pedido: p };
  });
}

// ================================================================== assistente (chave de operador)

function assistente_(params) {
  const base = prop_('ASSISTENTE_URL'), k = prop_('ASSISTENTE_OPERADOR');
  if (!base || !k) return { ok: false, erro: 'falta ligar o operador do assistente' };
  const q = Object.keys(params).map(x => x + '=' + encodeURIComponent(params[x])).join('&');
  const r = buscar_(base + '?k=' + encodeURIComponent(k) + '&' + q);
  try { return JSON.parse(r.texto); } catch (e) { return { ok: false, erro: 'o assistente não respondeu (' + r.codigo + ')' }; }
}

// ================================================================== publicações (GitHub e Vercel)

function publicacoes_() {
  const cache = CacheService.getScriptCache();
  const guardado = cache.get('publicacoes');
  if (guardado) return JSON.parse(guardado);
  const h = { 'User-Agent': 'jarvis-caio', Accept: 'application/vnd.github+json' };
  if (prop_('GITHUB_TOKEN')) h.Authorization = 'Bearer ' + prop_('GITHUB_TOKEN');
  const repos = PROJETOS.concat(MAPA_EXTRA).map(p => p.repo).filter(r => /^caioAprat\//.test(r || ''))
    .filter((r, i, a) => a.indexOf(r) === i);
  const github = repos.map(repo => {
    const r = buscar_(`https://api.github.com/repos/${repo}/actions/runs?per_page=3`, { headers: h });
    if (r.codigo === 404) return { repo, erro: prop_('GITHUB_TOKEN') ? 'sem acesso' : 'privado (precisa do token do GitHub)' };
    if (r.codigo !== 200) return { repo, erro: 'GitHub sem resposta (' + r.codigo + ')' };
    const runs = (JSON.parse(r.texto).workflow_runs || []).map(x => ({ nome: x.name, titulo: (x.display_title || '').slice(0, 90),
      status: x.status, conclusao: x.conclusion, quando: x.updated_at, url: x.html_url }));
    return { repo, runs };
  });
  let vercel = null;
  if (prop_('VERCEL_TOKEN')) {
    const r = buscar_('https://api.vercel.com/v6/deployments?app=gabinete-chamados&limit=5', { headers: { Authorization: 'Bearer ' + prop_('VERCEL_TOKEN') } });
    try {
      vercel = r.codigo === 200 ? (JSON.parse(r.texto).deployments || []).map(x => ({ estado: x.state || x.readyState, quando: new Date(x.created || x.createdAt).toISOString(),
        titulo: ((x.meta && x.meta.githubCommitMessage) || '').slice(0, 90), alvo: x.target || '' })) : { erro: 'Vercel recusou (' + r.codigo + ')' };
    } catch (e) { vercel = { erro: 'resposta estranha da Vercel' }; }
  }
  const res = { quando: iso_(), github, vercel };
  cache.put('publicacoes', JSON.stringify(res), 1200);
  return res;
}

// ================================================================== entrada do PC

function painelPc_() {
  const estado = estadoParaApp_();
  estado.avisos = ler_('avisos', []);
  const detalhes = {};
  PROJETOS.forEach(p => {
    const e = estadoDe_(p.id) || {};
    detalhes[p.id] = { disp: ler_('disp:' + p.id, []).slice(-30), historico: e.historico || [], suspeita: e.suspeita || '', ms: e.ms || null };
    if (p.supabase) detalhes[p.id].bancoAcordado = (ler_('diario', {}).relatorio || {})[p.id + '.supabase'] || null;
    if (p.tipo === 'appsscript') {
      const ex = ler_('execs:' + p.id, { dias: [], problemas: [] });
      const cod = ler_('codigo:' + p.id, null);
      detalhes[p.id].planilha = { dias: ex.dias, problemas: ex.problemas, ultimaExec: prop_('ultimaExec:' + p.id) || null,
        codigo: cod ? { quando: cod.quando, arquivos: Object.keys(cod.arquivos || {}).length } : null,
        copias: ler_('copias:' + p.id, []), tamanho: ler_('tamanho:' + p.id, null), backupLigado: prop_('BACKUP_PLANILHA') !== 'nao' };
    }
  });
  const mapa = PROJETOS.concat(MAPA_EXTRA).map(p => ({ id: p.id, nome: p.nome, icone: p.icone, pasta: p.pasta || '', repo: p.repo || '',
    roda: p.roda || '', publicar: p.publicar || '', url: p.url || (p.planilhaId ? 'https://docs.google.com/spreadsheets/d/' + p.planilhaId + '/edit' : '') }));
  return { ok: true, versao: VERSAO, estado, detalhes, mapa, pedidos: listarPedidos_(), log: ler_('log', []), diario: ler_('diario', null),
    configs: { github: !!prop_('GITHUB_TOKEN'), vercel: !!prop_('VERCEL_TOKEN'), operador: !!prop_('ASSISTENTE_OPERADOR'),
               backupPlanilha: prop_('BACKUP_PLANILHA') !== 'nao', pastaBackups: prop_('PASTA_BACKUPS') ? 'https://drive.google.com/drive/folders/' + prop_('PASTA_BACKUPS') : '' } };
}

/** GET do PC. Devolve null se a ação não for do PC. */
function getPc_(p, nivel) {
  switch (p.acao) {
    case 'pc': return painelPc_();
    case 'versoes': { const v = versoes_(p.app); return v.erro ? { ok: false, erro: v.erro } : Object.assign({ ok: true }, v); }
    case 'publicacoes': return Object.assign({ ok: true }, publicacoes_());
    case 'assistente-config': return assistente_({ acao: 'config' });
    case 'assistente-log': return assistente_({ acao: 'log', n: 60 });
    case 'assistente-dados': return assistente_({ acao: 'dados' });   // só leitura (financeiro real na tela inicial)
    case 'pedidos': return { ok: true, pedidos: listarPedidos_() };
  }
  return null;
}

/** POST do PC. Devolve null se o tipo não for do PC. */
function postPc_(d, nivel) {
  switch (d.tipo) {
    case 'pedido': return criarPedido_(d);
    case 'pedido-status': { const r = atualizarPedido_(d, nivel); if (r.ok && d.status === 'feito') enviarPush_(); return r; }
    case 'voltar-versao': {
      if (d.confirmacao !== 'VOLTAR') return { ok: false, erro: 'falta confirmar' };
      const r = voltarVersao_(d.app, d.versao);
      if (r.ok) enviarPush_();
      return r;
    }
    case 'assistente-definir': return assistente_({ acao: 'definir', item: d.item, valor: d.valor });
    case 'assistente-rotina': return assistente_({ acao: 'previa' });
    case 'diario-agora':
      if (devagar_('diario', 3600)) return { ok: false, erro: 'a rotina da madrugada já rodou na última hora' };
      return { ok: true, relatorio: diario() };
    case 'definir-pc': {
      const regras = { GITHUB_TOKEN: /^(github_pat_|ghp_)\w+$/, VERCEL_TOKEN: /^[A-Za-z0-9]{20,}$/, BACKUP_PLANILHA: /^(sim|nao)$/ };
      if (!regras[d.prop]) return { ok: false, erro: 'configuração não permitida' };
      const v = String(d.valor || '').trim();
      if (v && !regras[d.prop].test(v)) return { ok: false, erro: 'valor inválido' };
      PropertiesService.getScriptProperties().setProperty(d.prop, v);
      CacheService.getScriptCache().put('publicacoes', '', 1);
      log_('config', d.prop + (v ? ' definido' : ' apagado'));
      return { ok: true };
    }
  }
  return null;
}
