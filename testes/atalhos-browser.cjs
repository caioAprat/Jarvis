'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {abrirChrome,vigiarFoco,exigirFoco,esperarAcesso}=require('./ambiente-browser.cjs');
const root=path.resolve(__dirname,'..');
const main=execFileSync('git',['show','origin/main:pc.html'],{cwd:root,encoding:'utf8'}).match(/function abrirProjeto\(id\) \{[\s\S]*?\n\}/)[0];
function expected(p){const result={url:null,selected:null};vm.runInNewContext(main+';abrirProjeto('+JSON.stringify(p.id)+')',{S:{P:{estado:{projetos:[p]}},sel:''},window:{open:u=>result.url=u},render(){result.selected=p.id;}});return result;}
(async()=>{
 const browser=await abrirChrome();
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await vigiarFoco(page);
  await page.addInitScript(()=>{window.__opened=[];window.open=(url,target,features)=>{__opened.push({url,target,features});return null;};});
  await page.route('**/landing-roteiro.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'landing-roteiro.js'),'utf8').replace('const planeta =','window.__launcher={proto,mapa}; const planeta =').replace('function irCena(c) {','__launcher.nav=id=>irCena(cenas.find(c=>c.id===id)); __launcher.ready=()=>!portalDados&&!passeioAutomatico&&!projeto&&!voando; function irCena(c) {')}));
  await page.goto(process.env.IGNICAO_URL||'http://127.0.0.1:4173/');await page.bringToFront();await exigirFoco(page);await page.waitForFunction(()=>window.NARR&&window.__launcher&&S.P);
  await page.evaluate(()=>abrirProjeto('pedalada'));assert.equal(await page.evaluate(()=>__opened.length),0,'Atalho deve respeitar PIN');
  await esperarAcesso(page);await page.waitForFunction(()=>document.activeElement?.type==='password');await page.keyboard.type('12345678',{delay:35});await page.waitForFunction(()=>NARR.emB()&&__launcher.ready());
  const projects=await page.evaluate(()=>S.P.estado.projetos.map(p=>({id:p.id,nome:p.nome,link:p.link})));
  const reset=()=>page.evaluate(()=>{__opened=[];S.sel='';});
  const verify=async(p,via)=>{
   await exigirFoco(page);
   const want=expected(p);
   if(want.url){const got=await page.evaluate(()=>__opened);assert.equal(got.length,1,p.id+'/'+via);assert.equal(got[0].url,want.url,p.id+'/'+via);assert.equal(got[0].target,'_blank');assert.ok(got[0].features.includes('noopener'));}
   else {await page.waitForFunction(id=>S.sel===id,p.id);assert.equal(await page.evaluate(()=>__opened.length),0);}
   if(await page.locator('.proj-sair').count()){await page.locator('.proj-sair').click();await page.waitForFunction(()=>__launcher.ready());}
   console.log('OK',p.id,via,want.url?'destino igual a main':'detalhes iguais a main');
  };
  for(const p of projects){
   await reset();await page.evaluate(id=>__launcher.nav(id),p.id);await page.waitForFunction(id=>NARR.cenaEm(NARR.progresso())===id,p.id);await page.waitForTimeout(1200);
   const pos=await page.evaluate(id=>{const m=__launcher.proto.modulos.find(m=>m.id===id),v=m.tela.getWorldPosition(new THREE.Vector3()).project(__launcher.mapa.depurar().camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};},p.id);
   await page.mouse.click(pos.x,pos.y);await verify(p,'monitor');
   for(const via of ['Ctrl K','dock']){
    await exigirFoco(page);await reset();if(via==='Ctrl K')await page.keyboard.press('Control+k');else await page.locator('.dock [data-acao="projetos"]').click();
    await page.locator('#palQ').fill(p.nome);await page.locator('.pal [role="option"]').filter({hasText:p.nome}).last().click();await verify(p,via);
   }
  }
  const extras=await page.evaluate(()=>S.P.mapa.filter(m=>!S.P.estado.projetos.some(p=>p.id===m.id)).map(m=>({id:m.id,nome:m.nome})));
  for(const p of extras)for(const via of ['Ctrl K','dock']){
   if(via==='Ctrl K')await page.keyboard.press('Control+k');else await page.locator('.dock [data-acao="projetos"]').click();
   await page.locator('#palQ').fill(p.nome);await page.locator('.pal [role="option"]').filter({hasText:p.nome}).last().click();await page.waitForFunction(()=>S.aba==='mapa');console.log('OK',p.id,via,'mapa existente (sem monitor/URL na main)');
  }
  // URL insegura jamais abre uma janela, mantendo o fallback da main.
  await page.evaluate(()=>{S.P.estado.projetos[0].link='javascript:alert(1)';__opened=[];abrirProjeto(S.P.estado.projetos[0].id);});assert.equal(await page.evaluate(()=>__opened.length),0);
  await exigirFoco(page);assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>!document.hidden&&document.hasFocus()));
  const out=path.join(root,'.playwright-mcp/p7b');fs.mkdirSync(out,{recursive:true});await page.locator('.dock [data-acao="projetos"]').click();await page.screenshot({path:path.join(out,'atalhos.png')});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
