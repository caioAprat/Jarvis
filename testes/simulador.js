// Simulador do Apps Script para o Jarvis: Properties (com o limite de 9 KB), Cache, UrlFetch (respostas falsas),
// Drive, Planilha, APIs do Google e Utilities com a criptografia real do Node. Usado por testes.js.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');

const assinado = b => Array.from(b).map(x => (x > 127 ? x - 256 : x));
const semSinal = a => Buffer.from(a.map(x => x & 255));

function ambiente(opcoes = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jp = publicKey.export({ format: 'jwk' }), jk = privateKey.export({ format: 'jwk' });
  const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jp.x, 'base64url'), Buffer.from(jp.y, 'base64url')]).toString('base64url');
  const A = { ms: new Date(opcoes.agora || '2026-10-21T10:00:00-03:00').getTime(), props: {}, cache: {}, chamadas: [], gatilhos: [], publicKey,
              respostas: opcoes.respostas || {}, execucoes: opcoes.execucoes || [{ functionName: 'onEdit', processStatus: 'COMPLETED', startTime: new Date(new Date(opcoes.agora || '2026-10-21T10:00:00-03:00').getTime() - 300000).toISOString(), duration: '1.2s' }], drive: {}, lixeira: [], versoesApi: [
                { versionNumber: 14, description: 'v5', createTime: '2026-10-21T10:00:00Z' }, { versionNumber: 15, description: 'v5.1', createTime: '2026-10-22T10:00:00Z' },
                { versionNumber: 16, description: 'faculdade', createTime: '2026-10-22T13:00:00Z' }], deployVersao: 16, codigoPlanilha: 'function onEdit(e){}',
              abasPlanilha: [{ nome: 'PROGRAMACAO J HISSNAUER', linhas: 5000, colunas: 60 }, { nome: 'VIRA CHEIO', linhas: 3000, colunas: 30 }] };
  Object.assign(A.props, { CHAVE_PC: 'PC1234567890ABCDEFGHIJKLMNO', ASSISTENTE_OPERADOR: 'OPERADOR1234567890ABCDEFG', CHAVE: 'ADMIN1234567890ABCDEF', CHAVE_LEITURA: 'LEITURA1234567890ABCD', CHAVE_BATIDA: 'BATIDA1234567890ABCDE', CHAVE_AVISO: 'AVISO1234567890ABCDEFG',
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
    if (url.includes('pedalada-do-delei.caiofelix0709.workers.dev')) return resp(200, '<title>Pedalada do Delei</title>');
    if (url.includes('gabinete-chamados.vercel.app')) return resp(200, '<title>Entrar · Chamados do Gabinete</title>');
    if (url.includes('supabase.co/auth/v1/health')) return resp(op.headers && op.headers.apikey === 'sb_publishable_teste' ? 200 : 401, {});
    if (url.includes('push.apple.com')) return resp(201, '');
    if (url.includes('processes:listScriptProcesses')) {
      if (A.semPermissaoExecucoes) return resp(403, { error: { message: 'insufficient scopes' } });
      const ini = decodeURIComponent(url.match(/startTime=([^&]+)/)[1]);
      return resp(200, { processes: A.execucoes.filter(x => x.startTime >= ini).map(x => Object.assign({ processType: 'SIMPLE_TRIGGER' }, x)) });
    }
    if (/\/projects\/[^/]+\/content/.test(url)) return resp(200, { files: [{ name: 'Router', type: 'SERVER_JS', source: A.codigoPlanilha }] });
    if (/\/projects\/[^/]+\/versions/.test(url)) return resp(200, { versions: A.versoesApi });
    if (/\/projects\/[^/]+\/deployments\//.test(url)) {
      if (op.method === 'put') { A.deployVersao = JSON.parse(op.payload).deploymentConfig.versionNumber; A.ultimoPut = JSON.parse(op.payload); }
      return resp(200, { deploymentConfig: { versionNumber: A.deployVersao } });
    }
    if (url.includes('acao=config')) return resp(200, { ok: true, itens: [{ item: 'Prazo da faculdade', tipo: 'data', valor: '2026-12-30' }] });
    if (url.includes('acao=definir&item=')) return resp(200, { ok: true });
    if (url.includes('/rest/v1/')) return resp(200, {});
    if (url.includes('api.github.com/repos/') && url.includes('/actions/runs?per_page=3')) return url.includes('assistente_dinheiro') && !(op.headers && op.headers.Authorization)
      ? resp(404, {}) : resp(200, { workflow_runs: [{ name: 'Publicar', display_title: 'v5', status: 'completed', conclusion: 'success', updated_at: '2026-10-22T12:00:00Z', html_url: 'https://github.com/x' }] });
    return resp(404, {});
  };
  const ctx = vm.createContext({
    Date: FakeDate, Math, JSON, Object, Array, String, Number, BigInt, RegExp, Error, Intl, console, encodeURIComponent,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => A.props[k] === undefined ? null : A.props[k],
      setProperty: (k, v) => { if (Buffer.byteLength(String(v)) > 9216) throw new Error('Argument too large: value (' + k + ')'); A.props[k] = String(v); },
      getKeys: () => Object.keys(A.props) }) },
    CacheService: { getScriptCache: () => ({ get: k => A.cache[k] === undefined ? null : A.cache[k], put: (k, v) => { A.cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, getOAuthToken: () => 'TOKEN-GOOGLE', requireAllScopes() {}, AuthMode: { FULL: 'FULL' },
      newTrigger: n => { const b = { timeBased: () => b, everyMinutes: () => b, atHour: () => b, nearMinute: () => b, everyDays: () => b, inTimezone: () => b, create: () => A.gatilhos.push(n) }; return b; } },
    DriveApp: {
      getRootFolder: () => ({}),
      getFolderById: id => { if (!A.drive[id]) throw new Error('não existe'); return A.drive[id]; },
      createFolder: nome => { const id = 'pasta' + Object.keys(A.drive).length; const pasta = { id, nome, arquivos: [], getId: () => id,
        createFile: (n, conteudo) => { const fid = 'arq' + Math.random().toString(36).slice(2); pasta.arquivos.push({ n, conteudo }); return { getId: () => fid }; } };
        A.drive[id] = pasta; return pasta; },
      getFileById: id => ({ makeCopy: (nome, pasta) => { const cid = 'copia-' + nome; pasta.arquivos.push({ n: nome }); return { getId: () => cid }; },
                            setTrashed: () => { A.lixeira.push(id); } }),
    },
    SpreadsheetApp: { openById: () => ({ getSheets: () => A.abasPlanilha.map(a => ({ getName: () => a.nome, getMaxRows: () => a.linhas, getMaxColumns: () => a.colunas })) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => { const o = { texto: s, setMimeType: () => o }; return o; } },
    UrlFetchApp: { fetch: (u, o) => A.fetch(u, o), getRequest: () => ({}) },
    Logger: { log() {} },
    Utilities: {
      formatDate: fmt,
      newBlob: s => ({ getBytes: () => assinado(Buffer.from(s, 'utf8')) }),
      base64EncodeWebSafe: b => semSinal(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64DecodeWebSafe: s => assinado(Buffer.from(s.replace(/=+$/, ''), 'base64url')),
      computeDigest: (alg, b) => assinado(crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : semSinal(b)).digest()),
      computeHmacSignature: (alg, v, k) => assinado(crypto.createHmac('sha256', semSinal(k)).update(semSinal(v)).digest()),
      DigestAlgorithm: { SHA_256: 'sha256' }, MacAlgorithm: { HMAC_SHA_256: 'hmac' },
      base64Encode: b => semSinal(b).toString('base64'),
    },
  });
  const pasta = path.join(__dirname, '..', 'apps-script');
  fs.readdirSync(pasta).filter(n => n.endsWith('.gs')).sort().forEach(n => vm.runInContext(fs.readFileSync(path.join(pasta, n), 'utf8'), ctx, { filename: n }));
  A.run = e => vm.runInContext(e, ctx);
  A.get = p => JSON.parse(A.run(`doGet({ parameter: ${JSON.stringify(p)} })`).texto);
  A.post = (k, corpo) => JSON.parse(A.run(`doPost({ parameter: { k: ${JSON.stringify(k)} }, postData: { contents: ${JSON.stringify(JSON.stringify(corpo))} } })`).texto);
  A.horas = h => { A.ms += h * 36e5; };
  return A;
}


module.exports = { ambiente };
