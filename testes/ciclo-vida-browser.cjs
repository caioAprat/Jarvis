'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {abrirChrome,vigiarFoco,exigirFoco}=require('./ambiente-browser.cjs');
(async()=>{
 const browser=await abrirChrome();
 try {
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  await vigiarFoco(page);
  await page.route('**/landing-roteiro.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'../landing-roteiro.js'),'utf8').replace('const planeta =','window.__lifecycle={mapa,proto,ouvintes}; const planeta =').replace('const veias =','window.__lifecycle.planeta=planeta; const veias =')}));
  await page.goto(process.env.IGNICAO_URL||'http://127.0.0.1:4173/'); await page.bringToFront();await exigirFoco(page);
  await page.waitForFunction(()=>window.NARR&&window.__lifecycle);
  const result=await page.evaluate(async()=>{
   const {mapa,proto,planeta,ouvintes}=__lifecycle,dep=mapa.depurar();
   const check=(ok,message)=>{if(!ok)throw Error(message);};
   // Conta eventos dispose reais, incluindo recursos compartilhados no mesmo objeto.
   function watch(root){const resources=new Set();root.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of [].concat(o.material||[])){resources.add(m);for(const v of Object.values(m))if(v&&v.isTexture)resources.add(v);}});const counts=new Map();resources.forEach(r=>{counts.set(r,0);r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));});return ()=>check([...counts.values()].every(n=>n===1),'Recurso não descartado exatamente uma vez');}
   const p=watch(proto.raiz),q=watch(planeta.grupo);check(ouvintes.length>=4,'Listeners não registrados');
   const narr=NARR;narr.terminar();narr.terminar();p();q();check(ouvintes.length===0,'Listeners retidos');
   check(!dep.scene.children.includes(proto.raiz)&&!dep.scene.children.includes(planeta.grupo),'Objeto retido na cena');
   dispatchEvent(new Event('resize')); dispatchEvent(new Event('pagehide'));
   check(!dep.renderer.getContext().isContextLost(),'Listener pagehide antigo destruiu a central');
   const children=dep.scene.children.length,cycles=[];
   for(let i=0;i<3;i++){
    const a=Prototipo.montar(mapa,{projetos:[{id:'teste',status:'ok'}]}),b=Planeta.montar(mapa,{});
    const wa=watch(a.raiz),wb=watch(b.grupo);a.aparecer(1);b.mostrar(1);dep.renderer.render(dep.scene,dep.camera);
    a.destruir();b.destruir();a.destruir();b.destruir();wa();wb();
    dep.renderer.render(dep.scene,dep.camera);check(dep.scene.children.length===children,'Filhos acumulados');cycles.push({...dep.renderer.info.memory});
   }
   check(cycles.every(c=>c.geometries===cycles[0].geometries&&c.textures===cycles[0].textures),'Memória GPU cresceu');
   return {cycles,listeners:ouvintes.length};
  });
  await exigirFoco(page);assert.equal(errors.length,0,errors.join('\n')); console.log(JSON.stringify(result,null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
