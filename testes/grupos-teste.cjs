'use strict';
const assert=require('node:assert/strict');
const grupos=require('./grupos.cjs');
assert.ok(grupos.logica.includes('pwa-v3-browser.cjs'));
assert.ok(grupos.desempenho.includes('ignicao-browser.cjs'));
const {headlessPadrao}=require('./ambiente-browser.cjs');
assert.equal(headlessPadrao(),true,'LOGICA deve rodar sem janela por padrao');
assert.equal(headlessPadrao({headless:false}),false);
console.log('OK grupos separados; LOGICA headless, DESEMPENHO com janela');

(async()=>{
 const {abrirChrome,vigiarFoco,exigirFoco}=require('./ambiente-browser.cjs');
 const browser=await abrirChrome();
 try {
  const page=await browser.newPage();await vigiarFoco(page);
  const cdp=await browser.newCDPSession(page);
  const {arguments:args}=await cdp.send('Browser.getBrowserCommandLine');
  assert.ok(args.includes('--headless=new'),'LOGICA abriu Chrome com janela');
  await page.goto('data:text/html,<input autofocus>');await exigirFoco(page);
  await page.keyboard.type('logica');
  assert.equal(await page.locator('input').inputValue(),'logica');
  console.log('OK Chrome real headless recebe teclado sem janela');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
