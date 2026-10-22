// Gera testes/pc-exemplo.json: o painel do PC com dados realistas, produzido pelo código do servidor no simulador.
// Uso: node jarvis/testes/exemplo-pc.js   (para ver a central do PC sem mexer no Jarvis de verdade)
const fs = require('fs');
const path = require('path');
const { ambiente } = require('./simulador');

const base = Date.parse('2026-10-21T10:00:00-03:00');
const exec = (min, st, seg, f) => ({ functionName: f || 'onEdit', processStatus: st, duration: seg + 's', startTime: new Date(base - min * 60000).toISOString() });
const lista = [];
for (let i = 1; i <= 40; i++) lista.push(exec(i * 1.4, i % 13 === 0 ? 'TIMED_OUT' : 'COMPLETED', i % 7 === 0 ? 14 : 1.2, i % 5 === 0 ? 'aoEditarPrincipal' : 'onEdit'));
const A = ambiente({ execucoes: lista });
const PC = 'PC1234567890ABCDEFGHIJKLMNO', ADM = 'ADMIN1234567890ABCDEF';
A.get({ k: ADM, acao: 'definir', prop: 'GABINETE_SUPABASE_URL', valor: 'https://abcdefgh.supabase.co' });
A.get({ k: ADM, acao: 'definir', prop: 'GABINETE_SUPABASE_KEY', valor: 'sb_publishable_teste' });
for (let i = 0; i < 6; i++) { A.run('verificar()'); A.horas(0.17); }
A.run('diario()');
A.post(PC, { tipo: 'pedido', projeto: 'gabinete', titulo: 'Relatório mensal de chamados por bairro', texto: 'Hoje o gabinete pede por WhatsApp.\nQuero um PDF com os chamados do mês por bairro.', prioridade: 'alta' });
A.post(PC, { tipo: 'pedido', projeto: 'planilha', titulo: 'Botão de PDF na aba BAIXAS' });
A.post(ADM, { tipo: 'pedido-status', id: 2, status: 'feito', resposta: 'Feito em C:\\Plan_SHEETS\\menuPDF.gs (função gerarPdfBaixas), colado na planilha original em 22/10 15:40.' });
const destino = path.join(__dirname, 'pc-exemplo.json');
fs.writeFileSync(destino, JSON.stringify(A.get({ k: PC, acao: 'pc' })));
console.log('gerado', destino);
