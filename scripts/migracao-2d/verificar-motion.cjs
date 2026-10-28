// Exercita cada capítulo nos dois sentidos, incluindo os pontos de troca.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const base=process.env.JARVIS_TEST_URL||'http://127.0.0.1:8003';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
 const out='docs/migracao-2d/motion';fs.mkdirSync(out,{recursive:true});const results=[];
 try{for(const [name,width,height,file] of [['desktop',1366,768,'pc.html'],['mobile',390,844,'index.html']]){
  const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/'+file+'?demo');await page.waitForFunction(()=>MV.depurar().ready);await page.evaluate(()=>document.fonts.ready);
  const count=await page.locator('.viagem-etapa').count();
  const samples=[];
  for(const chapter of [...Array.from({length:count},(_,i)=>i),2.35,2.5,2.65,2,1,0]){
   await page.evaluate(({chapter,count})=>{const r=document.querySelector('.jornada').getBoundingClientRect();scrollTo(0,r.top+scrollY+(r.height-innerHeight)*chapter/(count-1));},{chapter,count});
   await page.waitForTimeout(650);
   const state=await page.evaluate(()=>{const active=[...document.querySelectorAll('.viagem-texto')].filter(e=>!e.inert&&getComputedStyle(e).visibility!=='hidden');return {chapter:Number(document.querySelector('.cena-2d').dataset.chapter),active:active.length,text:active[0]?.innerText,opacity:Number(active[0]?.style.opacity),overflow:document.documentElement.scrollWidth>innerWidth};});
   // Meio pixel de scroll pode colocar o ponto exato de troca em qualquer lado.
   if(chapter%1===.5)assert.ok([Math.floor(chapter),Math.ceil(chapter)].includes(state.chapter));else assert.equal(state.chapter,Math.floor(chapter+.5));
   assert.equal(state.active,1);assert.ok(state.opacity>=.14);assert.equal(state.overflow,false);samples.push(state);
   if(chapter===0||chapter===2){await page.screenshot({path:out+'/'+name+'-'+chapter+'.png'});}
  }
  assert.deepEqual(errors,[]);results.push({name,samples,errors});await page.close();
 }
 fs.writeFileSync(out+'/validacao.json',JSON.stringify(results,null,2));console.log('Desktop e celular: capítulos, transições e retorno passaram.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
