const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const base=process.env.JARVIS_TEST_URL||'http://127.0.0.1:8006';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium'});const reports=[];try{
 for(const width of [1366,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:768},serviceWorkers:'block'}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
  await page.goto(base+'/preview/index.html');await page.waitForFunction(()=>MV.depurar().ready&&!MV.depurar().failed);
  assert.equal(await page.evaluate(()=>JarvisDemo.ativo),true);
  assert.equal(await page.locator('.project-plasma').count(),7);
  await page.locator('a[href="#viagem-nucleo"]').click();await page.waitForFunction(()=>MV.depurar().chapter===1);await page.waitForFunction(()=>!document.documentElement.classList.contains('lenis-scrolling'));await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>MV.depurar().chapter),1);
  await page.evaluate(()=>{const trigger=ScrollTrigger.getById('jarvis-jornada');scrollTo(0,trigger.start+(trigger.end-trigger.start)*2/9);});await page.waitForTimeout(1800);
  await page.screenshot({path:'docs/universo-3d/preview-final-'+width+'.png'});
  console.log('Prévia '+width+': capítulo '+await page.evaluate(()=>MV.depurar().chapter));
  const selected=await page.locator('.viagem-texto:not([inert]) [data-jornada-projeto]').getAttribute('data-jornada-projeto');
  await page.locator('.viagem-texto:not([inert]) [data-jornada-projeto]').click();
  assert.equal(await page.evaluate(()=>S.sel),selected);assert.equal(await page.evaluate(()=>S.aba),'clientes');
  await page.locator('#nav-geral').click();
  await page.evaluate(()=>{const trigger=ScrollTrigger.getById('jarvis-jornada');scrollTo(0,trigger.start+(trigger.end-trigger.start)*6/9);});await page.waitForTimeout(1400);
  await page.locator('.viagem-texto:not([inert]) [data-jornada-projeto=pedalada]').click();
  assert.equal(await page.evaluate(()=>S.sel),'pedalada');assert.equal(await page.evaluate(()=>S.aba),'mapa');
  await page.locator('#nav-clientes').click();await page.locator('#nav-geral').click();await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>scrollY),0);assert.equal(await page.evaluate(()=>ScrollTrigger.getAll().filter(t=>t.vars.id==='jarvis-jornada').length),1);
  assert.equal(await page.locator('.cena-3d canvas').count(),1);
  assert.deepEqual(await page.evaluate(()=>MV.depurar().shaderErrors),[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  reports.push({width,selected,anchor:'pass',navigation:'pass',errors,external});await page.close();
 }
 fs.writeFileSync('docs/universo-3d/preview.json',JSON.stringify(reports,null,2));console.log('Prévia: dois tamanhos, âncora suave, projeto, retorno Geral e zero dependências externas.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
