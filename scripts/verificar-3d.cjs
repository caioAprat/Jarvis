const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const base=process.env.JARVIS_TEST_URL||'http://127.0.0.1:8005';
const output='docs/universo-3d';fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium'});const reports=[];
 try{
 for(const [width,height,file] of [[1366,768,'pc.html'],[390,844,'pc.html'],[390,844,'index.html']]){
  const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[],assets=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>assets.push(r.url()));
  await page.goto(base+'/'+file+'?demo');await page.waitForFunction(()=>MV.depurar().ready&&!MV.depurar().failed);await page.waitForTimeout(700);
  const start=await page.evaluate(()=>MV.depurar());assert.deepEqual(start.shaderErrors,[]);assert.equal(start.projects,7);assert.equal(start.connections,27);assert.equal(start.packets,12);
  assert.ok(!assets.some(a=>/pixi|assets\/scene/.test(a)),'Cena não deve carregar sprites/atlas antigos');
  await page.mouse.move(width-20,70);await page.waitForTimeout(300);
  assert.notDeepEqual((await page.evaluate(()=>MV.depurar().backgrounds)),start.backgrounds);
  const samples=[];
  for(const progress of [0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1]){
   await page.evaluate(p=>{const r=document.querySelector('.jornada').getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-innerHeight)*p);},progress);await page.waitForTimeout(650);
   const result=await page.evaluate(()=>{
    const active=[...document.querySelectorAll('.viagem-texto')].filter(e=>!e.inert&&getComputedStyle(e).visibility!=='hidden');
    const rect=active[0]?.getBoundingClientRect(),d=MV.depurar(),header=document.querySelector('.barra')||document.querySelector('body>header');
    return {progress:d.progress,active:active.length,rect:rect?.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,headerOpacity:Number(getComputedStyle(header).opacity),shaderErrors:d.shaderErrors};
   });
   assert.equal(result.active,1);assert.ok(!result.overflow);assert.ok(result.rect.top>=0&&result.rect.bottom<=height);assert.deepEqual(result.shaderErrors,[]);if(progress>=.1)assert.ok(result.headerOpacity<.02);samples.push(result);
   if(progress===0||progress===.2)await page.screenshot({path:`${output}/${file.replace('.html','')}-${width}-${progress}.png`});
  }
  if(file==='pc.html'){
   for(let i=0;i<3;i++){await page.locator('#nav-clientes').click();await page.locator('#nav-geral').click();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>scrollY),0);assert.equal(await page.evaluate(()=>ScrollTrigger.getAll().filter(t=>t.vars.id==='jarvis-jornada').length),1);await page.mouse.wheel(0,1200);await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>scrollY>300));}
   await page.locator('#nav-geral').click();await page.keyboard.press('Control+k');assert.equal(await page.locator('[role=dialog]').count(),1);await page.keyboard.press('Escape');
   await page.evaluate(()=>MV.atualizar([...S.P.estado.projetos,{id:'extra',nome:'Extra',status:'ok'}]));assert.equal(await page.evaluate(()=>MV.depurar().projects),8);
   await page.evaluate(()=>MV.atualizar(S.P.estado.projetos));await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>MV.depurar().projects),7);assert.ok((await page.evaluate(()=>MV.depurar().geometries))<=start.geometries+2);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>MV.depurar().reduced&&!MV.depurar().loop);assert.equal(await page.locator('.viagem-texto[inert]').count(),0);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!MV.depurar().reduced&&MV.depurar().loop);
  await page.evaluate(()=>MV.pausar(true));const frames=await page.evaluate(()=>MV.depurar().frames);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>MV.depurar().frames),frames);await page.evaluate(()=>MV.pausar(false));
  await page.evaluate(()=>document.querySelector('.cena-3d canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));assert.equal(await page.locator('.cena-3d').getAttribute('data-fallback'),'true');assert.ok(await page.locator('.scene-fallback').isVisible());assert.equal(await page.locator('.viagem-texto[inert]').count(),0);
  assert.deepEqual(errors,[]);reports.push({width,height,file,start,samples,errors});await page.close();console.log(file+' '+width+': cena, 11 posições, navegação, preferências e fallback passaram.');
 }
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};});await fallback.goto(base+'/pc.html?demo');await fallback.waitForFunction(()=>MV.depurar().failed);assert.ok(await fallback.locator('.jornada h2').count()>0);await fallback.close();
 fs.writeFileSync(output+'/validacao.json',JSON.stringify({reports,webglUnavailable:'pass'},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
