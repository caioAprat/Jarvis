const fs=require('node:fs'),{chromium}=require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const base=process.env.JARVIS_TEST_URL||'http://127.0.0.1:8005';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium'});const runs=[];try{
 for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
  const page=await browser.newPage({viewport,serviceWorkers:'block'});await page.goto(base+'/pc.html?demo');await page.waitForFunction(()=>MV.depurar().ready&&!MV.depurar().failed);await page.waitForTimeout(6000);
  await page.evaluate(()=>{window.__jarvisMeasure={sampling:true,frames:[],start:performance.now()};});await page.waitForTimeout(6000);
  const result=await page.evaluate(()=>{const m=window.__jarvisMeasure;m.sampling=false;const elapsed=performance.now()-m.start,gaps=m.frames.slice(1).map((t,i)=>t-m.frames[i]).sort((a,b)=>a-b),gl=document.querySelector('.cena-3d canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {fps:m.frames.length*1000/elapsed,p95FrameMs:gaps[Math.floor(gaps.length*.95)],maxFrameMs:Math.max(...gaps),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'indisponível',scene:MV.depurar()};});runs.push({viewport,...result});console.log(JSON.stringify({viewport,fps:result.fps,p95FrameMs:result.p95FrameMs,quality:result.scene.quality,gpu:result.gpu}));
  await page.evaluate(()=>{const r=document.querySelector('.jornada').getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-innerHeight)*2/9);});await page.waitForTimeout(1000);
  fs.mkdirSync('docs/universo-3d',{recursive:true});await page.screenshot({path:'docs/universo-3d/final-'+viewport.width+'.png'});await page.close();
 }
 fs.mkdirSync('docs/universo-3d',{recursive:true});fs.writeFileSync('docs/universo-3d/desempenho.json',JSON.stringify({method:'6 s de aquecimento + 6 s de amostra, um navegador por vez. FPS mede chamadas de render; não comprova apresentação física nem GPU do usuário.',runs},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
