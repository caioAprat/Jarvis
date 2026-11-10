'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {abrirChrome,vigiarFoco,exigirFoco,esperarAcesso}=require('./ambiente-browser.cjs');
const root=path.resolve(__dirname,'..');
const mutant=process.argv.find(a=>a.startsWith('--mutacao='))?.split('=')[1];
(async()=>{
 const browser=await abrirChrome();
 try {
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'no-preference'}),errors=[];
  await page.addInitScript(()=>{
   const ativos=[];
   const add=window.addEventListener,remove=window.removeEventListener;
   const capture=o=>typeof o==='boolean'?o:!!o?.capture;
   window.addEventListener=function(tipo,fn,op){
    if(!ativos.some(x=>x.tipo===tipo&&x.fn===fn&&x.capture===capture(op)))ativos.push({tipo,fn,capture:capture(op)});
    return add.call(this,tipo,fn,op);
   };
   window.removeEventListener=function(tipo,fn,op){
    const i=ativos.findIndex(x=>x.tipo===tipo&&x.fn===fn&&x.capture===capture(op));
    if(i>=0)ativos.splice(i,1);
    return remove.call(this,tipo,fn,op);
   };
   window.__listenersAtivos=ativos;
  });
  await vigiarFoco(page);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/landing-roteiro.js*',async r=>{
   let s=fs.readFileSync(path.join(root,'landing-roteiro.js'),'utf8');
   const replace=(a,b)=>{assert.equal(s.split(a).length,2,'Sonda desatualizada: '+a);s=s.replace(a,b);};
   replace('const ouvintes = [];', 'const ouvintes = []; const registrados=[]; const energiaAntes=[]; const energiaOriginal=mapa.energia; mapa.energia=function(v){energiaAntes.push(v);return energiaOriginal.call(mapa,v);};');
   replace('addEventListener(tipo, fn, opcoes);','addEventListener(tipo, fn, opcoes); registrados.push(fn);');
   replace('const planeta =','window.__reg={mapa,proto,ouvintes,malhaVeias,ign,registrados,energiaAntes}; const planeta =');
   replace('function irCena(c) {','window.__reg.nav=id=>irCena(cenas.find(c=>c.id===id)); window.__reg.cenas=()=>cenas; window.__reg.ignicao=()=>!!portalDados; window.__reg.pronta=()=>!portalDados&&!passeioAutomatico&&(!lenis||!lenis.isLocked); function irCena(c) {');
   if(mutant==='declaracao')s+='\nconst veias=1; const veias=2;';
   if(mutant==='energia')replace('mapa.energia(.03 + .2 * acesoSuave);','mapa.energia(.8);');
   if(mutant==='listeners')replace('removeEventListener(tipo, fn, opcoes)', 'void 0');
   if(mutant==='saudacao')replace("c.el.style.opacity='1';","c.el.style.opacity=c.id==='ola'?'0':'1';");
   await r.fulfill({contentType:'text/javascript',body:s});
  });
  const url=process.env.IGNICAO_URL||'http://127.0.0.1:4173/';
  const check=async(name,fn)=>{await exigirFoco(page);try{await fn();}finally{await exigirFoco(page);}assert.deepEqual(errors,[],name+': console');assert.ok(await page.evaluate(()=>!document.hidden&&document.hasFocus()),name+': Chrome fora de primeiro plano');console.log('OK',name);};
  await page.goto(url);await page.bringToFront();await exigirFoco(page);
  await check('pagina abre sem erro (declaracao duplicada de veias)',async()=>{
   assert.deepEqual(errors,[],'Erro ao abrir a pagina');
   await page.waitForFunction(()=>window.NARR&&window.__reg,null,{timeout:30000}).catch(e=>{throw Error(errors.join('\n')||e.message);});
  });
  const visible=()=>page.evaluate(()=>[...document.querySelectorAll('.narr-cena,.narr-texto-camada')].filter(e=>e.querySelector('.mom-bloco')?.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&+getComputedStyle(e).opacity>.5&&e.getAttribute('aria-hidden')!=='true').flatMap(e=>[...e.querySelectorAll('.mom-bloco')].filter(b=>b.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(()=>e.dataset.cena)));
  await check('saudacao nao pisca nem some',async()=>{
   // Mede a partir da montagem da narrativa, sem incluir download de CDNs.
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-cena="ola"]')].some(e=>+getComputedStyle(e).opacity>.5),null,{timeout:1200});
   await page.evaluate(()=>new Promise((resolve,reject)=>{
    const inicio=performance.now();
    function quadro(){
     const visivel=[...document.querySelectorAll('[data-cena="ola"]')].some(e=>+getComputedStyle(e).opacity>.5&&e.querySelector('.mom-bloco')?.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}));
     if(!visivel)return reject(Error('Saudacao sumiu antes de 10 s'));
     if(performance.now()-inicio>=10000)return resolve();
     requestAnimationFrame(quadro);
    }
    quadro();
   }));
  });
  await check('teclas reais, Enter replica e trava conversa',async()=>{
   await page.locator('.conv-pergunta').waitFor();await page.keyboard.type('Tudo bem chefe',{delay:60});
   await page.waitForFunction(()=>document.querySelector('.conv-caio')?.textContent==='Tudo bem chefe');
   await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.conv-jarvis')?.textContent.length>10);
   await page.waitForTimeout(1500);const before=await page.locator('.conv-caio').textContent();
   await page.keyboard.type('nao pode');assert.equal(await page.locator('.conv-caio').textContent(),before);
  });
  await check('recarregar no meio volta ao topo',async()=>{
   await page.evaluate(()=>scrollTo(0,2000));assert.ok(await page.evaluate(()=>scrollY>0),'Precondicao: pagina nao chegou ao meio');await page.reload();await page.waitForFunction(()=>window.NARR&&window.__reg);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>scrollY),0);
  });
  await check('antes do PIN monitores pretos e nucleo baixo',async()=>{
   assert.ok(await page.evaluate(()=>__reg.proto.modulos.every(m=>{
    const pixels=m.ctx.getImageData(0,0,m.cv.width,m.cv.height).data;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]>12||pixels[i+1]>12||pixels[i+2]>12)return false;
    return true;
   })),'Monitor contem dados/luz antes do PIN');
   await page.waitForFunction(()=>__reg.energiaAntes.length>0);
   assert.ok(await page.evaluate(()=>__reg.energiaAntes.every(v=>Number.isFinite(v)&&v<=.25)), 'Energia excedeu 0,25 antes do PIN');
  });
  await check('PIN recebe foco sem clique',async()=>{
   await page.evaluate(()=>NARR.irAoAcesso());await esperarAcesso(page);await page.waitForFunction(()=>document.activeElement?.type==='password');
  });
  await page.keyboard.type('12345678',{delay:35});
  await page.waitForFunction(()=>NARR.emB()).catch(async error=>{
   await exigirFoco(page);
   console.error('Estado apos PIN',await page.evaluate(()=>({scene:NARR.cenaEm(NARR.progresso()),p:NARR.progresso(),pending:NARR.acessoPendente(),portal:__reg.ignicao(),focus:document.activeElement?.id,pinLength:document.querySelector('#cenaPin')?.value.length})));
   throw error;
  });await page.waitForFunction(()=>__reg.pronta());
  await check('um texto por parada e zero nas passagens',async()=>{
   for(const id of ['situacao','gabinete','planilha','assistente','painel','pedalada','atrasos','cacador','planeta','fecho','ponte','retorno']){
    await page.evaluate(id=>__reg.nav(id),id);await page.waitForFunction(id=>NARR.cenaEm(NARR.progresso())===id,id);await page.waitForTimeout(800);
    const ids=await visible();assert.deepEqual(ids,['ponte','retorno'].includes(id)?[]:[id],id+': '+ids);
   }
  });
  await check('arranque e explosao nao emitem continuamente',async()=>{
   const resultados=await page.evaluate(()=>{
    return ['arranque','explosao'].map(tipo=>{
     let quadro;
     const mapa={depurar:()=>__reg.mapa.depurar(),aoQuadro:fn=>{quadro=fn;return ()=>{};},nucleoMundo:()=>new THREE.Vector3()};
     const ign=Ignicao.criar(mapa,{E:1});
     try {
      ign[tipo]();
      quadro(1/60);
      const iniciais=new Set(ign._sistema.emitters.flatMap(e=>e.particles));
      let novas=0;
      for(let i=0;i<600;i++){
       quadro(1/60);
       novas+=ign._sistema.emitters.flatMap(e=>e.particles).filter(p=>!iniciais.has(p)).length;
      }
      return {tipo,iniciais:iniciais.size,novas,finais:ign._sistema.emitters.reduce((n,e)=>n+e.particles.length,0)};
     } finally {ign.destruir();}
    });
   });
   for(const r of resultados){
    assert.ok(r.iniciais>0,r.tipo+': nenhuma particula emitida');
    assert.equal(r.novas,0,r.tipo+': continuou emitindo depois da rajada');
    assert.equal(r.finais,0,r.tipo+': particulas retidas apos a vida');
   }
  });
  await check('terminar nao deixa veias nem listeners',async()=>{
   assert.ok(await page.evaluate(()=>{const {malhaVeias,mapa,ouvintes}=__reg;NARR.terminar();return ouvintes.length===0&&!__listenersAtivos.some(x=>__reg.registrados.includes(x.fn))&&!mapa.depurar().scene.children.includes(malhaVeias.grupo)&&malhaVeias.grupo.children.length===0;}),'terminar reteve veias ou listeners reais');
  });
  await page.reload();await page.waitForFunction(()=>window.NARR&&window.__reg);await page.evaluate(()=>NARR.irAoAcesso());await esperarAcesso(page);await page.waitForFunction(()=>document.activeElement?.type==='password');await page.keyboard.type('12345678',{delay:35});
  await page.waitForFunction(()=>__reg.ignicao());await page.waitForTimeout(600);
  await check('interromper ignicao nao prende rolagem',async()=>{
   assert.ok(await page.evaluate(()=>{NARR.terminar();const e=new WheelEvent('wheel',{deltaY:100,cancelable:true});dispatchEvent(e);return !e.defaultPrevented;}));
   // Garante espaco rolavel mesmo quando a central cabe toda na viewport.
   await page.evaluate(()=>{const espaco=document.createElement('div');espaco.style.height='300vh';document.body.appendChild(espaco);scrollTo(0,0);});
   const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,500);await page.waitForTimeout(400);assert.ok(await page.evaluate(y=>scrollY>y,before));
  });
  console.log('Regressao completa passou');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
