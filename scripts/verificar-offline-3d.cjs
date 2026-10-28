const {chromium}=require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const assert=require('node:assert/strict'),{ambiente}=require('../testes/simulador');
const base=process.env.JARVIS_TEST_URL||'http://127.0.0.1:8005';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium'});try{
 const context=await browser.newContext(),page=await context.newPage(),A=ambiente({agora:new Date().toISOString()});A.run('verificar()');
 await context.addInitScript(({base,key})=>localStorage.setItem('jarvis.cfg',JSON.stringify({u:base+'/__offline_sim__',k:key})),{base,key:A.props.CHAVE_LEITURA});
 await context.route('**/__offline_sim__?*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(A.get(Object.fromEntries(new URL(r.request().url()).searchParams)))}));
 await page.goto(base+'/index.html');await page.waitForFunction(()=>S.D&&MV.depurar().ready&&!MV.depurar().failed);
 await page.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;});
 await context.unroute('**/__offline_sim__?*');await context.setOffline(true);await page.reload();await page.waitForFunction(()=>S.D&&MV.depurar().ready&&!MV.depurar().failed);
 assert.ok(await page.evaluate(()=>S.offline));assert.deepEqual(await page.evaluate(()=>MV.depurar().shaderErrors),[]);
 console.log('Offline: Three.js, shaders, ícones embutidos, interface e dados simulados disponíveis.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
