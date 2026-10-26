// Captura offline da versão original. Instrumentação somente na resposta ao navegador.
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('/workspace/.jarvis-audit-tools/node_modules/playwright');
const root=path.resolve(__dirname,'../..');
const out='/workspace/.jarvis-capture';fs.mkdirSync(out,{recursive:true});
const source=execFileSync('git',['show','f2e11e69e435e4b9394f69f35fea9acc03e51ad0:mapa-vivo.js'],{cwd:root,encoding:'utf8'});
const modified=source.replace('alpha: !FUNDO','alpha: true, preserveDrawingBuffer: true').replace('renderer.setClearColor(0x080706, 1)','renderer.setClearColor(0x000000, 0)').replace('return { el, depurar:', 'return { el, capture: { renderer, scene, camera, nucleo, tilt, plasma, interior, casca, malha, aneis, arcos, glow, glowMat, ro, io, desligar, nos, T_GLOW, aditivo }, depurar:');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
 try{
  const page=await browser.newPage({viewport:{width:1024,height:1024},deviceScaleFactor:1});
  page.on('requestfailed', r=>console.log('Falha de recurso',r.url(),r.failure()?.errorText)); page.on('console',m=>{if(m.type()==='error')console.log(m.text());});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/capture.html',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><head><style>html,body{margin:0;background:transparent}canvas{display:block}</style></head><body><script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" integrity="sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt" crossorigin="anonymous"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" integrity="sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu" crossorigin="anonymous"></script><script src="/mapa-vivo.js"></script></body></html>`}));
  await page.route('**/mapa-vivo.js',r=>r.fulfill({contentType:'application/javascript',body:modified}));
  await page.goto('http://127.0.0.1:8000/capture.html',{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   const map=MapaVivo.montar({fundo:true});if(!map)throw Error('Renderizador original indisponível');
   window.cap=map.capture;const c=window.cap;c.ro.disconnect();c.io.disconnect();c.desligar();gsap.globalTimeline.clear();gsap.ticker.sleep();
   c.scene.children.forEach(x=>x.visible=x===c.tilt);c.tilt.rotation.set(0,0,0);c.nucleo.scale.setScalar(1);c.nucleo.rotation.set(0,0,0);
   c.camera.position.set(0,3.5,10);c.camera.lookAt(0,0,0);c.camera.aspect=1;c.camera.updateProjectionMatrix();
   c.renderer.setPixelRatio(1);c.renderer.setSize(384,384);c.renderer.setClearColor(0,0);document.body.replaceChildren(c.renderer.domElement);
   window.drawCapture=(layer,frame,total,size)=>{
    c.renderer.setSize(size,size);c.nucleo.children.forEach(x=>x.visible=false);
    c.nucleo.rotation.y=frame/total*Math.PI*2;
    if(layer==='rede'){c.casca.visible=c.malha.visible=true;c.camera.position.set(0,1.6,6.2);}
    else if(layer==='nucleo'){c.interior.visible=c.plasma.visible=true;c.camera.position.set(0,1,4);}
    else if(layer==='aneis'){c.aneis.forEach(x=>x.visible=true);c.arcos.forEach(x=>x.m.visible=true);c.camera.position.set(0,5.5,13.5);}
    else if(layer==='composicao'){c.nucleo.children.forEach(x=>x.visible=true);c.camera.position.set(0,4.5,13.5);}
    c.camera.lookAt(0,0,0);c.renderer.render(c.scene,c.camera);return c.renderer.domElement.toDataURL('image/png').split(',')[1];
   };
  });
  for(const layer of ['nucleo','aneis','composicao']){
   const data=await page.evaluate(layer=>drawCapture(layer,0,1,512),layer);fs.writeFileSync(path.join(out,layer+'.png'),Buffer.from(data,'base64'));
  }
  for(let i=0;i<96;i++){
   const data=await page.evaluate(i=>drawCapture('rede',i,96,384),i);fs.writeFileSync(path.join(out,`rede-${String(i).padStart(3,'0')}.png`),Buffer.from(data,'base64'));
   if(i%24===0)console.log('rede',i,'/96');
  }
  await page.evaluate(()=>{
   const c=cap;c.scene.children.forEach(x=>x.visible=false);
   c.gem=new THREE.Group();c.scene.add(c.gem);
   c.gem.add(new THREE.Mesh(new THREE.OctahedronGeometry(.8),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true})),new THREE.Mesh(new THREE.OctahedronGeometry(.4),new THREE.MeshBasicMaterial({color:0xffffff})));
   c.camera.position.set(0,.6,3.1);c.camera.lookAt(0,0,0);c.renderer.setSize(96,96);
  });
  for(let i=0;i<64;i++){
   const data=await page.evaluate(i=>{const c=cap;c.gem.rotation.set(.35,i/64*Math.PI*2,.1);c.renderer.render(c.scene,c.camera);return c.renderer.domElement.toDataURL('image/png').split(',')[1]},i);
   fs.writeFileSync(path.join(out,`gema-${String(i).padStart(3,'0')}.png`),Buffer.from(data,'base64'));
  }
  // Captura original composta com alpha para referência de arte, via Playwright.
  await page.evaluate(()=>{cap.gem.visible=false;cap.tilt.visible=true;drawCapture('composicao',0,1,512)});
  await page.screenshot({path:path.join(root,'docs/migracao-2d/amostras/nucleo-original.png'),omitBackground:true,clip:{x:0,y:0,width:512,height:512}});
  fs.writeFileSync(path.join(out,'captura.json'),JSON.stringify({source:'f2e11e69e435e4b9394f69f35fea9acc03e51ad0',networkFrames:96,networkFrameSize:384,gemFrames:64,gemFrameSize:96,errors},null,2));
  if(errors.length)throw Error(errors.join('\n'));console.log('Captura concluída:',out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
