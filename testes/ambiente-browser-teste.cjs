'use strict';
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
// Reproduz a configuração documentada de uma instalação temporária, sem variável de ambiente.
const env = {...process.env}; delete env.PLAYWRIGHT_MODULE;
const r = spawnSync(process.execPath, ['-e', "require('./testes/ambiente-browser.cjs').carregarPlaywright()"], {cwd:path.resolve(__dirname,'..'),env,encoding:'utf8'});
assert.equal(r.status, 0, r.stderr);
console.log('OK Playwright temporario sem PLAYWRIGHT_MODULE');
const absent = spawnSync(process.execPath, ['-e', "require('./testes/ambiente-browser.cjs').carregarPlaywright()"], {
  cwd:path.resolve(__dirname,'..'), env:{...env,PLAYWRIGHT_MODULE:path.join(__dirname,'pacote-inexistente')},encoding:'utf8'
});
assert.notEqual(absent.status,0);
assert.match(absent.stderr,/Playwright ausente.*npm install/);
assert.doesNotMatch(absent.stderr,/MODULE_NOT_FOUND/);
console.log('OK dependencia ausente informa como instalar');
const {abrirChrome,vigiarFoco,exigirFoco,medirQuadros}=require('./ambiente-browser.cjs');
(async()=>{
  for (const state of [{focused:false,hidden:false,lost:false},{focused:true,hidden:true,lost:false},{focused:true,hidden:false,lost:true}]) {
    await assert.rejects(exigirFoco({evaluate:async()=>state}),/AMBIENTE INVALIDO.*primeiro plano/);
  }
  console.log('OK foco ausente, aba oculta e perda transitoria reprovam');
  const browser=await abrirChrome();
  try {
    const page=await browser.newPage();await vigiarFoco(page);
    await page.goto('data:text/html,<title>Teste de foco P8s</title>');await page.bringToFront();await exigirFoco(page);
    const other=await page.context().newPage();await vigiarFoco(other);await other.goto('data:text/html,<title>Outra aba</title>');await other.bringToFront();
    await assert.rejects(exigirFoco(page),/AMBIENTE INVALIDO/);
    await page.bringToFront();
    await assert.rejects(exigirFoco(page),/AMBIENTE INVALIDO/, 'Recuperar foco nao pode apagar a perda anterior');
    console.log('OK perda real de foco fica registrada apos voltar a aba');
    await page.reload();await page.bringToFront();await exigirFoco(page);
    let timeout;
    const sampling=Promise.race([medirQuadros(page),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Amostragem ficou esperando RAF sem abortar por foco')),1500);})]);
    const failed=assert.rejects(sampling,/AMBIENTE INVALIDO/);
    await other.bringToFront();
    try {await failed;}finally{clearTimeout(timeout);}
    console.log('OK amostragem aborta ao perder foco mesmo sem proximo RAF');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
