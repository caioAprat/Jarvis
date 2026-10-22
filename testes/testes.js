// Rodar: node jarvis/testes/testes.js
// Confere o Jarvis no simulador do Apps Script (simulador.js).
const crypto = require('crypto');
const { ambiente } = require('./simulador');

let ok = 0, falhas = 0;
function t(nome, cond, detalhe) {
  if (cond) ok++; else { falhas++; console.log('  ✗ FALHOU: ' + nome + (detalhe !== undefined ? '  → ' + JSON.stringify(detalhe).slice(0, 400) : '')); }
}
function grupo(n) { console.log(String.fromCharCode(10) + '== ' + n); }

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
  t('6 projetos no estado (com a planilha)', e.projetos.length === 6, e.projetos.map(p => p.id));
  t('assistente ok, com o dinheiro junto', por('assistente').status === 'ok' && por('assistente').extra && por('assistente').extra.livre === -333, por('assistente'));
  t('painel no ar', por('painel').status === 'ok');
  t('Caçador aparece como pausado', por('cacador').status === 'pausado', por('cacador'));
  t('Gabinete: site do sistema no ar (sem dados do banco ainda)', por('gabinete').status === 'ok' && por('gabinete').detalhe === 'No ar', por('gabinete'));
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

// ---------------------------------------------------------------------------------------------
grupo('6. Gabinete (o mais importante)');
{
  const A = ambiente();
  A.get({ k: 'ADMIN1234567890ABCDEF', acao: 'definir', prop: 'GABINETE_SUPABASE_URL', valor: 'https://abcdefgh.supabase.co' });
  A.get({ k: 'ADMIN1234567890ABCDEF', acao: 'definir', prop: 'GABINETE_SUPABASE_KEY', valor: 'sb_publishable_teste' });
  t('chave secreta do Supabase é recusada (só a pública)', A.get({ k: 'ADMIN1234567890ABCDEF', acao: 'definir', prop: 'GABINETE_SUPABASE_KEY', valor: 'sb_secret_xyz' }).ok === false);
  A.run('verificar()');
  const g = () => A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(p => p.id === 'gabinete');
  t('site + banco no ar', g().status === 'ok' && /banco de dados no ar/.test(g().detalhe), g());
  A.respostas['supabase.co/auth/v1/health'] = [503, {}];
  A.run('verificar()'); A.run('verificar()');
  const e = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' });
  t('banco pausado: erro e aviso urgente com 🚨', g().status === 'erro' && /Supabase/.test(g().detalhe) && e.avisos.some(a => a.nivel === 'urgente' && /^🚨 🏛️ Gabinete/.test(a.titulo)), [g(), e.avisos.map(a => a.titulo)]);
  delete A.respostas['supabase.co/auth/v1/health'];
  A.respostas['gabinete-chamados.vercel.app'] = [200, '<html>Application error</html>'];
  A.run('verificar()');
  t('site abre mas não é o sistema: continua erro', g().status === 'erro' && /não mostra o sistema/.test(g().detalhe), g());
}

// ---------------------------------------------------------------------------------------------
grupo('7. Planilha J Hissnauer pelo registro de execuções');
const exec = (minAtras, status, seg, f, base) => ({ functionName: f || 'onEdit', processStatus: status, duration: seg + 's',
  startTime: new Date(new Date(base || '2026-10-21T10:00:00-03:00').getTime() - minAtras * 60000).toISOString() });
const planilha = A => A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).projetos.find(p => p.id === 'planilha');
{
  const lista = []; for (let i = 1; i <= 30; i++) lista.push(exec(i * 2, 'COMPLETED', 1.5));
  const A = ambiente({ execucoes: lista });
  A.run('verificar()');
  t('uso normal: ok com o resumo da última hora', planilha(A).status === 'ok' && /30 execuções na última hora · 0 com problema/.test(planilha(A).detalhe), planilha(A));
}
{
  const A = ambiente();
  A.run('verificar()');                                            // antes: tudo normal
  const lista = []; for (let i = 1; i <= 12; i++) lista.push(exec(i * 4, i <= 6 ? 'TIMED_OUT' : 'COMPLETED', i <= 6 ? 30 : 2));
  A.execucoes = lista;
  A.run('verificar()'); A.run('verificar()');
  const e = A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' });
  t('6 de 12 travaram: erro (2ª conferência) e aviso urgente', planilha(A).status === 'erro' && /6 de 12/.test(planilha(A).detalhe) && /passaram do tempo/.test(planilha(A).detalhe), planilha(A));
  t('aviso da planilha é urgente', e.avisos.some(a => a.nivel === 'urgente' && /Planilha J Hissnauer/.test(a.titulo)), e.avisos.map(a => a.titulo));
}
{
  const dez = n => [...Array(10)].map((_, i) => exec(2 + i, i < n ? 'FAILED' : 'COMPLETED', 1));
  const A = ambiente({ execucoes: dez(2) });
  A.run('verificar()');
  t('2 falhas em 10: ainda ok (erros normais acontecem)', planilha(A).status === 'ok', planilha(A));
  A.execucoes = dez(3); A.run('verificar()');
  t('3 falhas em 10, 1ª conferência: espera confirmar', planilha(A).status === 'ok', planilha(A));
  A.run('verificar()');
  t('3 falhas em 10, 2ª conferência: atenção (não erro)', planilha(A).status === 'atencao', planilha(A));
  t('fora da semana de observação: atenção vira notificação', A.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).avisos.some(a => /Planilha/.test(a.titulo) && a.nivel === 'atencao'));
  const B = ambiente({ execucoes: dez(2) });
  B.run('instalar()');
  B.execucoes = dez(3); B.run('verificar()'); B.run('verificar()');
  t('1ª semana depois de instalar: atenção da planilha não vira notificação (calibragem)', planilha(B).status === 'atencao' && !B.get({ k: 'LEITURA1234567890ABCD', acao: 'estado' }).avisos.some(a => /Planilha/.test(a.titulo)));
}
{
  const A = ambiente({ agora: '2026-10-21T14:00:00-03:00', execucoes: [exec(300, 'COMPLETED', 1, 'onEdit', '2026-10-21T14:00:00-03:00')] });
  A.run('verificar()');
  t('quarta 14h sem execução há horas: só informa (aguardando), sem alarme', planilha(A).status === 'aguardando' && /Nenhuma execução há \d+h/.test(planilha(A).detalhe), planilha(A));
  const B = ambiente({ agora: '2026-10-21T08:30:00-03:00', execucoes: [] });
  B.run('verificar()');
  t('8h30 sem execução: ainda ok (conta desde as 7h)', planilha(B).status === 'ok', planilha(B));
  const C = ambiente({ agora: '2026-10-25T15:00:00-03:00', execucoes: [] });
  C.run('verificar()');
  t('domingo sem uso: aguardando, sem alarme', planilha(C).status === 'aguardando', planilha(C));
}
{
  const A = ambiente(); A.semPermissaoExecucoes = true;
  A.run('verificar()');
  A.run('verificar()');
  t('perdeu o acesso ao registro: atenção (nunca um "ok" parado)', planilha(A).status === 'atencao' && /instalar/.test(planilha(A).detalhe), planilha(A));
  const B = ambiente(); B.respostas['processes:listScriptProcesses'] = [403, 'Apps Script API has not been used in project 123 before or it is disabled'];
  B.run('verificar()'); B.run('verificar()');
  t('API não ativada no projeto: diz isso claramente', planilha(B).status === 'atencao' && /não está ativa/.test(planilha(B).detalhe), planilha(B));
  const C = ambiente(); C.run('verificar()'); C.respostas['processes:listScriptProcesses'] = [500, 'erro'];
  C.horas(1); C.run('verificar()');
  t('1h sem dados: mantém o último estado', planilha(C).status === 'ok');
  C.horas(1);
  C.horas(1.2); C.run('verificar()'); C.run('verificar()'); C.run('verificar()');
  t('cliente 2h+ sem dados: atenção "não consigo conferir"', planilha(C).status === 'atencao' && /Não consigo conferir há 2h/.test(planilha(C).detalhe), planilha(C));
}
{
  const lista = [exec(20, 'COMPLETED', 12), exec(25, 'TIMED_OUT', 30, 'aoEditarPrincipal'), exec(30, 'COMPLETED', 1), exec(5, 'COMPLETED', 1)];
  const A = ambiente({ execucoes: lista });
  A.run('verificar()'); A.run('verificar()');
  const ex = JSON.parse(A.props['execs:planilha']);
  t('números do dia: conta só as assentadas (15+ min) e só uma vez', ex.dias[0].total === 3 && ex.dias[0].travadas === 1 && ex.dias[0].lentas === 2, ex.dias);
  t('guarda o problema com função e duração', ex.problemas[0].f === 'aoEditarPrincipal' && ex.problemas[0].s === 'travou' && ex.problemas[0].seg === 30, ex.problemas);
}

// ---------------------------------------------------------------------------------------------
grupo('8. Rotina diária (3h): código, cópia, tamanho, Supabase');
const ADM_K = 'ADMIN1234567890ABCDEF';
{
  const Z = ambiente(); Z.run('diario()');
  t('cópia da planilha vem DESLIGADA (até o cliente concordar)', JSON.parse(Z.props.diario).relatorio['planilha.copia'].pulado === true);
  const A = ambiente();
  A.get({ k: 'ADMIN1234567890ABCDEF', acao: 'definir', prop: 'GABINETE_SUPABASE_URL', valor: 'https://abcdefgh.supabase.co' });
  A.get({ k: 'ADMIN1234567890ABCDEF', acao: 'definir', prop: 'GABINETE_SUPABASE_KEY', valor: 'sb_publishable_teste' });
  A.get({ k: ADM_K, acao: 'definir', prop: 'BACKUP_PLANILHA', valor: 'sim' });
  const r1 = A.run('diario()');
  t('1º dia: guarda o código sem avisar', r1['planilha.codigo'].mudou === true && !JSON.parse(A.props.avisos || '[]').some(a => /código/.test(a.titulo)), r1);
  t('1º dia: cópia da planilha na pasta "Jarvis — backups"', Object.values(A.drive).some(p => p.nome === 'Jarvis — backups' && p.arquivos.some(x => /Backup Planilha J Hissnauer/.test(x.n))));
  t('tamanho medido (390 mil células = 3,9%)', JSON.parse(A.props['tamanho:planilha']).pct === 3.9, A.props['tamanho:planilha']);
  t('Supabase recebe a consulta diária', A.chamadas.some(c => c.url.includes('/rest/v1/')));
  A.codigoPlanilha = 'function onEdit(e){ mudou(); }';
  A.horas(24); A.run('diario()');
  t('código mudou: aviso e nova cópia do código', JSON.parse(A.props.avisos).some(a => /O código da Planilha J Hissnauer mudou/.test(a.titulo)));
  A.run('diario()');
  t('no máximo uma cópia por dia', JSON.parse(A.props.diario).relatorio['planilha.copia'].jaFeita === true);
  for (let i = 0; i < 8; i++) { A.horas(24); A.run('diario()'); }
  t('mantém 7 cópias da planilha (as velhas vão para a lixeira)', JSON.parse(A.props['copias:planilha']).length === 7 && A.lixeira.length >= 3, [JSON.parse(A.props['copias:planilha']).length, A.lixeira.length]);
  A.abasPlanilha = [{ nome: 'GIGANTE', linhas: 100000, colunas: 85 }];
  A.run('diario()');
  t('85% do limite de células: aviso', JSON.parse(A.props.avisos).some(a => /85% do limite de células/.test(a.titulo)));
  A.get({ k: 'ADMIN1234567890ABCDEF', acao: 'definir', prop: 'BACKUP_PLANILHA', valor: 'nao' });
  const antes = A.lixeira.length; A.run('diario()');
  t('backup da planilha pode ser desligado', JSON.parse(A.props.diario).relatorio['planilha.copia'].pulado === true && A.lixeira.length === antes);
}

// ---------------------------------------------------------------------------------------------
grupo('9. Central do PC');
{
  const A = ambiente();
  A.run('verificar()');
  const pc = A.get({ k: 'PC1234567890ABCDEFGHIJKLMNO', acao: 'pc' });
  t('PC recebe o painel completo', pc.ok && pc.estado.projetos.length === 6 && pc.mapa.some(m => m.id === 'jarvis') && pc.detalhes.planilha.planilha, pc);
  t('mapa diz pasta, repositório e como publicar', pc.mapa.find(m => m.id === 'planilha').pasta === 'C:\\Plan_SHEETS' && /colar no editor/.test(pc.mapa.find(m => m.id === 'planilha').publicar));
  t('celular (leitura) NÃO abre o painel do PC', A.get({ k: 'LEITURA1234567890ABCD', acao: 'pc' }).ok !== true);
  const v = A.get({ k: 'PC1234567890ABCDEFGHIJKLMNO', acao: 'versoes', app: 'assistente' });
  t('versões do assistente, com a atual', v.ok && v.atual === 16 && v.versoes[0].numero === 16, v);
  t('voltar versão exige confirmar', A.post('PC1234567890ABCDEFGHIJKLMNO', { tipo: 'voltar-versao', app: 'assistente', versao: 15 }).ok === false);
  t('o Jarvis não volta a própria versão (não tranca a central)', A.post('PC1234567890ABCDEFGHIJKLMNO', { tipo: 'voltar-versao', app: 'jarvis', versao: 15, confirmacao: 'VOLTAR' }).ok === false);
  t('Gabinete com tempo de resposta do site', typeof A.get({ k: 'PC1234567890ABCDEFGHIJKLMNO', acao: 'pc' }).detalhes.gabinete.ms.site === 'number');
  const vv = A.post('PC1234567890ABCDEFGHIJKLMNO', { tipo: 'voltar-versao', app: 'assistente', versao: 15, confirmacao: 'VOLTAR' });
  t('voltar para a 15: ok, avisa e registra', vv.ok && vv.antes === 16 && A.deployVersao === 15 && JSON.parse(A.props.avisos)[0].titulo.includes('voltou para a versão 15'), vv);
  t('versão inexistente é recusada', A.post('PC1234567890ABCDEFGHIJKLMNO', { tipo: 'voltar-versao', app: 'assistente', versao: 99, confirmacao: 'VOLTAR' }).ok === false);
  t('celular NÃO volta versão', A.post('LEITURA1234567890ABCD', { tipo: 'voltar-versao', app: 'assistente', versao: 15, confirmacao: 'VOLTAR' }).ok === false);
  const cfg = A.get({ k: 'PC1234567890ABCDEFGHIJKLMNO', acao: 'assistente-config' });
  t('configurações do assistente pela chave de operador', cfg.ok && cfg.itens[0].item === 'Prazo da faculdade' && A.chamadas.some(c => c.url.includes('k=OPERADOR1234567890ABCDEFG')));
  t('muda configuração do assistente', A.post('PC1234567890ABCDEFGHIJKLMNO', { tipo: 'assistente-definir', item: 'Prazo da faculdade', valor: '2026-12-30' }).ok);
  const pub = A.get({ k: 'PC1234567890ABCDEFGHIJKLMNO', acao: 'publicacoes' });
  t('publicações: repositório privado pede token', pub.github.find(g => g.repo === 'caioAprat/assistente_dinheiro').erro.includes('token') && pub.github.find(g => g.repo === 'caioAprat/Jarvis').runs.length === 1, pub.github);
  t('token do GitHub só com formato certo', A.post('PC1234567890ABCDEFGHIJKLMNO', { tipo: 'definir-pc', prop: 'GITHUB_TOKEN', valor: 'abc' }).ok === false &&
    A.post('PC1234567890ABCDEFGHIJKLMNO', { tipo: 'definir-pc', prop: 'GITHUB_TOKEN', valor: 'github_pat_ABC123' }).ok === true);
  t('PC não pode trocar chaves pelo definir-pc', A.post('PC1234567890ABCDEFGHIJKLMNO', { tipo: 'definir-pc', prop: 'CHAVE', valor: 'x' }).ok === false);
}

// ---------------------------------------------------------------------------------------------
grupo('10. Pedidos');
{
  const A = ambiente();
  const pc = 'PC1234567890ABCDEFGHIJKLMNO', adm = 'ADMIN1234567890ABCDEF';
  t('pedido sem título é recusado', A.post(pc, { tipo: 'pedido', projeto: 'gabinete', titulo: '' }).ok === false);
  t('projeto desconhecido é recusado', A.post(pc, { tipo: 'pedido', projeto: 'xyz', titulo: 'teste' }).ok === false);
  const r = A.post(pc, { tipo: 'pedido', projeto: 'gabinete', titulo: 'Relatório mensal de chamados', texto: 'PDF por bairro', prioridade: 'alta' });
  t('pedido criado com id e status novo', r.ok && r.pedido.id === 1 && r.pedido.status === 'novo' && r.pedido.prioridade === 'alta', r);
  A.post(pc, { tipo: 'pedido', projeto: 'planilha', titulo: 'Botão de PDF da baixa' });
  t('lista do mais novo para o mais velho', A.get({ k: pc, acao: 'pedidos' }).pedidos.map(p => p.id).join() === '2,1');
  t('PC não marca como feito (só o Claude Code)', A.post(pc, { tipo: 'pedido-status', id: 1, status: 'feito' }).ok === false);
  t('PC pode cancelar', A.post(pc, { tipo: 'pedido-status', id: 2, status: 'cancelado' }).ok);
  const f = A.post(adm, { tipo: 'pedido-status', id: 1, status: 'feito', resposta: 'Feito em C:\\Gabinete_chamados (src/app/relatorio), publicado na Vercel.' });
  t('admin marca feito com resposta e vira notificação', f.ok && JSON.parse(A.props.avisos)[0].titulo.includes('Pedido #1 feito'), f);
  t('celular não cria pedido', A.post('LEITURA1234567890ABCD', { tipo: 'pedido', projeto: 'gabinete', titulo: 'x y z' }).ok === false);
}

// ---------------------------------------------------------------------------------------------
grupo('11. Ações rápidas do celular e disponibilidade');
{
  const A = ambiente();
  const L = 'LEITURA1234567890ABCD';
  A.respostas['k=LEIT'] = (url, op) => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ ok: true, aviso: '✓ Banco lido agora' }) });
  const lb = A.post(L, { tipo: 'lerbanco' });
  t('"Ler o banco agora" chama o assistente', lb.ok && /Banco lido/.test(lb.aviso) && A.chamadas.some(c => c.op && c.op.method === 'post' && /sync/.test(c.op.payload || '')), lb);
  t('pausar o bot de atrasos até uma data', A.post(L, { tipo: 'pausar', ate: '2026-10-30' }).ok && A.props.ATRASOS_PAUSA_ATE === '2026-10-30');
  t('pausa com data no passado é recusada', A.post(L, { tipo: 'pausar', ate: '2026-10-01' }).ok === false);
  t('pausa de mais de 60 dias é recusada', A.post(L, { tipo: 'pausar', ate: '2027-03-01' }).ok === false);
  t('retomar (data vazia)', A.post(L, { tipo: 'pausar', ate: '' }).ok && A.props.ATRASOS_PAUSA_ATE === '');
  A.post(L, { tipo: 'vistos', ate: 7 });
  t('avisos vistos até o 7', A.get({ k: L, acao: 'estado' }).avisosVistosAte === 7);
  A.post(L, { tipo: 'vistos', ate: 3 });
  t('"vistos" nunca volta para trás', A.get({ k: L, acao: 'estado' }).avisosVistosAte === 7);
  A.respostas['github.io'] = [500, ''];
  for (let i = 0; i < 4; i++) { A.run('verificar()'); A.horas(0.2); }
  delete A.respostas['github.io'];
  for (let i = 0; i < 4; i++) { A.run('verificar()'); A.horas(0.2); }
  const painel = A.get({ k: L, acao: 'estado' }).projetos.find(p => p.id === 'painel');
  t('disponibilidade do painel: 4 de 8 conferências fora do ar → 50%', painel.disp7 === 50, painel.disp7);
  t('Gabinete com 100% no ar', A.get({ k: L, acao: 'estado' }).projetos.find(p => p.id === 'gabinete').disp7 === 100);
}


// ---------------------------------------------------------------------------------------------
grupo('12. Correções da revisão (Jarvis v3)');
{
  const A = ambiente();
  const PC = 'PC1234567890ABCDEFGHIJKLMNO', ADM = 'ADMIN1234567890ABCDEF';
  A.versoesApi = [...Array(60)].map((_, i) => ({ versionNumber: i + 1, description: 'v' + (i + 1), createTime: '2026-10-01T10:00:00Z' }));
  A.deployVersao = 60;
  const pagina = A.respostas;
  pagina['/versions'] = (url) => {
    const tok = (url.match(/pageToken=([^&]+)/) || [])[1];
    const ini = tok ? Number(tok) : 0;
    const fatia = A.versoesApi.slice(ini, ini + 50);
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ versions: fatia, nextPageToken: ini + 50 < A.versoesApi.length ? String(ini + 50) : undefined }) };
  };
  const v = A.get({ k: PC, acao: 'versoes', app: 'assistente' });
  t('versões: lê todas as páginas (a 60, que está no ar, aparece)', v.ok && v.total === 60 && v.versoes[0].numero === 60 && v.atual === 60, v);
  delete pagina['/versions'];
  A.post(PC, { tipo: 'pedido', projeto: 'gabinete', titulo: 'Teste de push' });
  A.post('LEITURA1234567890ABCD', { tipo: 'inscrever', inscricao: { endpoint: 'https://web.push.apple.com/QXYZ' } });
  const antes = A.chamadas.filter(c => c.url.includes('push.apple.com')).length;
  A.post(ADM, { tipo: 'pedido-status', id: 1, status: 'feito', resposta: 'ok' });
  t('"pedido feito" manda notificação de verdade', A.chamadas.filter(c => c.url.includes('push.apple.com')).length === antes + 1);
  t('chave do PC não pode ser igual à do celular', A.get({ k: ADM, acao: 'definir', prop: 'CHAVE_PC', valor: 'LEITURA1234567890ABCD' }).ok === false);
  t('pausa com data que não existe é recusada', A.post('LEITURA1234567890ABCD', { tipo: 'pausar', ate: '2026-10-99' }).ok === false);
  A.post('LEITURA1234567890ABCD', { tipo: 'pausar', ate: '2026-10-25' });
  t('pausa vira aviso (não passa despercebida)', JSON.parse(A.props.avisos).some(a => /pausado até 25\/10/.test(a.titulo)));
  t('rotina da madrugada: no máximo 1x por hora pelo PC', A.post(PC, { tipo: 'diario-agora' }).ok === true && A.post(PC, { tipo: 'diario-agora' }).ok === false);
  A.respostas['k=LEIT'] = () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ ok: true, aviso: 'lido' }) });
  t('ler o banco: no máximo 1x a cada 5 min', A.post('LEITURA1234567890ABCD', { tipo: 'lerbanco' }).ok === true && A.post('LEITURA1234567890ABCD', { tipo: 'lerbanco' }).ok === false);
  t('versões sem projeto: erro claro', A.get({ k: PC, acao: 'versoes' }).ok === false);
}
{
  const A = ambiente();
  for (let i = 0; i < 52; i++) A.post('PC1234567890ABCDEFGHIJKLMNO', { tipo: 'pedido', projeto: 'gabinete', titulo: 'pedido ' + i });
  t('fila tem limite de 50 pedidos abertos', A.get({ k: 'PC1234567890ABCDEFGHIJKLMNO', acao: 'pedidos' }).pedidos.length === 50);
}
{
  const A = ambiente();
  A.respostas['github.io'] = [500, ''];
  A.run('verificar()');
  const d = JSON.parse(A.props['disp:painel']);
  t('disponibilidade conta a 1ª falha (mesmo em espera)', d[0].t === 1 && d[0].u === 0, d);
}

console.log(`\n${ok} verificações passaram, ${falhas} falharam.`);
process.exit(falhas ? 1 : 0);
