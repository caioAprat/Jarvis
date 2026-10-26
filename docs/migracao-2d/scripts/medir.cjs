// Auditoria da cena original; não altera o app e não chama produção.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const zlib = require('node:zlib');
const {execFileSync} = require('node:child_process');
const {chromium} = require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const root = path.resolve(__dirname, '../../..'), out = path.resolve(__dirname, '..');
const {ambiente} = require(path.join(root, 'testes/simulador'));
const base = 'http://127.0.0.1:8000';
const delay = ms => new Promise(r => setTimeout(r, ms));
const metricMap = result => Object.fromEntries(result.metrics.map(m => [m.name, m.value]));
(async () => {
 fs.mkdirSync(path.join(out,'referencias'),{recursive:true});
 fs.mkdirSync(path.join(out,'traces'),{recursive:true});
 const A=ambiente({agora:new Date().toISOString()}); A.run('verificar()');
 const fixture=A.get({k:A.props.CHAVE_PC,acao:'pc'});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined});
 const runs=[];
 try {
 for (const target of [{name:'pc-1920x1080',file:'pc.html',width:1920,height:1080},{name:'celular-390x844',file:'index.html',width:390,height:844}]) {
  const context=await browser.newContext({viewport:{width:target.width,height:target.height},deviceScaleFactor:1,serviceWorkers:'block'});
  try {
   await context.addInitScript(({base,pc})=>{
    localStorage.setItem(pc?'jarvis.pc.cfg':'jarvis.cfg',JSON.stringify({u:base+'/__auditoria_simulada__',k:'FICTICIA_AUDITORIA'}));
    window.__audit={firstRender:null,sampling:false,frames:[],gpu:null};
    let three;
    Object.defineProperty(window,'THREE',{configurable:true,get:()=>three,set:obj=>{
     three=obj; let ctor;
     Object.defineProperty(obj,'WebGLRenderer',{configurable:true,get:()=>ctor,set:original=>{
      ctor=new Proxy(original,{construct(fn,args){
       const renderer=Reflect.construct(fn,args),render=renderer.render;
       const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
       window.__audit.gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
       renderer.render=function(scene,camera){
        const result=render.apply(this,arguments);
        if(camera.isPerspectiveCamera){const now=performance.now();if(window.__audit.firstRender===null)window.__audit.firstRender=now;if(window.__audit.sampling)window.__audit.frames.push(now);}
        return result;
       }; return renderer;
      }});
     }});
    }});
   },{base,pc:target.file==='pc.html'});
   await context.route('**/__auditoria_simulada__?*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).searchParams.get('acao')==='estado'?fixture.estado:fixture)}));
   const page=await context.newPage(),errors=[],failures=[],httpErrors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
   const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   const resources=new Map();
   cdp.on('Network.responseReceived',e=>resources.set(e.requestId,{url:e.response.url,type:e.type,status:e.response.status,encoded_transfer_bytes:0}));
   cdp.on('Network.loadingFinished',e=>{if(resources.has(e.requestId))resources.get(e.requestId).encoded_transfer_bytes=e.encodedDataLength;});
   await page.goto(base+'/'+target.file,{waitUntil:'networkidle',timeout:30000});
   await page.waitForFunction(()=>window.__audit.firstRender!==null&&document.querySelectorAll('.mv-rotulo').length===7,{},{timeout:30000});
   await page.evaluate(()=>document.fonts.ready);
   await delay(5000);
   if(errors.length||failures.length||httpErrors.length)throw Error(JSON.stringify({errors,failures,httpErrors}));
   await page.screenshot({path:path.join(out,'referencias',target.name+'.png')});
   const traceDone=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
   await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing',transferMode:'ReturnAsStream'});
   const before=metricMap(await cdp.send('Performance.getMetrics'));
   const start=await page.evaluate(()=>{window.__audit.frames=[];window.__audit.sampling=true;return performance.now();});
   await delay(10000);
   const sample=await page.evaluate(()=>{window.__audit.sampling=false;return {...window.__audit,end:performance.now(),paints:performance.getEntriesByType('paint').map(p=>({name:p.name,startTime:p.startTime}))};});
   const after=metricMap(await cdp.send('Performance.getMetrics'));
   await cdp.send('Tracing.end');const {stream}=await traceDone;const chunks=[];
   for(;;){const r=await cdp.send('IO.read',{handle:stream});chunks.push(Buffer.from(r.data,r.base64Encoded?'base64':'utf8'));if(r.eof)break;}
   await cdp.send('IO.close',{handle:stream});
   fs.writeFileSync(path.join(out,'traces',target.name+'.json.gz'),zlib.gzipSync(Buffer.concat(chunks)));
   const seconds=(sample.end-start)/1000;
   const runtime=[...resources.values()];
   const entry={target,average_scene_render_calls_per_second:sample.frames.length/seconds,sample_seconds:seconds,rendered_frames:sample.frames.length,
    renderer_main_thread_busy_percent:100*(after.TaskDuration-before.TaskDuration)/(after.Timestamp-before.Timestamp),js_heap_used_bytes:after.JSHeapUsedSize,js_heap_total_bytes:after.JSHeapTotalSize,
    first_scene_render_completed_ms:sample.firstRender,paints:sample.paints,gpu_renderer:sample.gpu,errors,failures,http_errors:httpErrors,
    total_encoded_transfer_bytes:runtime.reduce((n,r)=>n+r.encoded_transfer_bytes,0),javascript_encoded_transfer_bytes:runtime.filter(r=>r.type==='Script').reduce((n,r)=>n+r.encoded_transfer_bytes,0),resources:runtime,
    frame_intervals_ms:sample.frames.slice(1).map((f,i)=>f-sample.frames[i]),cdp_before:before,cdp_after:after};
   runs.push(entry);console.log(JSON.stringify({target:target.name,fps:entry.average_scene_render_calls_per_second,cpu:entry.renderer_main_thread_busy_percent,gpu:sample.gpu}));
  }finally{await context.close();}
 }
 const files=['index.html','pc.html','mapa-vivo.js','sw.js'];
 fs.writeFileSync(path.join(out,'baseline.json'),JSON.stringify({phase:0,status:'measured',generated_at:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  priority:'Liberar recursos usados pelo 3D para investir em riqueza visual 2D; redução de processamento total não é o objetivo principal (orientação posterior do usuário).',
  environment:{browser:browser.version(),playwright:require('/workspace/.jarvis-audit-tools/node_modules/playwright/package.json').version,node:process.version,os:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,cpu_count:os.cpus().length,system_memory_bytes:os.totalmem(),headless:true,dpr:1},
  methodology:{data:'Simulador existente, 7 projetos, data atual; sem produção.',warmup_ms:5000,sample_requested_ms:10000,scenario:'Cena inicial parada, sem scroll ou movimento do cursor, cache HTTP desativado.',fps:'Chamadas completas de renderização da cena com câmera perspectiva por segundo; não mede apresentação física do monitor.',cpu:'Delta TaskDuration / delta Timestamp por CDP: ocupação da thread principal do renderer; exclui CPU total, GPU e outros processos.',memory:'Heap JavaScript, não memória total do processo/GPU.',first_render:'Fim da primeira chamada render da cena, medido desde performance.timeOrigin; não é GPU fence.',trace:'Coletado na mesma janela; tem overhead. Comparação futura deve repetir o mesmo protocolo.',transfer:'encodedDataLength do CDP, inclui cabeçalhos; rotas locais simuladas podem ter bytes zero. Sem bundle compilado.'},
  build:{framework:'JavaScript puro',bundler:null,local_source_bytes:Object.fromEntries(files.map(f=>[f,fs.statSync(path.join(root,f)).size]))},runs},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
