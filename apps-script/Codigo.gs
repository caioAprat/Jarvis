/**
 * JARVIS — central de status de todos os projetos do Caio.
 *
 *  - A cada 10 minutos confere cada projeto (PROJETOS, abaixo) e guarda o estado.
 *  - Quando algo quebra ou volta, manda notificação no iPhone (Web Push, sem Telegram).
 *  - Os projetos podem mandar "batidas" (estou vivo) e o assistente manda avisos.
 *  - O app (GitHub Pages) lê tudo por acao=estado.
 *
 * CHAVES (Script Properties): CHAVE (admin), CHAVE_PC (Jarvis PC: tudo do celular + operar), CHAVE_LEITURA (app do iPhone),
 * CHAVE_AVISO (assistente: avisos e batidas), CHAVE_BATIDA (bots: só batidas).
 * Cada valor de Script Property tem limite de 9 KB: tudo o que cresce é cortado por tamanho.
 *
 * ARQUIVOS: Codigo.gs (núcleo: projetos, checagens, avisos, push, entrada) · Google.gs (planilha J Hissnauer pelo
 * registro de execuções, versões, backups) · Pc.gs (central do PC, pedidos, configurações do assistente).
 * Para acrescentar um projeto: um item novo em PROJETOS (com pasta/repo/roda/publicar para o mapa) + o teste dele em checar_().
 */

const FUSO = 'America/Sao_Paulo';
const VERSAO = 3;
const SUJEITO_VAPID = 'https://caioaprat.github.io/Jarvis/';
const LIMITE_PROP = 8000;                                      // bytes por Script Property (o Google aceita 9 KB)
const HOSTS_PUSH = /^https:\/\/(web\.push\.apple\.com|fcm\.googleapis\.com|[\w.-]+\.push\.services\.mozilla\.com|[\w.-]+\.notify\.windows\.com)\//;
const LINKS_OK = /^https:\/\/(caioaprat\.github\.io|github\.com\/caioAprat|script\.google\.com|docs\.google\.com)\//i;

// cliente: true = vendido (vem primeiro e todo problema é urgente). pasta/repo/roda/publicar = "mapa dos projetos" do PC.
const PROJETOS = [
  { id: 'gabinete', nome: 'Gabinete Chamados', icone: '🏛️', tipo: 'site', url: 'https://gabinete-chamados.vercel.app/entrar',
    marcador: 'Chamados do Gabinete', supabase: 'GABINETE', urgente: true, cliente: true,
    descricao: 'Sistema de chamados do cliente (site + banco de dados)',
    pasta: 'C:\\Gabinete_chamados', repo: 'caioAprat/Gabinete_chamados', roda: 'Vercel (site) + Supabase (banco)', publicar: 'git push (a Vercel publica sozinha)' },
  { id: 'planilha', nome: 'Planilha J Hissnauer', icone: '🚛', tipo: 'appsscript', urgente: true, cliente: true,
    scriptId: '1-4nu4HtDGObK0f94tFH2nxr_eMcQtmTrYuFuTFKEtyy6_DseVinp9Fyu', planilhaId: '1FMXSgfkqVZ4SGnlCxVR_mI87Ip7QfKBpNKZSxY9qcv0',
    comercial: { dias: [1, 2, 3, 4, 5, 6], de: 7, ate: 20 },
    descricao: 'Programação logística do cliente (edições, menu PDF, sincronização com veículos)',
    pasta: 'C:\\Plan_SHEETS', repo: '(sem repositório: o código vive na planilha)', roda: 'Apps Script da planilha (Google Sheets)', publicar: 'colar no editor (ver C:\\Plan_SHEETS\\CLAUDE.md)' },
  { id: 'assistente', nome: 'Assistente financeiro', icone: '💰', tipo: 'assistente',
    descricao: 'Lê o banco 3x ao dia, avisa contas e monta o plano das dívidas',
    pasta: 'C:\\Bot.ideias\\assistente', repo: 'caioAprat/assistente_dinheiro', roda: 'Apps Script da planilha Assistente do Caio', publicar: 'bash assistente/publicar.sh (o GitHub publica)' },
  { id: 'painel', nome: 'Painel Meu dinheiro', icone: '📱', tipo: 'site', url: 'https://caioaprat.github.io/Meu_dinheiro/',
    descricao: 'O app do dinheiro na tela inicial',
    pasta: 'C:\\Bot.ideias\\meu-dinheiro', repo: 'caioAprat/Meu_dinheiro', roda: 'GitHub Pages', publicar: 'git push' },
  { id: 'pedalada', nome: 'Pedalada do Delei', icone: '🚴', tipo: 'site', url: 'https://pedalada-do-delei.caiofelix0709.workers.dev/', marcador: 'Pedalada do Delei',
    descricao: 'Ajuste de saldo de estoque no ERP (app da Delei, v5.2 no ar)',
    pasta: 'C:\\Pedalada_do_Delei', repo: 'caioAprat/Pedalada_do_Delei', roda: 'Cloudflare (pedalada-do-delei.caiofelix0709.workers.dev)', publicar: 'git push (o Cloudflare publica; subir VERSAO no index.html e no sw.js, ver o CLAUDE.md de lá)' },
  { id: 'atrasos', nome: 'Bot de atrasos', icone: '📦', tipo: 'batida', pausaProp: 'ATRASOS_PAUSA_ATE',
    agenda: { 1: '16:30', 2: '16:30', 3: '16:30', 4: '16:30', 5: '15:30' }, tolerancia: 45,
    descricao: 'Relatório de atrasos por e-mail (notebook da empresa)',
    pasta: 'C:\\bot-atrasos', repo: '(sem repositório)', roda: 'Agendador do Windows no notebook da empresa', publicar: 'editar os arquivos na pasta' },
  { id: 'cacador', nome: 'Caçador de clientes', icone: '🎯', tipo: 'github', repo: 'caioAprat/Bot_cacaTrampo', workflow: 'cacador.yml',
    descricao: 'Vigia de freelas (99Freelas e Workana)',
    pasta: 'C:\\Bot.ideias\\cacador-clientes', roda: 'GitHub Actions', publicar: 'git push' },
];
// o próprio Jarvis também aparece no mapa (não se vigia: o assistente vigia ele)
const MAPA_EXTRA = [
  { id: 'jarvis', nome: 'Jarvis', icone: '🤖', pasta: 'C:\\Bot.ideias\\jarvis', repo: 'caioAprat/Jarvis', roda: 'Apps Script (servidor) + GitHub Pages (app)', publicar: 'git push (o GitHub publica)' },
  { id: 'print', nome: 'Print cropado', icone: '✂️', pasta: 'C:\\Bot.ideias\\print-cropado', repo: '(sem repositório)', roda: 'Windows (inicia com o PC)', publicar: 'editar os arquivos na pasta' },
];

// ================================================================== instalação

/** Rode pelo editor uma vez (autoriza e cria o gatilho). Pode rodar de novo sem problema. */
function instalar() {
  // o Google mostra uma caixinha por permissão: isto pede de novo as que ficaram desmarcadas
  try { ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL); } catch (e) { /* versões antigas do Apps Script */ }
  const props = PropertiesService.getScriptProperties();
  if (typeof SEGREDOS_LOCAIS !== 'undefined') {             // arquivo que só existe na primeira publicação feita do computador
    Object.keys(SEGREDOS_LOCAIS).forEach(k => { if (SEGREDOS_LOCAIS[k] && !props.getProperty(k)) props.setProperty(k, SEGREDOS_LOCAIS[k]); });
  }
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('verificar').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('diario').timeBased().atHour(3).nearMinute(15).everyDays(1).inTimezone(FUSO).create();
  UrlFetchApp.getRequest('https://example.com');
  CacheService.getScriptCache();
  try { DriveApp.getRootFolder(); } catch (e) { /* só para pedir a permissão do Drive */ }
  if (!props.getProperty('observar:planilha')) props.setProperty('observar:planilha', dia_(new Date(Date.now() + 7 * 864e5)));   // 1ª semana: calibrar sem alarme de "atenção"
  verificar();
  const planilha = PROJETOS.find(p => p.tipo === 'appsscript');
  const teste = execucoes_(planilha.scriptId, new Date(Date.now() - 3600000));
  const leitura = teste.erro ? 'FALHOU: ' + teste.erro : 'OK (' + teste.lista.length + ' execuções na última hora)';
  const r = 'Leitura da planilha: ' + leitura + ' | chaves: ' + ['CHAVE', 'CHAVE_PC', 'CHAVE_LEITURA', 'CHAVE_AVISO', 'CHAVE_BATIDA', 'VAPID_D', 'VAPID_PUB']
    .map(k => k + (props.getProperty(k) ? ' ok' : ' FALTA')).join(', ');
  log_('instalar', r);
  Logger.log(r);
  return r;
}

// ================================================================== utilidades

function agora_() { return new Date(); }
function iso_(d) { return (d || agora_()).toISOString(); }
function dia_(d) { return Utilities.formatDate(d || agora_(), FUSO, 'yyyy-MM-dd'); }
function hhmm_(d) { return Utilities.formatDate(d, FUSO, 'HH:mm'); }
function horasDesde_(isoTexto) { return isoTexto ? (Date.now() - new Date(isoTexto).getTime()) / 36e5 : null; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ler_(chave, padrao) {
  try { const v = PropertiesService.getScriptProperties().getProperty(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; }
}
function gravar_(chave, valor) { PropertiesService.getScriptProperties().setProperty(chave, JSON.stringify(valor)); }
function prop_(chave) { return PropertiesService.getScriptProperties().getProperty(chave) || ''; }
function tamanho_(o) { return Utilities.newBlob(JSON.stringify(o)).getBytes().length; }

/** Grava uma lista cortando os itens mais antigos (do fim) até caber no limite de uma Script Property. */
function gravarLista_(chave, lista) {
  const l = lista.slice();
  while (l.length > 1 && tamanho_(l) > LIMITE_PROP) l.pop();
  gravar_(chave, l);
  return l;
}

function log_(tipo, texto) {
  try {
    const l = ler_('log', []);
    l.unshift({ quando: iso_(), tipo, texto: String(texto).slice(0, 150) });
    gravarLista_('log', l.slice(0, 25));
  } catch (e) { /* o log nunca derruba nada */ }
}

/** 'admin' | 'pc' | 'leitura' | 'aviso' | 'batida' | '' */
function nivelChave_(k) {
  if (!k) return '';
  if (k === prop_('CHAVE')) return 'admin';
  if (k === prop_('CHAVE_PC')) return 'pc';
  if (k === prop_('CHAVE_LEITURA')) return 'leitura';
  if (k === prop_('CHAVE_AVISO')) return 'aviso';
  if (k === prop_('CHAVE_BATIDA')) return 'batida';
  return '';
}

let TRAVA_ATIVA_ = false;
function comTrava_(fn) {
  if (TRAVA_ATIVA_) return fn();                               // já dentro da trava (chamada encadeada)
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  TRAVA_ATIVA_ = true;
  try { return fn(); } finally { TRAVA_ATIVA_ = false; trava.releaseLock(); }
}

/** Limite simples de frequência por ação (evita gastar a cota do Google com cliques repetidos). */
function devagar_(acao, segundos) {
  const c = CacheService.getScriptCache();
  if (c.get('freq:' + acao)) return true;
  c.put('freq:' + acao, '1', segundos);
  return false;
}

function buscar_(url, opcoes) {
  const o = Object.assign({ muteHttpExceptions: true, followRedirects: true }, opcoes || {});
  try {
    const r = UrlFetchApp.fetch(url, o);
    return { codigo: r.getResponseCode(), texto: r.getContentText() };
  } catch (e) { return { codigo: 0, texto: '', erro: e.message }; }
}

function estadoDe_(id) { return ler_('estado:' + id, null); }

// ================================================================== checagens (sem trava: só leem a rede)

/**
 * Confere um projeto. Devolve { status, detalhe, ... }.
 * status: ok | atencao | erro | pausado | config | aguardando | semdados (semdados = não deu para saber; mantém o anterior)
 */
function checar_(p, anterior) {
  if (p.tipo === 'site') {
    const url = p.url || prop_(p.prop);
    if (!url) return { status: 'config', detalhe: 'Falta o endereço (me passe o link do sistema)' };
    const t0 = Date.now();
    const r = buscar_(url);
    const msSite = Date.now() - t0;
    if (!(r.codigo >= 200 && r.codigo < 400)) return { status: 'erro', detalhe: r.codigo ? 'Site fora do ar (código ' + r.codigo + ')' : 'Site sem resposta', link: url, ms: { site: msSite } };
    if (p.marcador && r.texto.indexOf(p.marcador) < 0) return { status: 'erro', detalhe: 'O site abre, mas não mostra o sistema (erro na publicação?)', link: url };
    if (p.supabase) {                                             // o banco grátis pausa sozinho sem uso: o site abre, mas nada funciona
      const base = prop_(p.supabase + '_SUPABASE_URL'), chave = prop_(p.supabase + '_SUPABASE_KEY');
      if (base && chave) {
        const t1 = Date.now();
        const b = buscar_(base + '/auth/v1/health', { headers: { apikey: chave } });
        const ms = { site: msSite, banco: Date.now() - t1 };
        if (b.codigo !== 200) return { status: 'erro', detalhe: b.codigo ? 'Banco de dados (Supabase) com problema ou pausado (código ' + b.codigo + ')' : 'Banco de dados (Supabase) sem resposta', link: url, ms };
        return { status: 'ok', detalhe: 'Site e banco de dados no ar', link: url, ms };
      }
    }
    return { status: 'ok', detalhe: 'No ar', link: url, ms: { site: msSite } };
  }

  if (p.tipo === 'assistente') {
    const base = prop_('ASSISTENTE_URL');
    if (!base) return { status: 'config', detalhe: 'Falta ligar ao assistente' };
    const link = prop_('ASSISTENTE_PAINEL');
    const r = buscar_(base + '?acao=saude');
    let s = null;
    try { s = JSON.parse(r.texto); } catch (e) { s = null; }
    if (!s || !s.ok) return { status: 'erro', detalhe: 'O assistente não respondeu', link, extra: anterior && anterior.extra };
    const res = { status: 'ok', detalhe: 'Rotina há ' + Math.round(s.horasRotina || 0) + 'h · banco lido há ' + Math.round(s.horasLeitura || 0) + 'h', link };
    if (s.horasRotina === null || s.horasRotina > 14) { res.status = 'atencao'; res.detalhe = 'A rotina não roda há ' + Math.round(s.horasRotina || 0) + 'h'; }
    else if (s.horasLeitura !== null && s.horasLeitura > 30) { res.status = 'atencao'; res.detalhe = 'O banco não é lido há ' + Math.round(s.horasLeitura) + 'h'; }
    res.extra = anterior && anterior.extra || null;                               // se o resumo falhar, fica o último
    const leitura = prop_('ASSISTENTE_LEITURA');
    if (leitura) {
      const w = buscar_(base + '?k=' + encodeURIComponent(leitura) + '&acao=widget');
      try { const d = JSON.parse(w.texto); if (d && d.versao) res.extra = { livre: d.livre, ate: d.ate, ok: d.ok, conta: d.conta, proxima: d.proxima, acao: d.acao }; } catch (e) { /* fica o anterior */ }
    }
    return res;
  }

  if (p.tipo === 'batida') {
    const b = ler_('batida:' + p.id, null);
    const agora = agora_();
    const hoje = dia_(agora);
    const pausa = p.pausaProp ? prop_(p.pausaProp) : '';
    if (pausa && hoje <= pausa) return { status: 'pausado', detalhe: 'Pausado até ' + pausa.slice(8, 10) + '/' + pausa.slice(5, 7) + ' (feriado ou férias)' };
    const semana = Number(Utilities.formatDate(agora, FUSO, 'u'));          // 1 = segunda ... 7 = domingo
    const horario = p.agenda[semana];
    const quando = b ? 'último: ' + Utilities.formatDate(new Date(b.quando), FUSO, "dd/MM 'às' HH:mm") : 'ainda não rodou';
    const rodouHoje = b && dia_(new Date(b.quando)) === hoje;
    if (rodouHoje) return b.ok === false ? { status: 'erro', detalhe: 'Falhou hoje: ' + (b.detalhe || 'sem detalhe') }
                                         : { status: 'ok', detalhe: 'Rodou hoje às ' + hhmm_(new Date(b.quando)) + (b.detalhe ? ' · ' + b.detalhe : '') };
    if (horario) {
      const [h, m] = horario.split(':').map(Number);
      const minAgora = Number(Utilities.formatDate(agora, FUSO, 'H')) * 60 + Number(Utilities.formatDate(agora, FUSO, 'm'));
      if (minAgora > h * 60 + m + p.tolerancia) return { status: 'atencao', detalhe: 'Não rodou hoje (esperado ' + horario + '). O notebook estava ligado?' };
      return { status: 'aguardando', detalhe: 'Roda hoje às ' + horario + ' · ' + quando };
    }
    return { status: 'aguardando', detalhe: 'Não roda hoje · ' + quando };
  }

  if (p.tipo === 'github') {
    const ultimo = anterior && anterior.githubEm ? horasDesde_(anterior.githubEm) : 99;
    if (ultimo < 1 && anterior) return { status: 'semdados', reaproveitado: true };   // GitHub limita consultas: 1x por hora
    const h = { 'User-Agent': 'jarvis-caio', Accept: 'application/vnd.github+json' };
    const tok = prop_('GITHUB_TOKEN');
    if (tok) h.Authorization = 'Bearer ' + tok;
    const link = `https://github.com/${p.repo}/actions`;
    const wf = buscar_(`https://api.github.com/repos/${p.repo}/actions/workflows/${p.workflow}`, { headers: h });
    if (wf.codigo === 0 || wf.codigo === 403 || wf.codigo === 429 || wf.codigo >= 500) return { status: 'semdados', detalhe: 'GitHub sem resposta', githubEm: iso_() };
    let info = null;
    try { info = JSON.parse(wf.texto); } catch (e) { info = null; }
    if (!info || !info.state) return { status: 'erro', detalhe: 'Não achei o workflow no GitHub', link, githubEm: iso_() };
    if (/^disabled/.test(info.state)) return { status: 'pausado', detalhe: 'Pausado por você', link, githubEm: iso_() };
    const runs = buscar_(`https://api.github.com/repos/${p.repo}/actions/workflows/${p.workflow}/runs?per_page=1`, { headers: h });
    if (runs.codigo !== 200) return { status: 'semdados', detalhe: 'GitHub sem resposta', githubEm: iso_() };
    let run = null;
    try { run = JSON.parse(runs.texto).workflow_runs[0]; } catch (e) { run = null; }
    if (!run) return { status: 'atencao', detalhe: 'Nenhuma execução encontrada', link, githubEm: iso_() };
    if (run.status !== 'completed') return { status: 'ok', detalhe: 'Rodando agora', link, githubEm: iso_() };
    const horas = horasDesde_(run.updated_at);
    return horas > 7 ? { status: 'erro', detalhe: 'Parado há ' + Math.round(horas) + 'h', link, githubEm: iso_() }
                     : { status: 'ok', detalhe: 'Última volta há ' + Math.round(horas * 60) + ' min', link, githubEm: iso_() };
  }
  if (p.tipo === 'appsscript') return checarPlanilha_(p, anterior);
  return { status: 'config', detalhe: 'Tipo desconhecido' };
}

const GRAVIDADE = { ok: 0, pausado: 0, aguardando: 0, config: 1, atencao: 2, erro: 3 };

/** Junta o resultado novo com o anterior. Devolve { novo, aviso }. Função pura (testada). */
function juntar_(p, ant, r) {
  if (r.status === 'semdados') {                                      // sem dados: mantém o que havia...
    const base = ant || { status: 'config', detalhe: r.detalhe || 'Sem dados ainda', desde: iso_(), historico: [] };
    const desde = base.semDadosDesde || iso_();
    if (!(p.cliente && horasDesde_(desde) >= 2)) {
      return { novo: Object.assign({}, base, { verificadoEm: iso_(), githubEm: r.githubEm || base.githubEm, semDadosDesde: desde }), aviso: null };
    }
    // ...mas num cliente, 2h sem conseguir conferir vira atenção (nunca um "ok" parado)
    r = { status: 'atencao', detalhe: 'Não consigo conferir há ' + Math.floor(horasDesde_(desde)) + 'h: ' + (r.detalhe || 'sem resposta'), link: base.link, semDadosDesde: desde };
  }
  const grave = r.status === 'erro' || r.status === 'atencao';
  const falhas = grave ? ((ant && ant.falhas) || 0) + 1 : 0;
  if (grave && falhas < 2 && p.tipo !== 'batida' && ant && GRAVIDADE[ant.status] < GRAVIDADE[r.status]) {
    r = Object.assign({}, ant, { suspeita: r.detalhe, githubEm: r.githubEm || ant.githubEm, semDadosDesde: r.semDadosDesde || null });   // 1ª vez: espera confirmar
  }
  const novo = Object.assign({}, r, { falhas, verificadoEm: iso_(), semDadosDesde: r.semDadosDesde || null,
    desde: ant && ant.status === r.status ? ant.desde : iso_(), historico: (ant && ant.historico) || [] });
  let aviso = null;
  if (ant && ant.status !== novo.status) {
    novo.historico = [{ quando: iso_(), de: ant.status, para: novo.status, detalhe: String(novo.detalhe || '').slice(0, 80) }].concat(novo.historico).slice(0, 5);
    const piorou = GRAVIDADE[novo.status] >= 2 && GRAVIDADE[novo.status] > GRAVIDADE[ant.status];
    const voltou = GRAVIDADE[ant.status] >= 2 && novo.status === 'ok';
    if (piorou) aviso = { projeto: p.id, nivel: novo.status === 'erro' ? 'urgente' : 'atencao', titulo: `${p.urgente && novo.status === 'erro' ? '🚨 ' : ''}${p.icone} ${p.nome}: ${novo.status === 'erro' ? 'problema' : 'atenção'}`, texto: novo.detalhe, url: novo.link || '' };
    if (voltou) aviso = { projeto: p.id, nivel: 'ok', titulo: `${p.icone} ${p.nome} voltou ao normal`, texto: novo.detalhe, url: novo.link || '' };
  }
  return { novo, aviso };
}

/** Gatilho a cada 10 min. A rede é consultada SEM trava (pode demorar); a trava só cobre ler-juntar-gravar. */
function verificar() {
  const resultados = PROJETOS.map(p => {
    try { return checar_(p, estadoDe_(p.id)); } catch (e) { return { status: 'erro', detalhe: 'Falha ao conferir: ' + e.message }; }
  });
  const avisos = comTrava_(() => {
    const novos = [];
    PROJETOS.forEach((p, i) => {
      const r = resultados[i];
      if (r._execs) { acumularExecucoes_(p.id, r._execs, agora_(), r._cortado); if (r._ultima) PropertiesService.getScriptProperties().setProperty('ultimaExec:' + p.id, r._ultima); }
      delete r._execs; delete r._ultima; delete r._cortado;
      const { novo, aviso } = juntar_(p, estadoDe_(p.id), r);
      gravar_('estado:' + p.id, novo);
      if (r.status !== 'semdados') registrarDisponibilidade_(p.id, r.status);       // conta o resultado real (a 1ª falha também)
      if (aviso && !(aviso.nivel === 'atencao' && prop_('observar:' + p.id) >= dia_())) novos.push(aviso);   // semana de observação
    });
    gravar_('verificadoEm', iso_());
    novos.forEach(a => registrarAviso_(a));
    return novos;
  });
  if (avisos.length) enviarPush_();
  return avisos;
}

/**
 * Disponibilidade por dia (últimos 40): t = conferências que valeram, u = quantas estavam no ar.
 * Só conta ok e erro (atenção conta como no ar; pausado/configurar/sem dados não contam).
 */
function registrarDisponibilidade_(id, status) {
  if (['ok', 'atencao', 'erro'].indexOf(status) < 0) return;
  const lista = ler_('disp:' + id, []);
  const hoje = dia_();
  if (!lista.length || lista[lista.length - 1].d !== hoje) lista.push({ d: hoje, t: 0, u: 0 });
  const x = lista[lista.length - 1];
  x.t++; if (status !== 'erro') x.u++;
  gravar_('disp:' + id, lista.slice(-40));
}

/** % no ar nos últimos n dias (null se não houver dados). */
function disponibilidade_(id, n) {
  const lista = ler_('disp:' + id, []).slice(-n);
  const t = lista.reduce((s2, x) => s2 + x.t, 0), u = lista.reduce((s2, x) => s2 + x.u, 0);
  return t ? Math.round(u / t * 10000) / 100 : null;
}

// ================================================================== avisos e notificações

function registrarAviso_(a) {
  return comTrava_(() => registrarAvisoSemTrava_(a));
}
function registrarAvisoSemTrava_(a) {
  const props = PropertiesService.getScriptProperties();
  const id = Number(props.getProperty('avisoSeq') || '0') + 1;            // contador próprio: nunca volta para 1
  props.setProperty('avisoSeq', String(id));
  const url = String(a.url || '');
  const lista = ler_('avisos', []);
  lista.unshift({ id, quando: iso_(), projeto: String(a.projeto || 'jarvis').slice(0, 20), nivel: a.nivel || 'info',
                  titulo: String(a.titulo || 'Aviso').slice(0, 120), texto: String(a.texto || '').slice(0, 600),
                  url: LINKS_OK.test(url) ? url.slice(0, 300) : '' });
  gravarLista_('avisos', lista.slice(0, 40));
  return id;
}

/** Acorda o iPhone: o push vai vazio e o app busca o texto do aviso (assim não precisa criptografar o conteúdo). */
function enviarPush_() {
  const inscricoes = ler_('push', []);
  if (!inscricoes.length) return { enviados: 0, removidos: 0 };
  const vivas = [];
  let enviados = 0;
  inscricoes.forEach(s => {
    try {
      const aud = s.endpoint.match(/^https:\/\/[^/]+/)[0];
      const r = UrlFetchApp.fetch(s.endpoint, {
        method: 'post', muteHttpExceptions: true, payload: '',
        headers: { TTL: '86400', Urgency: 'high', Authorization: 'vapid t=' + jwtVapid_(aud) + ', k=' + prop_('VAPID_PUB') },
      });
      const c = r.getResponseCode();
      if (c === 404 || c === 410) { log_('push', 'inscrição expirada removida'); return; }
      if (c >= 200 && c < 300) enviados++; else log_('push', 'código ' + c + ': ' + r.getContentText().slice(0, 100));
      vivas.push(s);
    } catch (e) { log_('push', 'erro: ' + e.message); vivas.push(s); }
  });
  gravar_('push', vivas);
  return { enviados, removidos: inscricoes.length - vivas.length };
}

/** JWT do VAPID, guardado por 11h para cada servidor de push (assinar custa caro). */
function jwtVapid_(aud) {
  const cache = CacheService.getScriptCache();
  const chave = 'jwt:' + aud;
  const guardado = cache.get(chave);
  if (guardado) return guardado;
  const b64 = bytes => Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
  const texto = o => b64(Utilities.newBlob(JSON.stringify(o)).getBytes());
  const entrada = texto({ typ: 'JWT', alg: 'ES256' }) + '.' + texto({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUJEITO_VAPID });
  const jwt = entrada + '.' + b64(assinarES256_(Utilities.newBlob(entrada).getBytes(), prop_('VAPID_D')));
  cache.put(chave, jwt, 11 * 3600);
  return jwt;
}

// ------------------------------------------------------------------ ECDSA P-256 (o Apps Script não tem, então vai na mão com BigInt)

// O Apps Script não aceita literais BigInt (0n), então as constantes ficam aqui.
const N0 = BigInt(0);
const N1 = BigInt(1);
const N2 = BigInt(2);
const N3 = BigInt(3);
const N4 = BigInt(4);
const N8 = BigInt(8);
const N255 = BigInt(255);
const P256 = {
  p: BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff'),
  n: BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'),
  gx: BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'),
  gy: BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5'),
};
function mod_(a, m) { const r = a % m; return r >= N0 ? r : r + m; }
function inv_(a, m) {
  let [r0, r1] = [mod_(a, m), m], [s0, s1] = [N1, N0];
  while (r1 !== N0) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
  return mod_(s0, m);
}
// pontos em coordenadas jacobianas [X, Y, Z]; Z = 0 é o infinito
function dobrar_(P) {
  const p = P256.p, [X, Y, Z] = P;
  if (Z === N0 || Y === N0) return [N0, N1, N0];
  const YY = mod_(Y * Y, p), S = mod_(N4 * X * YY, p), ZZ = mod_(Z * Z, p);
  const M = mod_(N3 * (X - ZZ) * (X + ZZ), p);                 // a = -3
  const X3 = mod_(M * M - N2 * S, p);
  return [X3, mod_(M * (S - X3) - N8 * YY * YY, p), mod_(N2 * Y * Z, p)];
}
function somar_(P, Q) {
  const p = P256.p;
  if (P[2] === N0) return Q;
  if (Q[2] === N0) return P;
  const Z1Z1 = mod_(P[2] * P[2], p), Z2Z2 = mod_(Q[2] * Q[2], p);
  const U1 = mod_(P[0] * Z2Z2, p), U2 = mod_(Q[0] * Z1Z1, p);
  const S1 = mod_(P[1] * Q[2] * Z2Z2, p), S2 = mod_(Q[1] * P[2] * Z1Z1, p);
  if (U1 === U2) return S1 === S2 ? dobrar_(P) : [N0, N1, N0];
  const H = mod_(U2 - U1, p), R = mod_(S2 - S1, p), HH = mod_(H * H, p), HHH = mod_(H * HH, p), V = mod_(U1 * HH, p);
  const X3 = mod_(R * R - HHH - N2 * V, p);
  return [X3, mod_(R * (V - X3) - S1 * HHH, p), mod_(P[2] * Q[2] * H, p)];
}
function multiplicar_(k) {
  let R = [N0, N1, N0], Q = [P256.gx, P256.gy, N1];
  while (k > N0) { if (k & N1) R = somar_(R, Q); Q = dobrar_(Q); k >>= N1; }
  const zi = inv_(R[2], P256.p), zi2 = mod_(zi * zi, P256.p);
  return [mod_(R[0] * zi2, P256.p), mod_(R[1] * zi2 * zi, P256.p)];
}
function bytesParaBig_(b) { let x = N0; for (let i = 0; i < b.length; i++) x = (x << N8) | BigInt(b[i] & 255); return x; }
function bigParaBytes_(x, n) { const o = []; for (let i = 0; i < n; i++) { const v = Number(x & N255); o.unshift(v > 127 ? v - 256 : v); x >>= N8; } return o; }

/** Assina (ES256) e devolve r||s (64 bytes). k determinístico: HMAC(d, hash||contador), nunca se repete para mensagens diferentes. */
function assinarES256_(mensagemBytes, dBase64Url) {
  const n = P256.n;
  const dBytes = Utilities.base64DecodeWebSafe(dBase64Url + '==='.slice((dBase64Url.length + 3) % 4));
  const d = bytesParaBig_(dBytes);
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, mensagemBytes);
  const z = bytesParaBig_(hash);
  for (let c = 0; c < 100; c++) {
    const k = mod_(bytesParaBig_(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, hash.concat([c]), dBytes)), n);
    if (k === N0) continue;
    const r = mod_(multiplicar_(k)[0], n);
    if (r === N0) continue;
    const s = mod_(inv_(k, n) * (z + r * d), n);
    if (s === N0) continue;
    return bigParaBytes_(r, 32).concat(bigParaBytes_(s, 32));
  }
  throw new Error('não consegui assinar');
}

// ================================================================== entrada

function estadoParaApp_() {
  return {
    versao: VERSAO, verificadoEm: ler_('verificadoEm', null), inscricoes: ler_('push', []).length,
    avisosVistosAte: Number(prop_('avisosVistosAte') || 0),
    projetos: PROJETOS.map(p => {
      const e = estadoDe_(p.id);
      return Object.assign({ id: p.id, nome: p.nome, icone: p.icone, descricao: p.descricao, cliente: !!p.cliente,
                             disp7: disponibilidade_(p.id, 7), disp30: disponibilidade_(p.id, 30), pausaAte: p.pausaProp ? prop_(p.pausaProp) : '' },
        e ? { status: e.status, detalhe: e.detalhe, desde: e.desde, verificadoEm: e.verificadoEm, semDadosDesde: e.semDadosDesde || null,
              link: e.link || '', extra: e.extra || null, historico: (e.historico || []).slice(0, 5) }
          : { status: 'config', detalhe: 'Ainda não conferido' });
    }),
    avisos: ler_('avisos', []).slice(0, 30),
  };
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.acao === 'saude') return json_({ ok: true, verificadoEm: ler_('verificadoEm', null) });
  if (p.acao === 'vapid') return json_({ chave: prop_('VAPID_PUB') });
  const nivel = nivelChave_(p.k);
  if (p.k && ['leitura', 'pc', 'admin'].indexOf(nivel) < 0) return json_({ ok: false, erro: 'chave inválida' });
  if (!nivel) return ContentService.createTextOutput('Jarvis ✅');
  try {
    switch (p.acao) {
      case 'estado': return json_(estadoParaApp_());
      case 'avisos': return json_({ avisos: ler_('avisos', []).filter(a => a.id > Number(p.desde || 0)).slice(0, 10) });
    }
    if (nivel === 'pc' || nivel === 'admin') {
      const r = getPc_(p, nivel);                                   // Pc.gs
      if (r) return json_(r);
    }
    if (nivel !== 'admin') return json_({ ok: false, erro: 'sem permissão' });
    switch (p.acao) {
      case 'verificar': return json_(verificar());
      case 'instalar': return json_({ r: instalar() });
      case 'log': return json_(ler_('log', []));
      case 'definir': {
        const regras = {
          ASSISTENTE_OPERADOR: /^[A-Za-z0-9]{20,64}$/,
          CHAVE_PC: /^[A-Za-z0-9]{24,64}$/,
          BACKUP_PLANILHA: /^(sim|nao)$/,
          VERCEL_TOKEN: /^[A-Za-z0-9]{20,}$/,
          ASSISTENTE_URL: /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/,
          ASSISTENTE_PAINEL: /^https:\/\/caioaprat\.github\.io\//,
          ASSISTENTE_LEITURA: /^[A-Za-z0-9]{16,64}$/,
          GABINETE_URL: /^https:\/\//,
          GABINETE_SUPABASE_URL: /^https:\/\/[a-z0-9]+\.supabase\.co$/,
          GABINETE_SUPABASE_KEY: /^(sb_publishable_[\w-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/,
          GITHUB_TOKEN: /^(github_pat_|ghp_)[\w]+$/,
          ATRASOS_PAUSA_ATE: /^(\d{4}-\d{2}-\d{2})?$/,
        };
        if (!regras[p.prop]) throw new Error('propriedade não permitida');
        if (/^CHAVE|OPERADOR$/.test(p.prop) && ['CHAVE', 'CHAVE_PC', 'CHAVE_LEITURA', 'CHAVE_AVISO', 'CHAVE_BATIDA'].some(k => k !== p.prop && prop_(k) === p.valor)) throw new Error('essa chave já é usada por outro acesso');
        if (p.valor && !regras[p.prop].test(p.valor)) throw new Error('valor inválido para ' + p.prop);
        PropertiesService.getScriptProperties().setProperty(p.prop, p.valor || '');
        return json_({ ok: true });
      }
      case 'aviso': registrarAviso_({ projeto: 'jarvis', titulo: p.titulo || '🤖 Teste do Jarvis', texto: p.texto || '', nivel: 'info' });
        return json_(enviarPush_());
      default: return json_({ ok: false, erro: 'ação desconhecida' });
    }
  } catch (erro) { return json_({ ok: false, erro: erro.message }); }
}

/**
 * Ações rápidas do celular (chave de leitura já basta: nenhuma apaga nada).
 *  lerbanco: pede ao assistente para ler o banco agora
 *  pausar:   pausa a cobrança do bot de atrasos até uma data (feriado/férias); ate vazio = retomar
 *  vistos:   marca os avisos como vistos até o id informado
 */
function acaoRapida_(d) {
  if (d.tipo === 'lerbanco') {
    if (devagar_('lerbanco', 300)) return { ok: false, erro: 'o banco foi lido há menos de 5 minutos' };
    const base = prop_('ASSISTENTE_URL'), k = prop_('ASSISTENTE_LEITURA');
    if (!base || !k) return { ok: false, erro: 'assistente não ligado' };
    const r = buscar_(base + '?k=' + encodeURIComponent(k), { method: 'post', contentType: 'text/plain;charset=utf-8', payload: JSON.stringify({ tipo: 'sync' }) });
    let j = null;
    try { j = JSON.parse(r.texto); } catch (e) { j = null; }
    return j && j.ok ? { ok: true, aviso: j.aviso || 'Banco lido' } : { ok: false, erro: (j && (j.aviso || j.erro)) || 'o assistente não respondeu' };
  }
  if (d.tipo === 'pausar') {
    const p = PROJETOS.find(x => x.id === (d.projeto || 'atrasos'));
    if (!p || !p.pausaProp) return { ok: false, erro: 'esse projeto não pausa' };
    const ate = String(d.ate || '');
    if (ate && (!/^\d{4}-\d{2}-\d{2}$/.test(ate) || dia_(new Date(ate + 'T12:00:00-03:00')) !== ate || ate < dia_() || ate > dia_(new Date(Date.now() + 60 * 864e5)))) return { ok: false, erro: 'data inválida (até 60 dias)' };
    PropertiesService.getScriptProperties().setProperty(p.pausaProp, ate);
    log_('pausa', p.id + ' até ' + (ate || 'retomado'));
    registrarAviso_({ projeto: p.id, nivel: 'info', titulo: ate ? `⏸️ ${p.nome} pausado até ${ate.slice(8, 10)}/${ate.slice(5, 7)}` : `▶️ ${p.nome} voltou a ser cobrado` });
    return { ok: true, aviso: ate ? `${p.nome} pausado até ${ate.slice(8, 10)}/${ate.slice(5, 7)}` : `${p.nome} voltou a ser cobrado` };
  }
  if (d.tipo === 'vistos') {
    const ate = Math.max(0, Math.floor(Number(d.ate) || 0));
    PropertiesService.getScriptProperties().setProperty('avisosVistosAte', String(Math.max(ate, Number(prop_('avisosVistosAte') || 0))));
    return { ok: true };
  }
  return null;
}

function doPost(e) {
  const nivel = nivelChave_(e && e.parameter && e.parameter.k);
  if (!nivel) return json_({ ok: false, erro: 'chave inválida' });
  let d = {};
  try { d = JSON.parse((e.postData && e.postData.contents) || '{}'); } catch (erro) { return json_({ ok: false, erro: 'JSON inválido' }); }
  try {
    if (d.tipo === 'verificar' && ['leitura', 'pc', 'admin'].indexOf(nivel) >= 0) { if (!devagar_('verificar', 60)) verificar(); return json_({ ok: true }); }   // verificar() tem a própria trava
    if (d.tipo === 'batida' && nivel !== 'leitura') {
      if (!PROJETOS.some(p => p.id === d.projeto && p.tipo === 'batida')) return json_({ ok: false, erro: 'projeto desconhecido' });
      gravar_('batida:' + d.projeto, { quando: iso_(), ok: d.ok !== false, detalhe: String(d.detalhe || '').slice(0, 150) });   // chave própria: não precisa de trava
      return json_({ ok: true });
    }
    if (d.tipo === 'aviso' && (nivel === 'aviso' || nivel === 'admin')) {
      const id = comTrava_(() => registrarAviso_(d));
      return json_({ ok: true, id, push: enviarPush_() });
    }
    if (nivel === 'leitura' || nivel === 'pc' || nivel === 'admin') {
      const r = acaoRapida_(d);
      if (r) return json_(r);
    }
    if (nivel === 'pc' || nivel === 'admin') {
      const r = postPc_(d, nivel);                                  // Pc.gs
      if (r) return json_(r);
    }
    if (nivel === 'leitura' || nivel === 'pc' || nivel === 'admin') {
      if (d.tipo === 'inscrever') {
        const s = d.inscricao || {};
        if (!HOSTS_PUSH.test(String(s.endpoint || ''))) return json_({ ok: false, erro: 'inscrição inválida' });
        return comTrava_(() => {
          const lista = ler_('push', []).filter(x => x.endpoint !== s.endpoint);
          lista.push({ endpoint: s.endpoint, criada: iso_(), aparelho: String(d.aparelho || '').slice(0, 30) });
          const final = gravarLista_('push', lista.slice(-4));
          return json_({ ok: true, total: final.length });
        });
      }
      if (d.tipo === 'cancelar') {
        comTrava_(() => gravar_('push', ler_('push', []).filter(x => x.endpoint !== d.endpoint)));
        return json_({ ok: true });
      }
      if (d.tipo === 'teste') {
        comTrava_(() => registrarAviso_({ projeto: 'jarvis', nivel: 'info', titulo: '🤖 Notificação de teste', texto: 'Se você está lendo isso no iPhone, os avisos estão funcionando.' }));
        return json_(Object.assign({ ok: true }, enviarPush_()));
      }
    }
    return json_({ ok: false, erro: 'sem permissão' });
  } catch (erro) { log_('erro', 'doPost: ' + erro.message); return json_({ ok: false, erro: erro.message }); }
}
