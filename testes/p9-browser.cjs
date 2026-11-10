'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {abrirChrome}=require('./ambiente-browser.cjs');
const url=process.env.P9_URL||'https://jarvao-landing-v3.vercel.app/v3/pc.html?diag=1';
const rounds=Number(process.env.P9_ROUNDS||1),results=[];
(async()=>{
 for(const mode of ['aba','app'])for(let i=0;i<rounds;i++){
  const chrome=await abrirChrome(mode==='app'?{appUrl:url,headless:false}:{headless:false});
  try{
   const page=mode==='app'?chrome.initialPage():await chrome.newPage();
   await page.setViewportSize({width:1366,height:768});
   if(mode==='aba')await page.goto(url);
   await page.bringToFront();await page.waitForFunction(()=>typeof MV!=='undefined'&&MV,{timeout:45000});
   const cdp=await chrome.newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});
   const samples=[];
   for(let s=0;s<3;s++){
    await page.waitForTimeout(4000);
    samples.push(await page.evaluate(()=>{const d=MV.depurar(),r=d.renderer;return {nivel:MV.qualidade(),pixelRatio:r.getPixelRatio(),antialias:r.getContext().getContextAttributes().antialias,comp:d.comp,foco:document.hasFocus(),hidden:document.hidden,standalone:matchMedia('(display-mode: standalone)').matches,baixo:innerWidth<700,dpr:devicePixelRatio,width:innerWidth,height:innerHeight,diagnostico:typeof MV.diagnostico==='function'?MV.diagnostico():null};}));
   }
   const resource=await page.evaluate(async()=>{const text=await(await fetch('mapa-vivo.js',{cache:'reload'})).text();const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return {hash:[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join(''),worker:navigator.serviceWorker.controller?.scriptURL||null};});
   await page.screenshot({path:path.resolve('.playwright-mcp/p9/'+(process.env.P9_LABEL||'baseline')+'-'+mode+'-'+i+'.png')});
   results.push({mode,round:i+1,samples,resource});console.log(JSON.stringify(results.at(-1)));
   assert.equal(samples.at(-1).standalone,mode==='app','Modo de janela incorreto');
   if(process.env.P9_ASSERT){assert.ok(samples.every(s=>s.foco&&!s.hidden),'Foco/visibilidade invalidos');assert.ok(samples.every(s=>s.nivel===0),'Qualidade deve continuar cheia');assert.equal(samples.at(-1).antialias,true);assert.equal(samples.at(-1).comp,true);}
  }finally{await chrome.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{fs.writeFileSync('.playwright-mcp/p9/'+(process.env.P9_LABEL||'baseline')+'.json',JSON.stringify(results,null,2));});
