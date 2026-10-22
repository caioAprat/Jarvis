// Rodar: node jarvis/testes/testes.js
// Simula o Apps Script (Properties, UrlFetch, Utilities com criptografia real do Node) e confere o Jarvis.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');

let ok = 0, falhas = 0;
function t(nome, cond, detalhe) {
  if (cond) ok++; else { falhas++; console.log('  ✗ FALHOU: ' + nome + (detalhe !== undefined ? '  → ' + JSON.stringify(detalhe).slice(0, 400) : '')); }
}
function grupo(n) { console.log('\n== ' + n); }

const assinado = b => Array.from(b).map(x => (x > 127 ? x - 256 : x));
const semSinal = a => Buffer.from(a.map(x => x & 255));

function ambiente(opcoes = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jp = publicKey.export({ format: 'jwk' }), jk = privateKey.export({ format: 'jwk' });
  const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jp.x, 'base64url'), Buffer.from(jp.y, 'base64url')]).toString('base64url');
  const A = { ms: new Date(opcoes.agora || '2026-10-21T10:00:00-03:00').getTime(), props: {}, cache: {}, chamadas: [], gatilhos: [], publicKey,
              respostas: opcoes.respostas || {} };
  Object.assign(A.props, { CHAVE: 'ADMIN1234567890ABCDEF', CHAVE_LEITURA: 'LEITURA1234567890ABCD', CHAVE_BATIDA: 'BATIDA1234567890ABCDE', CHAVE_AVISO: 'AVISO1234567890ABCDEFG',
                           VAPID_D: jk.d, VAPID_PUB: pub, ASSISTENTE_URL: 'https://script.google.com/macros/s/ASSIST/exec', ASSISTENTE_LEITURA: 'LEIT' });
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { super(...(a.length ? a : [A.ms])); }
    static now() { return A.ms; }
    static [Symbol.hasInstance](x) { return x instanceof RealDate; }
  }
  const fmt = (d, tz, padrao) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(d).map(x => [x.type, x.value]));
    if (p.hour === '24') p.hour = '00';
    const u = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
    return padrao.replace(/'([^']*)'|yyyy|MM|dd|HH|mm|H|m|u/g, (m, lit) => lit !== undefined ? lit
      : ({ yyyy: p.year, MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, H: String(Number(p.hour)), m: String(Number(p.minute)), u: String(u) })[m]);
  };
  const resp = (c, corpo) => ({ getResponseCode: () => c, getContentText: () => typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });
  A.fetch = (url, op = {}) => {
    A.chamadas.push({ url, op });
    for (const chave of Object.keys(A.respostas)) if (url.includes(chave)) { const r = A.respostas[chave]; return typeof r === 'function' ? r(url, op) : resp(r[0], r[1]); }
    if (url.includes('acao=saude')) return resp(200, { ok: true, horasRotina: 2, horasLeitura: 3 });
    if (url.includes('acao=widget')) return resp(200, { versao: 4, ok: false, livre: -333, ate: '2026-10-29', conta: 51 });
    if (url.includes('/actions/workflows/')) return resp(200, { state: 'disabled_manually' });
    if (url.includes('github.io')) return resp(200, '<html>');
    if (url.includes('push.apple.com')) return resp(201, '');
    return resp(404, {});
  };
  const ctx = vm.createContext({
    Date: FakeDate, Math, JSON, Object, Array, String, Number, BigInt, RegExp, Error, Intl, console, encodeURIComponent,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => A.props[k] === undefined ? null : A.props[k],
      setProperty: (k, v) => { if (Buffer.byteLength(String(v)) > 9216) throw new Error('Argument too large: value (' + k + ')'); A.props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: k => A.cache[k] === undefined ? null : A.cache[k], put: (k, v) => { A.cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: n => { const b = { timeBased: () => b, everyMinutes: () => b, create: () => A.gatilhos.push(n) }; return b; } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => { const o = { texto: s, setMimeType: () => o }; return o; } },
    UrlFetchApp: { fetch: (u, o) => A.fetch(u, o), getRequest: () => ({}) },
    Utilities: {
      formatDate: fmt,
      newBlob: s => ({ getBytes: () => assinado(Buffer.from(s, 'utf8')) }),
      base64EncodeWebSafe: b => semSinal(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64DecodeWebSafe: s => assinado(Buffer.from(s.replace(/=+$/, ''), 'base64url')),
      computeDigest: (alg, b) => assinado(crypto.createHash('sha256').update(semSinal(b)).digest()),
      computeHmacSignature: (alg, v, k) => assinado(crypto.createHmac('sha256', semSinal(k)).update(semSinal(v)).digest()),
      DigestAlgorithm: { SHA_256: 'sha256' }, MacAlgorithm: { HMAC_SHA_256: 'hmac' },
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Codigo.gs'), 'utf8'), ctx);
  A.run = e => vm.runInContext(e, ctx);
  A.get = p => JSON.parse(A.run(`doGet({ parameter: ${JSON.stringify(p)} })`).texto);
  A.post = (k, corpo) => JSON.parse(A.run(`doPost({ parameter: { k: ${JSON.stringify(k)} }, postData: { contents: ${JSON.stringify(JSON.stringify(corpo))} } })`).texto);
  A.horas = h => { A.ms += h * 36e5; };
  return A;
}

// ---------------------------------------------------------------------------------------------
grupo('1. Assinatura das notificações (ES256)');
{
  const A = ambiente();
  for (let i = 0; i < 5; i++) {
    const jwt = A.run(`jwtVapid_('https://web.push.apple.com')`);
    const [h, c, s] = jwt.split('.');
    const valido = crypto.verify('sha256', Buffer.from(h + '.' + c), { key: A.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
    t('JWT ' + (i + 1) + ' tem assinatura válida', valido, jwt);
    const claims = JSON.parse(Buffer.from(c, 'base64url'));
    t('claims: aud, exp em 12h, sub', claims.aud === 'https://web.push.apple.com' && claims.exp - Math.floor(A.ms / 1000) === 43200 && /^https:/.test(claims.sub), claims);
    A.horas(0.001); A.cache = {};
  }
  t('multiplicação da curva: 1·G = G', A.run('multiplicar_(1n)[0] === P256.gx && multiplicar_(1n)[1] === P256.gy'));
  const pubCalc = A.run(`(() => { const d = bytesParaBig_(Utilities.base64DecodeWebSafe(PropertiesService.getScriptProperties().getProperty('VAPID_D'))); const [x, y] = multiplicar_(d); return Utilities.base64EncodeWebSafe([4].concat(bigParaBytes_(x, 32), bigParaBytes_(y, 32))).replace(/=+$/, ''); })()`);
  t('chave pública calculada = chave pública do Node', pubCalc === A.props.VAPID_PUB, [pubCalc, A.props.VAPID_PUB]);
}

// ---------------------------------------------------------------------------------------------
grupo('2. Conferência dos projetos');
{
  const A = ambiente();
  A.run('verificar()');
  const e = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' });
  const por = id => e.projetos.find(p => p.id === id);
  t('5 projetos no estado', e.projetos.length === 5, e.projetos.map(p => p.id));
  t('assistente ok, com o dinheiro junto', por('assistente').status === 'ok' && por('assistente').extra && por('assistente').extra.livre === -333, por('assistente'));
  t('painel no ar', por('painel').status === 'ok');
  t('Caçador aparece como pausado', por('cacador').status === 'pausado', por('cacador'));
  t('Gabinete sem endereço pede configuração', por('gabinete').status === 'config', por('gabinete'));
  t('bot de atrasos sem batida: aguardando', por('atrasos').status === 'aguardando', por('atrasos'));
  t('nenhum aviso na primeira conferência', e.avisos.length === 0, e.avisos);
}
{
  const A = ambiente({ agora: '2026-10-21T17:30:00-03:00' });            // quarta, depois de 16:30 + 45 min
  A.run('verificar()');
  const p = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(x => x.id === 'atrasos');
  t('quarta 17:30 sem batida: atenção "não rodou hoje"', p.status === 'atencao' && /Não rodou hoje/.test(p.detalhe), p);
  A.post('BATIDA1234567890ABCDE', { tipo: 'batida', projeto: 'atrasos', ok: true, detalhe: '12 atrasos' });
  A.run('verificar()');
  const e2 = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' });
  const p2 = e2.projetos.find(x => x.id === 'atrasos');
  t('depois da batida: ok "rodou hoje"', p2.status === 'ok' && /Rodou hoje/.test(p2.detalhe), p2);
  t('virou aviso "voltou ao normal"', e2.avisos.some(a => /voltou/.test(a.titulo)), e2.avisos);
  A.horas(0.2); A.post('BATIDA1234567890ABCDE', { tipo: 'batida', projeto: 'atrasos', ok: false, detalhe: 'site da empresa fora' });
  A.run('verificar()');
  const p3 = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(x => x.id === 'atrasos');
  t('batida com falha: erro com o motivo', p3.status === 'erro' && /site da empresa fora/.test(p3.detalhe), p3);
}
{
  const A = ambiente({ agora: '2026-10-24T18:00:00-03:00' });             // sábado
  A.run('verificar()');
  const p = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(x => x.id === 'atrasos');
  t('sábado: não cobra o bot de atrasos', p.status !== 'erro', p);
}
{
  let fora = false;
  const A = ambiente({ respostas: { 'acao=saude': () => fora ? { getResponseCode: () => 500, getContentText: () => '' } : { getResponseCode: () => 200, getContentText: () => '{"ok":true,"horasRotina":1,"horasLeitura":2}' } } });
  A.run('verificar()');
  fora = true; A.run('verificar()');
  let s = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(x => x.id === 'assistente').status;
  t('1ª falha do assistente: ainda não alarma', s === 'ok', s);
  A.run('verificar()');
  const e = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' });
  s = e.projetos.find(x => x.id === 'assistente').status;
  t('2ª falha seguida: erro e aviso urgente', s === 'erro' && e.avisos.some(a => a.nivel === 'urgente' && /Assistente/.test(a.titulo)), [s, e.avisos]);
  fora = false; A.run('verificar()');
  t('voltou: aviso de recuperação', A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).avisos[0].nivel === 'ok');
}
{
  const A = ambiente({ respostas: { 'acao=saude': [200, { ok: true, horasRotina: 20, horasLeitura: 3 }] } });
  A.run('verificar()');
  const p = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(x => x.id === 'assistente');
  t('rotina parada há 20h: atenção', p.status === 'atencao' && /20h/.test(p.detalhe), p);
}
{
  const A = ambiente({ respostas: { '/runs?per_page=1': [200, { workflow_runs: [{ status: 'completed', updated_at: new Date(Date.parse('2026-10-21T10:00:00-03:00') - 9 * 36e5).toISOString() }] }], '/actions/workflows/': [200, { state: 'active' }] } });
  A.run('verificar()');
  const p = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(x => x.id === 'cacador');
  t('Caçador ativo mas parado há 9h: erro', p.status === 'erro' && /9h/.test(p.detalhe), p);
  const n = A.chamadas.filter(c => c.url.includes('api.github.com')).length;
  A.horas(0.2); A.run('verificar()');
  t('GitHub consultado no máximo 1x por hora', A.chamadas.filter(c => c.url.includes('api.github.com')).length === n);
}
{
  const A = ambiente({ respostas: { '/actions/workflows/': [403, { message: 'rate limit' }] } });
  A.run('verificar()');
  const p = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(x => x.id === 'cacador');
  t('GitHub no limite: não inventa erro', p.status !== 'erro', p);
}

// ---------------------------------------------------------------------------------------------
grupo('3. Notificações');
{
  const A = ambiente();
  t('inscrição só com https', A.post('LEITURA1234567890ABCD', { tipo: 'inscrever', inscricao: { endpoint: 'http://x' } }).ok === false);
  t('inscrição do iPhone', A.post('LEITURA1234567890ABCD', { tipo: 'inscrever', inscricao: { endpoint: 'https://web.push.apple.com/QABC' }, aparelho: 'iPhone' }).total === 1);
  t('mesma inscrição não duplica', A.post('LEITURA1234567890ABCD', { tipo: 'inscrever', inscricao: { endpoint: 'https://web.push.apple.com/QABC' } }).total === 1);
  const r = A.post('LEITURA1234567890ABCD', { tipo: 'teste' });
  t('teste: 1 notificação enviada', r.ok && r.enviados === 1, r);
  const push = A.chamadas.filter(c => c.url.includes('push.apple.com')).pop();
  t('push com cabeçalho VAPID, TTL e corpo vazio', /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]{87}$/.test(push.op.headers.Authorization) && push.op.headers.TTL && push.op.payload === '', push.op.headers);
  const jwt = push.op.headers.Authorization.match(/t=([^,]+)/)[1].split('.');
  t('JWT do push: aud = origem do endpoint e assinatura válida',
    JSON.parse(Buffer.from(jwt[1], 'base64url')).aud === 'https://web.push.apple.com' &&
    crypto.verify('sha256', Buffer.from(jwt[0] + '.' + jwt[1]), { key: A.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(jwt[2], 'base64url')));
  const av = A.get({ k: 'LEITURA1234567890ABCD', acao: 'avisos', desde: '0' }).avisos;
  t('o app busca o texto do aviso depois do push', av.length === 1 && /teste/.test(av[0].titulo), av);
  t('"desde" filtra os já vistos', A.get({ k: 'LEITURA1234567890ABCD', acao: 'avisos', desde: String(av[0].id) }).avisos.length === 0);
  A.respostas['push.apple.com'] = [410, ''];
  A.post('LEITURA1234567890ABCD', { tipo: 'teste' });
  t('inscrição expirada (410) é removida', JSON.parse(A.props.push).length === 0);
}
{
  const A = ambiente();
  A.post('LEITURA1234567890ABCD', { tipo: 'inscrever', inscricao: { endpoint: 'https://web.push.apple.com/QABC' } });
  const r = A.post('AVISO1234567890ABCDEFG', { tipo: 'aviso', projeto: 'assistente', nivel: 'urgente', titulo: '🚨 Fatura vencida', texto: 'R$ 403', url: 'https://caioaprat.github.io/Meu_dinheiro/' });
  t('aviso de outro projeto vira notificação', r.ok && r.push.enviados === 1, r);
  t('aviso guarda o link para abrir', A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).avisos[0].url.includes('Meu_dinheiro'));
  const longo = 'x'.repeat(590);
  for (let i = 0; i < 70; i++) A.run(`registrarAviso_({ titulo: 'Aviso ${i} com texto', texto: '${longo}', url: 'https://caioaprat.github.io/Meu_dinheiro/' })`);
  t('avisos grandes: nunca passa do limite de 9 KB do Google', Buffer.byteLength(A.props.avisos) <= 8000 && JSON.parse(A.props.avisos).length >= 5, [Buffer.byteLength(A.props.avisos), JSON.parse(A.props.avisos).length]);
  t('ids dos avisos continuam subindo', JSON.parse(A.props.avisos)[0].id === 71, JSON.parse(A.props.avisos)[0].id);
  A.run(`registrarAviso_({ titulo: 'golpe', url: 'https://site-falso.com/login' })`);
  t('aviso com link de fora não guarda o link', JSON.parse(A.props.avisos)[0].url === '');
}

// ---------------------------------------------------------------------------------------------
grupo('4. Permissões');
{
  const A = ambiente();
  t('sem chave: só "Jarvis ✅"', A.run(`doGet({ parameter: { acao: 'estado' } })`).texto === 'Jarvis ✅');
  t('saúde e chave pública são públicas', A.get({ acao: 'saude' }).ok === true && A.get({ acao: 'vapid' }).chave === A.props.VAPID_PUB);
  t('leitura não administra', A.get({ k: 'LEITURA1234567890ABCD', acao: 'verificar' }).ok === false && A.get({ k: 'LEITURA1234567890ABCD', acao: 'log' }).ok === false);
  t('chave de batida não lê o estado', A.get({ k: 'BATIDA1234567890ABCDE', acao: 'estado' }).ok === false);
  t('chave de batida não inscreve aparelho', A.post('BATIDA1234567890ABCDE', { tipo: 'inscrever', inscricao: { endpoint: 'https://web.push.apple.com/QX' } }).ok === false);
  t('chave de batida NÃO manda aviso (só a do assistente)', A.post('BATIDA1234567890ABCDE', { tipo: 'aviso', titulo: 'golpe' }).ok === false && A.post('AVISO1234567890ABCDEFG', { tipo: 'aviso', titulo: 'ok' }).ok === true);
  t('chave inválida responde JSON (o app mostra "acesso recusado")', A.get({ k: 'ERRADA', acao: 'estado' }).erro === 'chave inválida');
  t('inscrição só em servidor de push conhecido', A.post('LEITURA1234567890ABCD', { tipo: 'inscrever', inscricao: { endpoint: 'https://atacante.com/x' } }).ok === false);
  t('leitura não manda batida nem aviso', A.post('LEITURA1234567890ABCD', { tipo: 'batida', projeto: 'atrasos' }).ok === false && A.post('LEITURA1234567890ABCD', { tipo: 'aviso', titulo: 'x' }).ok === false);
  t('batida de projeto desconhecido é recusada', A.post('BATIDA1234567890ABCDE', { tipo: 'batida', projeto: 'xyz' }).ok === false);
  t('chave errada é recusada', A.post('ERRADA', { tipo: 'teste' }).ok === false);
  t('definir só aceita propriedades conhecidas', A.get({ k: 'ADMIN1234567890ABCDEF', acao: 'definir', prop: 'CHAVE', valor: 'x' }).ok === false &&
    A.get({ k: 'ADMIN1234567890ABCDEF', acao: 'definir', prop: 'GABINETE_URL', valor: 'https://g.vercel.app' }).ok === true);
  t('definir valida o valor (URL do assistente)', A.get({ k: 'ADMIN1234567890ABCDEF', acao: 'definir', prop: 'ASSISTENTE_URL', valor: 'https://malvado.com/x' }).ok === false);
  t('instalar cria o gatilho de 10 min', (() => { A.run('instalar()'); return A.gatilhos.includes('verificar'); })());
}

// ---------------------------------------------------------------------------------------------
grupo('5. Alarmes falsos e limites');
{
  const A = ambiente({ agora: '2026-10-20T10:00:00-03:00' });            // terça: rodou
  A.post('BATIDA1234567890ABCDE', { tipo: 'batida', projeto: 'atrasos', ok: true });
  A.run('verificar()');
  A.ms = new Date('2026-10-21T17:30:00-03:00').getTime(); A.run('verificar()');   // quarta não rodou
  A.ms = new Date('2026-10-22T00:05:00-03:00').getTime(); A.run('verificar()');   // virou o dia
  const e = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' });
  t('meia-noite não manda "voltou ao normal" falso', !e.avisos.some(a => /voltou/.test(a.titulo)), e.avisos.map(a => a.titulo));
  A.get({ k: 'ADMIN1234567890ABCDEF', acao: 'definir', prop: 'ATRASOS_PAUSA_ATE', valor: '2026-10-30' });
  A.ms = new Date('2026-10-22T17:30:00-03:00').getTime(); A.run('verificar()');
  t('feriado/férias: pausa até a data, sem alarme', A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(p => p.id === 'atrasos').status === 'pausado');
}
{
  const A = ambiente({ respostas: { '/runs?per_page=1': [200, { workflow_runs: [{ status: 'completed', updated_at: new Date(Date.parse('2026-10-21T10:00:00-03:00') - 600000).toISOString() }] }], '/actions/workflows/': [200, { state: 'active' }] } });
  A.run('verificar()');
  A.respostas['/actions/workflows/'] = [0, ''];
  A.horas(1.1); A.run('verificar()');
  const p = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(x => x.id === 'cacador');
  t('GitHub sem rede: mantém o status anterior, sem alarme', p.status === 'ok' && !!p.semDadosDesde, p);
}
{
  const A = ambiente();
  for (let i = 0; i < 30; i++) {                                     // estado com muitas mudanças não estoura
    A.respostas['github.io'] = i % 4 < 2 ? [500, ''] : [200, '<html>'];
    A.run('verificar()'); A.horas(0.2);
  }
  t('estado de cada projeto cabe numa Script Property', Object.keys(A.props).filter(k => k.startsWith('estado:')).every(k => Buffer.byteLength(A.props[k]) < 9216));
  t('histórico guarda só as 5 últimas mudanças', JSON.parse(A.props['estado:painel']).historico.length <= 5, JSON.parse(A.props['estado:painel']).historico.length);
  const muito = 'y'.repeat(300);
  for (let i = 0; i < 100; i++) A.run(`log_('erro', '${muito}')`);
  t('log não estoura', Buffer.byteLength(A.props.log) <= 8000);
}
{
  const A = ambiente();
  A.post('LEITURA1234567890ABCD', { tipo: 'inscrever', inscricao: { endpoint: 'https://web.push.apple.com/QABC' } });
  A.post('LEITURA1234567890ABCD', { tipo: 'teste' }); A.post('LEITURA1234567890ABCD', { tipo: 'teste' });
  const jwts = A.chamadas.filter(c => c.url.includes('push.apple.com')).map(c => c.op.headers.Authorization);
  t('assinatura reaproveitada (cache) entre envios', jwts.length === 2 && jwts[0] === jwts[1]);
}

console.log(`\n${ok} verificações passaram, ${falhas} falharam.`);
process.exit(falhas ? 1 : 0);
