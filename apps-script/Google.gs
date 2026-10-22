/**
 * JARVIS · Google.gs — o que depende das APIs do Google.
 *
 *  - Planilha J Hissnauer: lê o REGISTRO DE EXECUÇÕES do Apps Script dela (o mesmo da tela "Execuções"), sem mexer
 *    no código da planilha. Conta execuções, falhas, travadas (passaram do tempo) e lentas.
 *  - Todo dia às 3h (diario): guarda uma cópia do código da planilha quando ele muda, faz uma cópia da planilha
 *    (mantém 7) e mede o tamanho (o Google trava em 10 milhões de células).
 *  - Versões dos Apps Script (assistente e Jarvis) e "voltar versão".
 *
 * As APIs usam o token do próprio Jarvis (ScriptApp.getOAuthToken, escopos no appsscript.json). Se o Google responder
 * "API não ativada" (projeto padrão), o Jarvis precisa ser ligado a um projeto do Google Cloud com a Apps Script API ativa.
 */

const LIMITE_CELULAS = 10000000;
const APPS = {                                                  // Apps Script que o Jarvis PC sabe versionar
  assistente: { nome: 'Assistente financeiro', scriptId: '1jxJ3PzE3UF1obP77u3eo3YtNuoR8mGKRuSP6MzLih1ZWt2SvRKqN0X0h',
                deploymentId: 'AKfycbwovkZ6HaCLcC1dCORoi9pQ0vdJyb38DgRcL-tSWjOwFekDBU53qMZDJhU2-UsiKQuP' },
  // o Jarvis só mostra as versões: voltar o próprio servidor para antes da central do PC trancaria o Caio para fora dela
  jarvis: { nome: 'Jarvis (servidor)', scriptId: '1xBMQ8K1iYNVncpaTMIa62iSxRe-jExI--XaceF-evOdtQCOrXNcD872f',
            deploymentId: 'AKfycbwPYJb6pjQ2nPlW63SGh82Rsrfkqk8Mpn9X-ajd8nRA3QJbrMDHyMuwIyAVrQnNPq35', soLeitura: true },
};

// ================================================================== acesso às APIs

/** Chama uma API do Google. Devolve { codigo, json, erro }. */
function googleApi_(url, opcoes) {
  const o = Object.assign({ muteHttpExceptions: true, headers: {} }, opcoes || {});
  try {
    o.headers = Object.assign({ Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, o.headers);
    const r = UrlFetchApp.fetch(url, o);
    let j = null;
    try { j = JSON.parse(r.getContentText()); } catch (e) { j = null; }
    const codigo = r.getResponseCode();
    const desativada = codigo === 403 && /SERVICE_DISABLED|has not been used|is disabled/i.test(r.getContentText());
    return { codigo, json: j, desativada, erro: codigo >= 400 ? (desativada ? 'a Apps Script API não está ativa no projeto do Jarvis'
      : ((j && j.error && j.error.message) || ('código ' + codigo))).slice(0, 160) : '' };
  } catch (e) { return { codigo: 0, json: null, erro: e.message.slice(0, 160) }; }
}

function segundos_(duracao) { return Number(String(duracao || '0').replace('s', '')) || 0; }

// ================================================================== planilha: registro de execuções

/** Execuções do script entre `desde` e agora (até 3 páginas de 200). */
function execucoes_(scriptId, desde) {
  const lista = [];
  let pagina = '';
  for (let n = 0; n < 3; n++) {
    const q = 'scriptId=' + encodeURIComponent(scriptId) + '&pageSize=200&scriptProcessFilter.startTime=' + encodeURIComponent(desde.toISOString()) +
              (pagina ? '&pageToken=' + encodeURIComponent(pagina) : '');
    const r = googleApi_('https://script.googleapis.com/v1/processes:listScriptProcesses?' + q);
    if (r.codigo !== 200) return { erro: r.erro, codigo: r.codigo, desativada: r.desativada, lista };
    (r.json.processes || []).forEach(x => lista.push({ funcao: x.functionName || '?', tipo: x.processType || '', status: x.processStatus || '',
                                                       inicio: x.startTime, seg: segundos_(x.duration) }));
    pagina = r.json.nextPageToken;
    if (!pagina) break;
  }
  return { lista, cortado: !!pagina };
}

const RUINS = ['FAILED', 'TIMED_OUT'];

/**
 * Checagem da planilha (a cada 10 min):
 *  erro    -> na última hora, 5+ execuções falharam/travaram e são 25%+ do total (os usuários estão sendo afetados)
 *  atencao -> 2+ problemas na última hora, 5+ lentas (10 s+), ou nenhuma execução há 3h em horário de trabalho
 *  ok      -> resumo da última hora
 * Também acumula os números do dia (para o PC) e guarda os últimos problemas.
 */
function checarPlanilha_(p, anterior) {
  const agora = agora_();
  const r = execucoes_(p.scriptId, new Date(agora.getTime() - 60 * 60000));
  const link = 'https://docs.google.com/spreadsheets/d/' + p.planilhaId + '/edit';
  if (r.erro) {
    // perder o acesso ao registro é grave para um cliente: vira atenção (com aviso), nunca "ok" parado
    if (r.desativada) return { status: 'atencao', detalhe: 'Não consigo ler o registro de execuções: ' + r.erro + ' (ver o passo a passo do projeto do Google Cloud)', link };
    if (r.codigo === 401 || r.codigo === 403 || r.codigo === 404)
      return { status: 'atencao', detalhe: 'Não consigo ler o registro de execuções (' + r.codigo + '): a conta do Jarvis perdeu acesso à planilha ou falta autorizar (rodar "instalar")', link };
    return { status: 'semdados', detalhe: 'Registro de execuções sem resposta: ' + r.erro };
  }
  const L = r.lista;
  const ruins = L.filter(x => RUINS.indexOf(x.status) >= 0);
  const travadas = L.filter(x => x.status === 'TIMED_OUT').length;
  const lentas = L.filter(x => x.seg >= 10).length;
  const ultimaVista = L.map(x => x.inicio).sort().pop() || null;
  const ultima = ultimaVista || prop_('ultimaExec:' + p.id) || null;
  const extra = { _execs: L, _ultima: ultimaVista, _cortado: r.cortado };          // gravado dentro da trava, em verificar()
  const resumo = `${L.length} execuç${L.length === 1 ? 'ão' : 'ões'} na última hora · ${ruins.length} com problema${lentas ? ' · ' + lentas + ' lentas' : ''}`;
  const taxa = ruins.length / Math.max(1, L.length);
  if (ruins.length >= 5 && taxa >= 0.25)
    return Object.assign({ status: 'erro', detalhe: `${ruins.length} de ${L.length} execuções falharam ou travaram na última hora${travadas ? ' (' + travadas + ' passaram do tempo)' : ''}: os usuários podem estar sendo afetados`, link }, extra);
  if ((ruins.length >= 3 && taxa >= 0.1) || lentas >= 8) return Object.assign({ status: 'atencao', detalhe: resumo, link }, extra);
  if (!emHorarioComercial_(p, agora)) return Object.assign({ status: L.length ? 'ok' : 'aguardando', detalhe: L.length ? resumo : 'Fora do horário de trabalho', link }, extra);
  // sem uso: só informativo (sábados calmos e feriados são normais); não vira alarme
  const inicioExpediente = new Date(dia_(agora) + 'T' + String(p.comercial.de).padStart(2, '0') + ':00:00-03:00').getTime();
  const semUso = (agora.getTime() - Math.max(ultima ? new Date(ultima).getTime() : 0, inicioExpediente)) / 36e5;
  if (semUso >= 3) return Object.assign({ status: 'aguardando', detalhe: 'Nenhuma execução há ' + Math.floor(semUso) + 'h em horário de trabalho (ninguém usando, ou os gatilhos pararam)', link }, extra);
  return Object.assign({ status: 'ok', detalhe: L.length ? resumo : 'Sem uso na última hora', link }, extra);
}

function emHorarioComercial_(p, d) {
  if (!p.comercial) return false;
  const dia = Number(Utilities.formatDate(d, FUSO, 'u')), h = Number(Utilities.formatDate(d, FUSO, 'H'));
  return p.comercial.dias.indexOf(dia) >= 0 && h >= p.comercial.de && h < p.comercial.ate;
}

/**
 * Números do dia (35 dias) e últimos problemas. Só conta execuções "assentadas" (começaram há 15+ min), cada uma uma vez:
 * guarda o início da última contada.
 */
function acumularExecucoes_(id, lista, agora, cortado) {
  const estado = ler_('execs:' + id, { ate: null, dias: [], problemas: [] });
  if (cortado) estado.cortado = iso_();
  const limite = new Date(agora.getTime() - 15 * 60000).toISOString();
  const novas = lista.filter(x => x.inicio && x.inicio <= limite && (!estado.ate || x.inicio > estado.ate)).sort((a, b) => a.inicio < b.inicio ? -1 : 1);
  novas.forEach(x => {
    const d = dia_(new Date(x.inicio));
    let dd = estado.dias[estado.dias.length - 1];
    if (!dd || dd.d !== d) { dd = { d, total: 0, falhas: 0, travadas: 0, lentas: 0, max: 0 }; estado.dias.push(dd); }
    dd.total++;
    if (x.status === 'FAILED') dd.falhas++;
    if (x.status === 'TIMED_OUT') dd.travadas++;
    if (x.seg >= 10) dd.lentas++;
    dd.max = Math.max(dd.max, Math.round(x.seg));
    if (RUINS.indexOf(x.status) >= 0) estado.problemas.unshift({ q: x.inicio, f: x.funcao.slice(0, 30), s: x.status === 'TIMED_OUT' ? 'travou' : 'falhou', seg: Math.round(x.seg) });
    estado.ate = x.inicio;
  });
  estado.dias = estado.dias.slice(-35);
  estado.problemas = estado.problemas.slice(0, 25);
  while (tamanho_(estado) > LIMITE_PROP && estado.problemas.length) estado.problemas.pop();
  gravar_('execs:' + id, estado);
}

// ================================================================== rotina diária (3h)

function pastaBackups_() {
  const id = prop_('PASTA_BACKUPS');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recria */ } }
  const pasta = DriveApp.createFolder('Jarvis — backups');
  PropertiesService.getScriptProperties().setProperty('PASTA_BACKUPS', pasta.getId());
  return pasta;
}

/** Cópia do código quando ele muda (para saber o que mudou e conseguir voltar). */
function guardarCodigo_(p) {
  const r = googleApi_('https://script.googleapis.com/v1/projects/' + p.scriptId + '/content');
  if (r.codigo !== 200) return { erro: r.erro };
  const arquivos = (r.json.files || []).map(f => ({ nome: f.name, tipo: f.type, fonte: f.source || '' }));
  const assinatura = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(arquivos)));
  const antes = ler_('codigo:' + p.id, null);
  if (antes && antes.hash === assinatura) return { mudou: false };
  const nome = `Código ${p.nome} ${Utilities.formatDate(agora_(), FUSO, 'yyyy-MM-dd HH-mm')}.json`;
  const arquivo = pastaBackups_().createFile(nome, JSON.stringify({ projeto: p.nome, scriptId: p.scriptId, quando: iso_(), arquivos }, null, 1), 'application/json');
  const mudados = antes && antes.arquivos ? arquivos.filter(a => antes.arquivos[a.nome] !== tamanhoFonte_(a)).map(a => a.nome) : [];
  comTrava_(() => gravar_('codigo:' + p.id, { hash: assinatura, quando: iso_(), arquivoId: arquivo.getId(),
    arquivos: arquivos.reduce((o, a) => { o[a.nome] = tamanhoFonte_(a); return o; }, {}) }));
  if (antes) registrarAviso_({ projeto: p.id, nivel: 'atencao', titulo: `📝 O código da ${p.nome} mudou`,
    texto: (mudados.length ? 'Arquivos: ' + mudados.join(', ') + '. ' : '') + 'Uma cópia ficou guardada na pasta "Jarvis — backups" do Drive.' });
  return { mudou: true };
}
function tamanhoFonte_(a) { return a.tipo + ':' + a.fonte.length + ':' + a.fonte.slice(-40); }

/**
 * Cópia diária da planilha (mantém 7). DESLIGADA até o cliente concordar (dados dele no Drive do Caio):
 * ligar com BACKUP_PLANILHA=sim (Ajustes do PC). Uma cópia por dia, no máximo.
 */
function copiarPlanilha_(p) {
  if (prop_('BACKUP_PLANILHA') !== 'sim') return { pulado: true };
  if (ler_('copias:' + p.id, []).some(x => x.d === dia_())) return { jaFeita: true };
  const copia = DriveApp.getFileById(p.planilhaId).makeCopy(`Backup ${p.nome} ${dia_()}`, pastaBackups_());
  const lista = ler_('copias:' + p.id, []);
  lista.push({ id: copia.getId(), d: dia_() });
  while (lista.length > 7) {
    const velha = lista.shift();
    try { DriveApp.getFileById(velha.id).setTrashed(true); } catch (e) { log_('backup', 'não consegui pôr na lixeira ' + velha.d); }
  }
  comTrava_(() => gravar_('copias:' + p.id, lista));
  return { ok: true };
}

/** Tamanho da planilha (o Google trava em 10 milhões de células). Avisa a partir de 80%. */
function medirPlanilha_(p) {
  const abas = SpreadsheetApp.openById(p.planilhaId).getSheets();
  const celulas = abas.reduce((s2, a) => s2 + a.getMaxRows() * a.getMaxColumns(), 0);
  const pct = Math.round(celulas / LIMITE_CELULAS * 1000) / 10;
  const maiores = abas.map(a => ({ nome: a.getName().slice(0, 30), celulas: a.getMaxRows() * a.getMaxColumns() }))
    .sort((a, b) => b.celulas - a.celulas).slice(0, 5);
  comTrava_(() => gravar_('tamanho:' + p.id, { celulas, pct, abas: abas.length, maiores, quando: iso_() }));
  if (pct >= 80) registrarAviso_({ projeto: p.id, nivel: pct >= 90 ? 'urgente' : 'atencao', titulo: `📈 ${p.nome} está com ${pct}% do limite de células`,
    texto: 'O Google para de aceitar edições em 10 milhões de células. Maiores abas: ' + maiores.map(x => x.nome).join(', ') + '.' });
  return { pct };
}

/** O banco grátis do Supabase pausa sem uso: uma consulta por dia evita isso. */
function manterSupabase_(p) {
  const base = prop_(p.supabase + '_SUPABASE_URL'), chave = prop_(p.supabase + '_SUPABASE_KEY');
  if (!base || !chave) return { pulado: true };
  const r = buscar_(base + '/rest/v1/', { headers: { apikey: chave } });
  if (r.codigo !== 200) log_('supabase', 'consulta diária respondeu ' + r.codigo);
  return { codigo: r.codigo };
}

/** Gatilho diário (3h). Cada parte é independente: uma falha não impede as outras. */
function diario() {
  const relatorio = {};
  PROJETOS.forEach(p => {
    const partes = [];
    if (p.tipo === 'appsscript') partes.push(['codigo', guardarCodigo_], ['copia', copiarPlanilha_], ['tamanho', medirPlanilha_]);
    if (p.supabase) partes.push(['supabase', manterSupabase_]);
    partes.forEach(([nome, fn]) => {
      try { relatorio[p.id + '.' + nome] = fn(p); } catch (e) { relatorio[p.id + '.' + nome] = { erro: e.message.slice(0, 120) }; log_('diario', p.id + '.' + nome + ': ' + e.message); }
    });
  });
  comTrava_(() => gravar_('diario', { quando: iso_(), relatorio }));
  enviarPush_();
  return relatorio;
}

// ================================================================== versões dos Apps Script

function versoes_(chave) {
  const a = APPS[chave];
  if (!a) return { erro: 'projeto desconhecido' };
  const todas = [];
  let pagina = '';
  for (let n = 0; n < 10; n++) {                                // o Apps Script guarda até ~200 versões
    const v = googleApi_('https://script.googleapis.com/v1/projects/' + a.scriptId + '/versions?pageSize=50' + (pagina ? '&pageToken=' + encodeURIComponent(pagina) : ''));
    if (v.codigo !== 200) return { erro: v.erro };
    (v.json.versions || []).forEach(x => todas.push(x));
    pagina = v.json.nextPageToken;
    if (!pagina) break;
  }
  const d = googleApi_('https://script.googleapis.com/v1/projects/' + a.scriptId + '/deployments/' + a.deploymentId);
  const atual = d.codigo === 200 ? Number(d.json.deploymentConfig && d.json.deploymentConfig.versionNumber) : null;
  const lista = todas.map(x => ({ numero: x.versionNumber, descricao: (x.description || '').slice(0, 100), quando: x.createTime }))
    .sort((x, y) => y.numero - x.numero).slice(0, 12);
  return { nome: a.nome, atual, versoes: lista, soLeitura: !!a.soLeitura, total: todas.length };
}

/** Faz o endereço do app passar a usar outra versão (o código das versões não muda; dá para voltar de novo). */
function voltarVersao_(chave, numero) {
  const a = APPS[chave];
  if (!a) return { ok: false, erro: 'projeto desconhecido' };
  if (a.soLeitura) return { ok: false, erro: 'o Jarvis não volta a própria versão pela central (use o editor do Apps Script)' };
  numero = Math.floor(Number(numero));
  const disponiveis = versoes_(chave);
  if (disponiveis.erro) return { ok: false, erro: disponiveis.erro };
  if (!disponiveis.versoes.some(x => x.numero === numero)) return { ok: false, erro: 'versão não encontrada' };
  const r = googleApi_('https://script.googleapis.com/v1/projects/' + a.scriptId + '/deployments/' + a.deploymentId, {
    method: 'put', contentType: 'application/json',
    payload: JSON.stringify({ deploymentConfig: { scriptId: a.scriptId, versionNumber: numero, manifestFileName: 'appsscript',
      description: `Voltou para a versão ${numero} pelo Jarvis PC` } }),
  });
  if (r.codigo !== 200) return { ok: false, erro: r.erro };
  log_('versao', `${a.nome}: ${disponiveis.atual} -> ${numero}`);
  if (chave === 'assistente') { try { assistente_({ acao: 'sincronizar' }); } catch (e) { /* versões antigas não têm a chave de operador */ } }
  registrarAviso_({ projeto: chave, nivel: 'atencao', titulo: `⏪ ${a.nome} voltou para a versão ${numero}`, texto: `Antes estava na ${disponiveis.atual}. Feito pelo Jarvis PC.` });
  return { ok: true, antes: disponiveis.atual, agora: numero };
}
