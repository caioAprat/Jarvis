/**
 * JARVIS — central de status de todos os projetos do Caio.
 *
 *  - A cada 10 minutos confere cada projeto (PROJETOS, abaixo) e guarda o estado.
 *  - Quando algo quebra ou volta, manda notificação no iPhone (Web Push, sem Telegram).
 *  - Os projetos também podem mandar "batidas" (estou vivo) e avisos (ex.: o assistente financeiro).
 *  - O app (GitHub Pages) lê tudo por acao=estado.
 *
 * CHAVES (Script Properties): CHAVE (admin), CHAVE_LEITURA (app do iPhone), CHAVE_BATIDA (projetos).
 * Para acrescentar um projeto: um item novo em PROJETOS + o teste dele em checar_().
 */

const FUSO = 'America/Sao_Paulo';
const VERSAO = 1;
const SUJEITO_VAPID = 'https://caioaprat.github.io/Jarvis/';

const PROJETOS = [
  { id: 'assistente', nome: 'Assistente financeiro', icone: '💰', tipo: 'assistente',
    descricao: 'Lê o banco 3x ao dia, avisa contas e monta o plano das dívidas' },
  { id: 'painel', nome: 'Painel Meu dinheiro', icone: '📱', tipo: 'site', url: 'https://caioaprat.github.io/Meu_dinheiro/',
    descricao: 'O app do dinheiro na tela inicial' },
  { id: 'atrasos', nome: 'Bot de atrasos', icone: '📦', tipo: 'batida',
    agenda: { 1: '16:30', 2: '16:30', 3: '16:30', 4: '16:30', 5: '15:30' }, tolerancia: 45,
    descricao: 'Relatório de atrasos por e-mail (notebook da empresa)' },
  { id: 'gabinete', nome: 'Gabinete Chamados', icone: '🏛️', tipo: 'site', prop: 'GABINETE_URL',
    descricao: 'Sistema de chamados do cliente' },
  { id: 'cacador', nome: 'Caçador de clientes', icone: '🎯', tipo: 'github', repo: 'caioAprat/Bot_cacaTrampo', workflow: 'cacador.yml',
    descricao: 'Vigia de freelas (99Freelas e Workana)' },
];

// ================================================================== instalação

/** Rode pelo editor uma vez (autoriza e cria o gatilho). Pode rodar de novo sem problema. */
function instalar() {
  const props = PropertiesService.getScriptProperties();
  if (typeof SEGREDOS_LOCAIS !== 'undefined') {             // arquivo que só existe na primeira publicação feita do computador
    Object.keys(SEGREDOS_LOCAIS).forEach(k => { if (SEGREDOS_LOCAIS[k] && !props.getProperty(k)) props.setProperty(k, SEGREDOS_LOCAIS[k]); });
  }
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('verificar').timeBased().everyMinutes(10).create();
  UrlFetchApp.getRequest('https://example.com');
  verificar();
  return 'Jarvis instalado: ' + ['CHAVE', 'CHAVE_LEITURA', 'CHAVE_BATIDA', 'VAPID_D', 'VAPID_PUB']
    .map(k => k + (props.getProperty(k) ? ' ok' : ' FALTA')).join(', ');
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

function log_(tipo, texto) {
  const l = ler_('log', []);
  l.unshift({ quando: iso_(), tipo, texto: String(texto).slice(0, 400) });
  gravar_('log', l.slice(0, 80));
}

function nivelChave_(k) {
  if (!k) return '';
  if (k === prop_('CHAVE')) return 'admin';
  if (k === prop_('CHAVE_LEITURA')) return 'leitura';
  if (k === prop_('CHAVE_BATIDA')) return 'batida';
  return '';
}

function comTrava_(fn) {
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try { return fn(); } finally { trava.releaseLock(); }
}

function buscar_(url, opcoes) {
  const o = Object.assign({ muteHttpExceptions: true, followRedirects: true }, opcoes || {});
  try {
    const r = UrlFetchApp.fetch(url, o);
    return { codigo: r.getResponseCode(), texto: r.getContentText() };
  } catch (e) { return { codigo: 0, texto: '', erro: e.message }; }
}

// ================================================================== checagens

/** Confere um projeto. Devolve { status: ok|atencao|erro|pausado|config, detalhe, extra? }. */
function checar_(p, anterior) {
  if (p.tipo === 'site') {
    const url = p.url || prop_(p.prop);
    if (!url) return { status: 'config', detalhe: 'Falta o endereço (me passe o link do sistema)' };
    const r = buscar_(url);
    return r.codigo >= 200 && r.codigo < 400 ? { status: 'ok', detalhe: 'No ar', link: url }
      : { status: 'erro', detalhe: r.codigo ? 'Fora do ar (código ' + r.codigo + ')' : 'Sem resposta', link: url };
  }

  if (p.tipo === 'assistente') {
    const base = prop_('ASSISTENTE_URL');
    if (!base) return { status: 'config', detalhe: 'Falta ligar ao assistente' };
    const r = buscar_(base + '?acao=saude');
    let s = null;
    try { s = JSON.parse(r.texto); } catch (e) { s = null; }
    if (!s || !s.ok) return { status: 'erro', detalhe: 'O assistente não respondeu', link: prop_('ASSISTENTE_PAINEL') };
    const res = { status: 'ok', detalhe: 'Rotina há ' + Math.round(s.horasRotina || 0) + 'h · banco lido há ' + Math.round(s.horasLeitura || 0) + 'h',
                  link: prop_('ASSISTENTE_PAINEL') };
    if (s.horasRotina === null || s.horasRotina > 14) { res.status = 'atencao'; res.detalhe = 'A rotina não roda há ' + Math.round(s.horasRotina || 0) + 'h'; }
    else if (s.horasLeitura !== null && s.horasLeitura > 30) { res.status = 'atencao'; res.detalhe = 'O banco não é lido há ' + Math.round(s.horasLeitura) + 'h'; }
    const leitura = prop_('ASSISTENTE_LEITURA');
    if (leitura) {
      const w = buscar_(base + '?k=' + encodeURIComponent(leitura) + '&acao=widget');
      try { const d = JSON.parse(w.texto); if (d && d.versao) res.extra = { livre: d.livre, ate: d.ate, ok: d.ok, conta: d.conta, proxima: d.proxima, acao: d.acao }; } catch (e) { /* só o resumo */ }
    }
    return res;
  }

  if (p.tipo === 'batida') {
    const b = ler_('batida:' + p.id, null);
    const agora = agora_();
    const hoje = dia_(agora);
    const semana = Number(Utilities.formatDate(agora, FUSO, 'u'));          // 1 = segunda ... 7 = domingo
    const horario = p.agenda[semana];
    const quando = b ? 'último: ' + Utilities.formatDate(new Date(b.quando), FUSO, "dd/MM 'às' HH:mm") : 'nunca rodou';
    if (b && b.ok === false && dia_(new Date(b.quando)) === hoje) return { status: 'erro', detalhe: 'Falhou hoje: ' + (b.detalhe || 'sem detalhe') };
    if (horario) {
      const [h, m] = horario.split(':').map(Number);
      const limite = h * 60 + m + p.tolerancia;
      const minAgora = Number(Utilities.formatDate(agora, FUSO, 'H')) * 60 + Number(Utilities.formatDate(agora, FUSO, 'm'));
      const rodouHoje = b && dia_(new Date(b.quando)) === hoje;
      if (rodouHoje) return { status: b.ok === false ? 'erro' : 'ok', detalhe: 'Rodou hoje às ' + hhmm_(new Date(b.quando)) + (b.detalhe ? ' · ' + b.detalhe : '') };
      if (minAgora > limite) return { status: 'erro', detalhe: 'Não rodou hoje (esperado ' + horario + '). O notebook estava ligado?' };
      return { status: b ? 'ok' : 'config', detalhe: 'Roda hoje às ' + horario + ' · ' + quando };
    }
    return { status: b ? 'ok' : 'config', detalhe: 'Não roda hoje · ' + quando };
  }

  if (p.tipo === 'github') {
    const ultimo = anterior && anterior.githubEm ? horasDesde_(anterior.githubEm) : 99;
    if (ultimo < 1 && anterior) return Object.assign({}, anterior, { reaproveitado: true });   // GitHub limita consultas: 1x por hora
    const h = { 'User-Agent': 'jarvis-caio', Accept: 'application/vnd.github+json' };
    const wf = buscar_(`https://api.github.com/repos/${p.repo}/actions/workflows/${p.workflow}`, { headers: h });
    if (wf.codigo === 403 || wf.codigo === 429) return Object.assign({}, anterior || { status: 'config', detalhe: 'GitHub sem resposta (limite)' }, { githubEm: iso_() });
    let info = null;
    try { info = JSON.parse(wf.texto); } catch (e) { info = null; }
    if (!info || !info.state) return { status: 'erro', detalhe: 'Não achei o workflow no GitHub', githubEm: iso_() };
    const link = `https://github.com/${p.repo}/actions`;
    if (/^disabled/.test(info.state)) return { status: 'pausado', detalhe: 'Pausado por você', link, githubEm: iso_() };
    const runs = buscar_(`https://api.github.com/repos/${p.repo}/actions/runs?per_page=1`, { headers: h });
    let run = null;
    try { run = JSON.parse(runs.texto).workflow_runs[0]; } catch (e) { run = null; }
    if (!run) return { status: 'atencao', detalhe: 'Nenhuma execução encontrada', link, githubEm: iso_() };
    if (run.status !== 'completed') return { status: 'ok', detalhe: 'Rodando agora', link, githubEm: iso_() };
    const horas = horasDesde_(run.updated_at);
    return horas > 7 ? { status: 'erro', detalhe: 'Parado há ' + Math.round(horas) + 'h', link, githubEm: iso_() }
                     : { status: 'ok', detalhe: 'Última volta há ' + Math.round(horas * 60) + ' min', link, githubEm: iso_() };
  }
  return { status: 'config', detalhe: 'Tipo desconhecido' };
}

const GRAVIDADE = { ok: 0, pausado: 0, config: 1, atencao: 2, erro: 3 };

/** Gatilho a cada 10 min: confere tudo e avisa quando algo muda. */
function verificar() {
  return comTrava_(() => {
    const estado = ler_('estado', {});
    const avisos = [];
    PROJETOS.forEach(p => {
      const ant = estado[p.id] || null;
      let r;
      try { r = checar_(p, ant); } catch (e) { r = { status: 'erro', detalhe: 'Falha ao conferir: ' + e.message }; }
      // site e assistente: só vira erro na 2ª falha seguida (evita alarme por um soluço da internet)
      const falhas = r.status === 'erro' ? ((ant && ant.falhas) || 0) + 1 : 0;
      if (r.status === 'erro' && falhas < 2 && (p.tipo === 'site' || p.tipo === 'assistente') && ant && ant.status !== 'erro') {
        r = Object.assign({}, ant, { detalhe: ant.detalhe, suspeita: r.detalhe });
      }
      const novo = Object.assign({}, r, { falhas, verificadoEm: iso_(),
        desde: ant && ant.status === r.status ? ant.desde : iso_(), historico: (ant && ant.historico) || [] });
      if (ant && ant.status !== novo.status) {
        novo.historico = [{ quando: iso_(), de: ant.status, para: novo.status, detalhe: novo.detalhe }].concat(novo.historico).slice(0, 15);
        const piorou = GRAVIDADE[novo.status] >= 2 && GRAVIDADE[novo.status] > GRAVIDADE[ant.status];
        const voltou = GRAVIDADE[ant.status] >= 2 && novo.status === 'ok';
        if (piorou) avisos.push({ projeto: p.id, nivel: novo.status === 'erro' ? 'urgente' : 'atencao', titulo: `${p.icone} ${p.nome}: ${novo.status === 'erro' ? 'problema' : 'atenção'}`, texto: novo.detalhe, url: novo.link || '' });
        if (voltou) avisos.push({ projeto: p.id, nivel: 'ok', titulo: `${p.icone} ${p.nome} voltou ao normal`, texto: novo.detalhe, url: novo.link || '' });
      }
      estado[p.id] = novo;
    });
    gravar_('estado', estado);
    gravar_('verificadoEm', iso_());
    avisos.forEach(a => registrarAviso_(a));
    if (avisos.length) enviarPush_();
    return estado;
  });
}

// ================================================================== avisos e notificações

function registrarAviso_(a) {
  const lista = ler_('avisos', []);
  const id = (lista[0] ? lista[0].id : 0) + 1;
  lista.unshift({ id, quando: iso_(), projeto: a.projeto || 'jarvis', nivel: a.nivel || 'info',
                  titulo: String(a.titulo || 'Aviso').slice(0, 120), texto: String(a.texto || '').slice(0, 1500), url: String(a.url || '').slice(0, 600) });
  gravar_('avisos', lista.slice(0, 60));
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
      if (c >= 200 && c < 300) enviados++; else log_('push', 'código ' + c + ': ' + r.getContentText().slice(0, 200));
      vivas.push(s);
    } catch (e) { log_('push', 'erro: ' + e.message); vivas.push(s); }
  });
  gravar_('push', vivas);
  return { enviados, removidos: inscricoes.length - vivas.length };
}

function jwtVapid_(aud) {
  const b64 = bytes => Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
  const texto = o => b64(Utilities.newBlob(JSON.stringify(o)).getBytes());
  const entrada = texto({ typ: 'JWT', alg: 'ES256' }) + '.' + texto({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUJEITO_VAPID });
  return entrada + '.' + b64(assinarES256_(Utilities.newBlob(entrada).getBytes(), prop_('VAPID_D')));
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
  const estado = ler_('estado', {});
  return {
    versao: VERSAO, verificadoEm: ler_('verificadoEm', null), inscricoes: ler_('push', []).length,
    projetos: PROJETOS.map(p => Object.assign({ id: p.id, nome: p.nome, icone: p.icone, descricao: p.descricao },
      estado[p.id] ? { status: estado[p.id].status, detalhe: estado[p.id].detalhe, desde: estado[p.id].desde, verificadoEm: estado[p.id].verificadoEm,
                       link: estado[p.id].link || '', extra: estado[p.id].extra || null, historico: (estado[p.id].historico || []).slice(0, 5) }
                     : { status: 'config', detalhe: 'Ainda não conferido' })),
    avisos: ler_('avisos', []).slice(0, 30),
  };
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.acao === 'saude') return json_({ ok: true, verificadoEm: ler_('verificadoEm', null) });
  if (p.acao === 'vapid') return json_({ chave: prop_('VAPID_PUB') });
  const nivel = nivelChave_(p.k);
  if (nivel !== 'leitura' && nivel !== 'admin') return ContentService.createTextOutput('Jarvis ✅');
  try {
    switch (p.acao) {
      case 'estado': return json_(estadoParaApp_());
      case 'avisos': return json_({ avisos: ler_('avisos', []).filter(a => a.id > Number(p.desde || 0)).slice(0, 10) });
    }
    if (nivel !== 'admin') return json_({ ok: false, erro: 'sem permissão' });
    switch (p.acao) {
      case 'verificar': return json_(verificar());
      case 'instalar': return json_({ r: instalar() });
      case 'log': return json_(ler_('log', []));
      case 'definir': {
        const permitidos = ['ASSISTENTE_URL', 'ASSISTENTE_LEITURA', 'ASSISTENTE_PAINEL', 'GABINETE_URL'];
        if (permitidos.indexOf(p.prop) < 0) throw new Error('propriedade não permitida');
        PropertiesService.getScriptProperties().setProperty(p.prop, p.valor || '');
        return json_({ ok: true });
      }
      case 'aviso': registrarAviso_({ projeto: 'jarvis', titulo: p.titulo || '🤖 Teste do Jarvis', texto: p.texto || '', nivel: 'info' });
        return json_(enviarPush_());
      default: return json_({ ok: false, erro: 'ação desconhecida' });
    }
  } catch (erro) { return json_({ ok: false, erro: erro.message }); }
}

function doPost(e) {
  const nivel = nivelChave_(e && e.parameter && e.parameter.k);
  if (!nivel) return json_({ ok: false, erro: 'chave inválida' });
  let d = {};
  try { d = JSON.parse((e.postData && e.postData.contents) || '{}'); } catch (erro) { return json_({ ok: false, erro: 'JSON inválido' }); }
  try {
    return comTrava_(() => {
      if (nivel === 'batida' || nivel === 'admin') {
        if (d.tipo === 'batida') {
          if (!PROJETOS.some(p => p.id === d.projeto)) return json_({ ok: false, erro: 'projeto desconhecido' });
          gravar_('batida:' + d.projeto, { quando: iso_(), ok: d.ok !== false, detalhe: String(d.detalhe || '').slice(0, 200) });
          return json_({ ok: true });
        }
        if (d.tipo === 'aviso') {
          const id = registrarAviso_(d);
          return json_({ ok: true, id, push: enviarPush_() });
        }
      }
      if (nivel === 'leitura' || nivel === 'admin') {
        if (d.tipo === 'inscrever') {
          const s = d.inscricao || {};
          if (!/^https:\/\//.test(String(s.endpoint || ''))) return json_({ ok: false, erro: 'inscrição inválida' });
          const lista = ler_('push', []).filter(x => x.endpoint !== s.endpoint);
          lista.push({ endpoint: s.endpoint, criada: iso_(), aparelho: String(d.aparelho || '').slice(0, 60) });
          gravar_('push', lista.slice(-5));
          return json_({ ok: true, total: lista.length });
        }
        if (d.tipo === 'cancelar') {
          gravar_('push', ler_('push', []).filter(x => x.endpoint !== d.endpoint));
          return json_({ ok: true });
        }
        if (d.tipo === 'teste') {
          registrarAviso_({ projeto: 'jarvis', nivel: 'info', titulo: '🤖 Notificação de teste', texto: 'Se você está lendo isso no iPhone, os avisos estão funcionando.' });
          return json_(Object.assign({ ok: true }, enviarPush_()));
        }
        if (d.tipo === 'verificar') { verificar(); return json_({ ok: true }); }
      }
      return json_({ ok: false, erro: 'sem permissão' });
    });
  } catch (erro) { log_('erro', 'doPost: ' + erro.message); return json_({ ok: false, erro: erro.message }); }
}
