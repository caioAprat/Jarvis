// Interações reais: inércia, retorno pelo ícone Geral, cursor e movimento reduzido.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const base=process.env.JARVIS_TEST_URL||'http://127.0.0.1:8003';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
 const results=[];const out='docs/migracao-2d/interacao';fs.mkdirSync(out,{recursive:true});
 try{for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
  const page=await browser.newPage({viewport,serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/pc.html?demo');await page.waitForFunction(()=>MV.depurar().ready&&MV.depurar().loop);
  const initial=await page.evaluate(()=>MV.depurar());
  await page.mouse.move(viewport.width-10,100);await page.waitForTimeout(500);
  const moved=await page.evaluate(()=>MV.depurar());assert.ok(moved.interaction.x>.5);assert.notDeepEqual(initial.particleSamples,moved.particleSamples);
  assert.ok(moved.packets.some(p=>p.visible&&p.alpha>.1));assert.ok(moved.packets.some(p=>!p.visible),'Projeto pausado não transmite arquivos');
  for(let cycle=0;cycle<3;cycle++){
   await page.mouse.wheel(0,2500);await page.waitForTimeout(100);
   // Troca a tela enquanto ainda existe inércia e volta pelo ícone real.
   await page.locator('#nav-clientes').click();await page.locator('#nav-geral').click();
   await page.waitForTimeout(500);
   const returned=await page.evaluate(()=>({scroll:scrollY,d:MV.depurar(),triggers:ScrollTrigger.getAll().filter(t=>t.vars.id==='jarvis-jornada').length,canvases:document.querySelectorAll('.cena-2d canvas').length,active:[...document.querySelectorAll('.viagem-texto')].filter(e=>!e.inert).length}));
   assert.equal(returned.scroll,0);assert.equal(returned.d.progress,0);assert.equal(returned.triggers,1);assert.equal(returned.canvases,1);assert.equal(returned.active,1);
   await page.mouse.wheel(0,650);await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>scrollY>200),'Scroll deve funcionar depois de voltar');
   // Clicar novamente no próprio Geral também reinicia a jornada.
   await page.locator('#nav-geral').click();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>scrollY),0);
  }
  await page.evaluate(()=>{const r=document.querySelector('.jornada').getBoundingClientRect();scrollTo(0,r.top+scrollY+(r.height-innerHeight)*2/9);});await page.waitForTimeout(700);
  const mid=await page.evaluate(()=>MV.depurar());assert.ok(mid.progress>.2);assert.notDeepEqual(mid.backgrounds,moved.backgrounds);
  await page.screenshot({path:out+'/projeto-'+viewport.width+'.png'});
  const frames=mid.frames;await page.evaluate(()=>window.__jarvisMeasure={sampling:true,frames:[]});
  for(const delta of [2400,1800,-3000,900,-1500,1800]){await page.mouse.wheel(0,delta);await page.waitForTimeout(100);}
  await page.waitForTimeout(500);assert.ok((await page.evaluate(()=>MV.depurar().frames))>frames);
  const renderGaps=await page.evaluate(()=>{const f=window.__jarvisMeasure.frames;window.__jarvisMeasure.sampling=false;return f.slice(1).map((t,i)=>t-f[i]);});
  assert.ok(renderGaps.length>2);assert.ok(Math.max(...renderGaps)<1000,'Nenhuma pausa de renderização de um segundo durante o stress');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);const reduced=await page.evaluate(()=>MV.depurar());assert.equal(reduced.loop,false);
  await page.mouse.move(10,10);await page.waitForTimeout(150);assert.equal((await page.evaluate(()=>MV.depurar().interaction.targetX)),reduced.interaction.targetX);
  assert.deepEqual(errors,[]);results.push({viewport,returnCycles:3,maxRenderGapMs:Math.max(...renderGaps),framesAfterStress:await page.evaluate(()=>MV.depurar().frames),errors});await page.close();
 }
 fs.writeFileSync(out+'/validacao.json',JSON.stringify(results,null,2));console.log('Cursor, arquivos, planetas, scroll rápido, retorno pelo Geral e movimento reduzido: passaram em desktop e celular.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
