'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const mutant=process.argv.find(a=>a.startsWith('--mutacao='))?.split('=')[1];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:false});
 try {
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'no-preference'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/landing-roteiro.js*',async r=>{
   let s=fs.readFileSync(path.join(root,'landing-roteiro.js'),'utf8');
   const replace=(a,b)=>{assert.equal(s.split(a).length,2,'Sonda desatualizada: '+a);s=s.replace(a,b);};
   replace('const planeta =','window.__reg={mapa,proto,ouvintes,malhaVeias,ign}; const planeta =');
   replace('function irCena(c) {','window.__reg.nav=id=>irCena(cenas.find(c=>c.id===id)); window.__reg.cenas=()=>cenas; window.__reg.ignicao=()=>!!portalDados; window.__reg.pronta=()=>!portalDados&&!passeioAutomatico&&(!lenis||!lenis.isLocked); function irCena(c) {');
   if(mutant==='declaracao')s+='\nconst veias=1; const veias=2;';
   if(mutant==='saudacao')replace("c.el.style.opacity='1';","c.el.style.opacity=c.id==='ola'?'0':'1';");
   await r.fulfill({contentType:'text/javascript',body:s});
  });
  const url=process.env.IGNICAO_URL||'http://127.0.0.1:4173/';
  const check=async(name,fn)=>{await fn();assert.deepEqual(errors,[],name+': console');assert.ok(await page.evaluate(()=>!document.hidden&&document.hasFocus()),name+': Chrome fora de primeiro plano');console.log('OK',name);};
  await page.goto(url);await page.bringToFront();
  await check('pagina abre sem erro (declaracao duplicada de veias)',async()=>{
   assert.deepEqual(errors,[],'Erro ao abrir a pagina');
   await page.waitForFunction(()=>window.NARR&&window.__reg,null,{timeout:30000}).catch(e=>{throw Error(errors.join('\n')||e.message);});
  });
  const visible=()=>page.evaluate(()=>[...document.querySelectorAll('.narr-cena,.narr-texto-camada')].filter(e=>e.querySelector('.mom-bloco')?.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&+getComputedStyle(e).opacity>.5&&e.getAttribute('aria-hidden')!=='true').map(e=>e.dataset.cena));
  await check('saudacao nao pisca nem some',async()=>{
   // Mede a partir da montagem da narrativa, sem incluir download de CDNs.
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-cena="ola"]')].some(e=>+getComputedStyle(e).opacity>.5),null,{timeout:1200});
   for(let i=0;i<20;i++){assert.ok((await visible()).includes('ola'));await page.waitForTimeout(500);}
  });
  await check('teclas reais, Enter replica e trava conversa',async()=>{
   await page.locator('.conv-pergunta').waitFor();await page.keyboard.type('Tudo bem chefe',{delay:60});
   await page.waitForFunction(()=>document.querySelector('.conv-caio')?.textContent==='Tudo bem chefe');
   await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.conv-jarvis')?.textContent.length>10);
   await page.waitForTimeout(1500);const before=await page.locator('.conv-caio').textContent();
   await page.keyboard.type('nao pode');assert.equal(await page.locator('.conv-caio').textContent(),before);
  });
  await check('recarregar no meio volta ao topo',async()=>{
   await page.evaluate(()=>scrollTo(0,2000));await page.reload();await page.waitForFunction(()=>window.NARR&&window.__reg);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>scrollY),0);
  });
  await check('antes do PIN monitores pretos e nucleo baixo',async()=>{
   assert.ok(await page.evaluate(()=>__reg.proto.modulos.every(m=>{
    const pixels=m.ctx.getImageData(0,0,m.cv.width,m.cv.height).data;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]>12||pixels[i+1]>12||pixels[i+2]>12)return false;
    return true;
   })),'Monitor contem dados/luz antes do PIN');
   // Sonda registra energia real entregue ao mapa durante o PIN.
   await page.evaluate(()=>{const f=__reg.mapa.energia;__reg.mapa.energia=v=>{__reg.energia=v;return f(v);};});
   await page.waitForFunction(()=>Number.isFinite(__reg.energia)&&__reg.energia<=.25);
  });
  await check('PIN recebe foco sem clique',async()=>{
   await page.evaluate(()=>NARR.irAoAcesso());await page.waitForFunction(()=>document.activeElement?.type==='password');
  });
  await page.keyboard.type('12345678',{delay:35});
  await page.waitForFunction(()=>NARR.emB());await page.waitForFunction(()=>__reg.pronta());
  await check('um texto por parada e zero nas passagens',async()=>{
   for(const id of ['situacao','gabinete','planilha','assistente','painel','pedalada','atrasos','cacador','planeta','fecho','ponte','retorno']){
    await page.evaluate(id=>__reg.nav(id),id);await page.waitForFunction(id=>NARR.cenaEm(NARR.progresso())===id,id);await page.waitForTimeout(800);
    const ids=await visible();assert.equal(ids.length,['ponte','retorno'].includes(id)?0:1,id+': '+ids);
   }
  });
  await check('arranque e explosao nao emitem continuamente',async()=>{
   await page.evaluate(()=>{__reg.ign.arranque();__reg.ign.explosao();});
   await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>__reg.ign._sistema.emitters.some(e=>e.particles.length>0)));
   await page.waitForFunction(()=>__reg.ign._sistema.emitters.every(e=>e.particles.length===0),null,{timeout:15000});
  });
  await check('terminar nao deixa veias nem listeners',async()=>{
   assert.ok(await page.evaluate(()=>{const {malhaVeias,mapa,ouvintes}=__reg;NARR.terminar();return ouvintes.length===0&&!mapa.depurar().scene.children.includes(malhaVeias.grupo)&&malhaVeias.grupo.children.length===0;}));
  });
  await page.reload();await page.waitForFunction(()=>window.NARR&&window.__reg);await page.evaluate(()=>NARR.irAoAcesso());await page.waitForFunction(()=>document.activeElement?.type==='password');await page.keyboard.type('12345678',{delay:35});
  await page.waitForFunction(()=>__reg.ignicao());await page.waitForTimeout(600);
  await check('interromper ignicao nao prende rolagem',async()=>{
   assert.ok(await page.evaluate(()=>{NARR.terminar();const e=new WheelEvent('wheel',{deltaY:100,cancelable:true});dispatchEvent(e);return !e.defaultPrevented;}));
   const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,500);await page.waitForTimeout(400);assert.ok(await page.evaluate(y=>scrollY!==y||document.documentElement.scrollHeight<=innerHeight,before));
  });
  console.log('Regressao completa passou');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
