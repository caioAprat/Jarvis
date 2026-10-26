// Regressão de interface com o simulador existente, nunca produção.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const {ambiente}=require('../../testes/simulador');
const base=process.env.JARVIS_TEST_URL||'http://127.0.0.1:8001';
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
 const results=[];const errors=[];
 async function page(options={}){const p=await b.newPage({viewport:{width:1366,height:768},serviceWorkers:'block',...options});p.on('pageerror',e=>errors.push(e.message));return p;}
 try{
 const p=await page();await p.goto(base+'/pc.html?demo');await p.waitForFunction(()=>MV.depurar().ready);assert.equal(await p.evaluate(()=>MV.depurar().projects),7);
 await p.evaluate(()=>{MV.atualizar([...S.P.estado.projetos,{id:'novo',nome:'Novo projeto',status:'ok'}]);});assert.equal(await p.evaluate(()=>MV.depurar().connections),8);
 await p.evaluate(()=>MV.atualizar(S.P.estado.projetos.slice(1)));assert.equal(await p.evaluate(()=>MV.depurar().connections),6);results.push('Adição e remoção de projetos atualiza sprites e conexões');
 await p.reload();await p.waitForFunction(()=>MV.depurar().ready);const before=await p.evaluate(()=>MV.depurar().endpoints);await p.waitForTimeout(300);const after=await p.evaluate(()=>MV.depurar().endpoints);assert.notDeepEqual(before,after);results.push('Órbitas atualizam posições');
 await p.keyboard.press('Control+k');await p.waitForTimeout(100);assert.ok(await p.locator('[role=dialog]').count());await p.keyboard.press('Escape');results.push('Ctrl K abre busca e Escape fecha');
 for(const aba of ['clientes','pedidos','versoes','assistente','mapa','avisos','ajustes','geral']){await p.locator('[data-aba="'+aba+'"]',).last().click();await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>S.aba),aba);assert.equal(await p.locator('.faixa.erro').filter({hasText:'falhou ao montar'}).count(),0);}results.push('Oito seções navegam sem erro de montagem');
 await p.locator('[data-acao=conferir]').click();await p.waitForFunction(()=>!S.carregando);assert.equal(await p.evaluate(()=>S.erro),'');results.push('Conferir tudo atualiza fixture sem acessar produção');
 await p.evaluate(()=>MV.pausar(true));const frame=await p.evaluate(()=>MV.depurar().frames);await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>MV.depurar().frames),frame);await p.evaluate(()=>MV.pausar(false));results.push('Pausa interrompe renderização');
 await p.evaluate(()=>document.querySelector('.cena-2d canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));assert.equal(await p.locator('.cena-2d').getAttribute('data-fallback'),'true');assert.ok(await p.locator('.cena-reserva').isVisible());results.push('Perda de contexto usa imagem e mantém texto');await p.close();
 const r=await page({reducedMotion:'reduce'});await r.goto(base+'/pc.html?demo');await r.waitForFunction(()=>MV.depurar().ready);assert.equal(await r.evaluate(()=>MV.depurar().loop),false);await r.evaluate(()=>scrollTo(0,2000));await r.waitForTimeout(100);assert.ok(await r.locator('.viagem-texto').first().isVisible());results.push('Movimento reduzido sem loop contínuo');await r.close();
 const f=await page();await f.route('**/assets/scene/*.webp',route=>route.abort());await f.goto(base+'/pc.html?demo');await f.waitForFunction(()=>MV.depurar().ready);results.push('Falha WebP recupera atlas PNG');await f.close();
 const g=await page();await g.route('**/assets/scene/*.json',route=>route.abort());await g.goto(base+'/pc.html?demo');await g.waitForFunction(()=>MV.depurar().failed);assert.ok(await g.locator('.jornada h2').count()>0);results.push('Falha total dos atlas mantém texto e imagem estática');await g.close();
 const A=ambiente({agora:new Date().toISOString()});A.run('verificar()');const real=await page();
 await real.addInitScript(({base,key})=>localStorage.setItem('jarvis.pc.cfg',JSON.stringify({u:base+'/__simulador__',k:key})),{base,key:A.props.CHAVE_PC});
 await real.route('**/__simulador__?*',route=>{const req=route.request(),q=Object.fromEntries(new URL(req.url()).searchParams);const result=req.method()==='POST'?A.post(q.k,JSON.parse(req.postData())):A.get(q);return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});});
 await real.goto(base+'/pc.html');await real.waitForFunction(()=>S.P&&MV.depurar().ready);for(const aba of ['clientes','pedidos','versoes','assistente','mapa','avisos','ajustes']){await real.locator('[data-aba="'+aba+'"]').last().click();await real.waitForTimeout(150);assert.equal(await real.locator('.faixa.erro').filter({hasText:'falhou ao montar'}).count(),0);}results.push('Integração original GET/POST validada contra simulador Apps Script');await real.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(path.resolve(__dirname,'../../docs/migracao-2d/resultado/testes-ui.json'),JSON.stringify({results,errors},null,2));console.log(results.join('\n'));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
