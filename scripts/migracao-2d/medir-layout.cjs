// Medição geométrica; não abre imagens. Requer servidor local e Playwright existente.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const base=process.env.JARVIS_TEST_URL||'http://127.0.0.1:8001';
const out=path.resolve(__dirname,'../../docs/migracao-2d/capturas');
const targets=[{name:'desktop-1920',file:'pc.html',width:1920,height:1080},{name:'desktop-1366',file:'pc.html',width:1366,height:768},{name:'mobile-390',file:'index.html',width:390,height:844}];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
 const runs=[];
 try{for(const target of targets){
  const page=await browser.newPage({viewport:{width:target.width,height:target.height},serviceWorkers:'block'}),errors=[],warnings=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
  await page.goto(base+'/'+target.file+'?demo');await page.waitForFunction(()=>MV.depurar().ready);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);
  const samples=[];
  for(let step=0;step<=10;step++){
   await page.evaluate(p=>{const r=document.getElementById('jornada').getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-innerHeight)*p);},step/10);
   await page.waitForTimeout(1250);
   const sample=await page.evaluate(()=>{
    const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height}),intersects=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1;
    const visible=e=>{let opacity=1;for(let n=e;n&&n!==document.body;n=n.parentElement){const c=getComputedStyle(n);if(c.display==='none'||c.visibility==='hidden')return false;opacity*=Number(c.opacity);}return opacity>.05;};
    const root=document.querySelector('.jornada'),nodes=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let n;while(n=walker.nextNode()){if(!n.textContent.trim()||n.parentElement.closest('.viagem-regua')||!visible(n.parentElement))continue;const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects())if(r.width&&r.height)nodes.push({text:n.textContent.trim().slice(0,65),...rect(r)});}
    const overlaps=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(intersects(nodes[i],nodes[j]))overlaps.push([nodes[i].text,nodes[j].text]);
    const d=MV.depurar();return {progress:d.progress,visibleTextCount:nodes.length,outside:nodes.filter(r=>r.x<-.5||r.y<-.5||r.x+r.width>innerWidth+.5||r.y+r.height>innerHeight+.5),overlaps,overCore:nodes.filter(r=>intersects(r,d.coreBounds)),core:d.coreBounds,backgrounds:d.backgrounds,dpr:d.resolution,masterCount:ScrollTrigger.getAll().filter(t=>t.vars.id==='jarvis-jornada').length,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   samples.push({percent:step*10,...sample});
   if(!process.env.JARVIS_NO_CAPTURES)await page.screenshot({path:path.join(out,target.name+'-'+step*10+'.png')});
  }
  const run={target,samples,errors,warnings:[...new Set(warnings)]};runs.push(run);
  console.log(JSON.stringify({target:target.name,failures:samples.filter(s=>s.outside.length||s.overlaps.length||s.overCore.length||!s.visibleTextCount||s.overflow).map(s=>({percent:s.percent,outside:s.outside.map(r=>r.text),overlap:s.overlaps,core:s.overCore.map(r=>r.text),empty:!s.visibleTextCount})),errors:errors.length}));
  await page.close();
 }
 fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify({method:'Text nodes visíveis (opacidade acumulada > .05), Range.getClientRects, interseções >1px. Núcleo: região central conservadora de raio 90 unidades da cena. Conteúdo oculto entre etapas é excluído; valida-se texto apresentado ao usuário.',runs},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
