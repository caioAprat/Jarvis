import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createCore,createPlanets,createUniverse,disposeObject,colors,names} from './world.js';
import {createFileTextures,createVeins} from './flow.js';
import {createInterface} from './interface.js';

function montar(options={}){
 const el=document.createElement('div');el.className='cena-2d cena-3d';
 el.innerHTML='<div class="scene-fallback" aria-hidden="true"><i></i><i></i><i></i></div><div class="cena-boot" role="status">Conectando seu universo…</div><div class="cena-rotulos"></div>';
 const boot=el.querySelector('.cena-boot'),labels=el.lastElementChild,media=matchMedia('(prefers-reduced-motion: reduce)');
 const state={ready:false,failed:false,reduced:media.matches,progress:0,focus:-1,chapter:0,activeText:null};
 let renderer,composer,bloom,scene,camera,world,core,universe,flow,textures=[],planets=[],projects=[],journeyRoot=null,dead=false,paused=false,mode='palco',loop=false,time=0,frames=0,slow=0,quality=1,firstRender=null,shaderErrors=[];
 const pointer=new THREE.Vector2(),target=new THREE.Vector2(),raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
 const ui=createInterface(state,()=>render(0));
 const compact=()=>innerWidth<=700;
 function fail(error){state.failed=true;el.dataset.failure=String(error);el.dataset.fallback='true';document.body.classList.add('scene-ready');boot.hidden=false;boot.textContent='Visual 3D indisponível · seus controles continuam disponíveis';if(renderer)renderer.domElement.hidden=true;ui.attach(journeyRoot);sync();el.dispatchEvent(new CustomEvent('cena-fallback',{detail:String(error)}));}
 function rebuild(){
  if(!world||!textures.length)return;flow?.dispose();planets.forEach(p=>{world.remove(p.group);disposeObject(p.group);});
  planets=createPlanets(projects,world);flow=createVeins(planets,world,textures);labels.replaceChildren();
  planets.forEach(p=>{const button=document.createElement('button');button.className='cena-label';button.type='button';button.dataset.status=p.project.status;button.textContent=p.project.nome;button.onclick=()=>options.aoSelecionar?.(p.project.id);labels.appendChild(button);p.label=button;});
  if(journeyRoot)ui.attach(journeyRoot);render(0);
 }
 function resize(){if(!renderer)return;const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();
  const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt((quality<1?650000:1100000)/(w*h)));renderer.setPixelRatio(ratio);renderer.setSize(w,h);composer.setPixelRatio(ratio);composer.setSize(w,h);bloom.setSize(w*ratio*.5,h*ratio*.5);ui.refresh();render(0);
 }
 function screenPoint(v){const p=v.clone().project(camera);return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight};}
 function render(dt){
  if(!state.ready||state.failed||dead||!world)return;
  const w=innerWidth,h=innerHeight,mobile=compact(),height=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z,width=height*camera.aspect;
  pointer.lerp(target,1-Math.exp(-dt*5));
  const rect=state.activeText?.getBoundingClientRect();let centerY=mobile?Math.min(h*.29,(rect?.top||h*.55)*.5):h*.48;
  const scale=mobile?Math.max(.3,Math.min(.95,((rect?.top||h*.55)-40)*.5/2.2*height/h)):1.7;
  world.scale.setScalar(scale);world.position.set((mobile?0:.15)*width,(.5-centerY/h)*height,0);
  world.rotation.set(pointer.y*.035,pointer.x*.055,0);
  core.update(time);planets.forEach((p,i)=>p.update(time,state.focus===i,dt,mobile));
  universe.update(time,state.progress,pointer,planets,renderer.getPixelRatio());flow?.update(time,state.focus,state.progress,mobile);
  scene.updateMatrixWorld(true);camera.updateMatrixWorld();
  const reserved=[rect,...document.querySelectorAll('.stats-dock,.dock')].filter(Boolean).map(r=>r.getBoundingClientRect?r.getBoundingClientRect():r),used=[];
  planets.forEach(p=>{
   const pt=screenPoint(p.group.getWorldPosition(new THREE.Vector3())),r={left:pt.x-78,right:pt.x+78,top:pt.y+22,bottom:pt.y+65};
   const overlap=a=>a.left<r.right&&a.right>r.left&&a.top<r.bottom&&a.bottom>r.top;
   const visible=state.progress<.025&&r.left>0&&r.right<w&&r.top>95&&r.bottom<h-110&&!reserved.concat(used).some(overlap);
   if(visible)used.push(r);p.label.style.transform=`translate(${pt.x}px,${pt.y+22}px) translateX(-50%)`;p.label.style.visibility=visible?'visible':'hidden';p.label.tabIndex=visible?0:-1;
  });
  // Sprites preservam a legibilidade das superfícies HTML, inclusive em transições.
  const visiblePackets=[];
  flow?.packets.slice().sort((a,b)=>Number(b.vein.index===state.focus)-Number(a.vein.index===state.focus)).forEach(p=>{if(!p.sprite.visible)return;const pt=screenPoint(p.sprite.getWorldPosition(new THREE.Vector3()));if(reserved.some(r=>pt.x>r.left-16&&pt.x<r.right+16&&pt.y>r.top-20&&pt.y<r.bottom+20)||visiblePackets.some(q=>Math.abs(q.x-pt.x)<30&&Math.abs(q.y-pt.y)<38))p.sprite.visible=false;else visiblePackets.push(pt);});
  renderer.info.reset();composer.render();frames++;if(firstRender===null)firstRender=performance.now();
  if(window.__jarvisMeasure?.sampling)window.__jarvisMeasure.frames.push(performance.now());
 }
 function tick(_,delta){if(paused||document.hidden||mode==='fundo'||state.failed)return;const dt=Math.min(delta/1000,.06);time+=dt;
  slow=delta>35?slow+Math.min(delta,100):Math.max(0,slow-30);if(slow>4000&&quality===1){quality=.65;el.dataset.quality='adaptativa';resize();}render(dt);
 }
 function sync(){const active=state.ready&&!dead&&!state.failed&&!paused&&!document.hidden&&mode!=='fundo',animated=active&&!state.reduced;if(animated&&!loop){gsap.ticker.add(tick);loop=true;}if(!animated&&loop){gsap.ticker.remove(tick);loop=false;}if(active)render(0);}
 const onMotion=()=>{state.reduced=media.matches;target.set(0,0);pointer.set(0,0);ui.attach(journeyRoot);sync();},onVisibility=()=>sync(),onScroll=()=>{ui.scroll();if(state.reduced)render(0);};
 const onPointer=e=>{if(state.reduced||e.pointerType==='touch')return;target.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);},resetPointer=()=>target.set(0,0);
 const onClick=e=>{if(mode==='fundo'||!state.ready||state.failed||e.target.closest('button,a,input,textarea,select,.viagem-texto,.stats-dock'))return;ndc.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(ndc,camera);const hit=raycaster.intersectObjects(planets.map(p=>p.globe))[0];if(hit){const p=planets.find(p=>p.globe===hit.object);options.aoSelecionar?.(p.project.id);}};
 const lost=e=>{e.preventDefault();fail('Contexto WebGL perdido');};
 window.addEventListener('resize',resize);window.addEventListener('pointermove',onPointer,{passive:true});window.addEventListener('blur',resetPointer);window.addEventListener('click',onClick);window.addEventListener('scroll',onScroll,{passive:true});document.addEventListener('visibilitychange',onVisibility);media.addEventListener('change',onMotion);
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'high-performance'});renderer.info.autoReset=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.domElement.setAttribute('aria-hidden','true');el.prepend(renderer.domElement);renderer.domElement.addEventListener('webglcontextlost',lost);
  renderer.debug.onShaderError=(gl,program)=>{shaderErrors.push(gl.getProgramInfoLog(program)||'Shader inválido');fail(shaderErrors[0]);};
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,100);camera.position.z=18;
  world=new THREE.Group();scene.add(world);core=createCore();world.add(core.group);universe=createUniverse(scene,world,compact());
  composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.72,.5,1.05);composer.addPass(bloom);composer.addPass(new OutputPass());resize();
  createFileTextures().then(result=>{if(dead){result.forEach(t=>t.dispose());return;}textures=result;state.ready=true;el.dataset.ready='true';boot.hidden=true;document.body.classList.add('scene-ready');rebuild();sync();}).catch(fail);
 }catch(error){fail(error);}
 return {el,atualizar(ps){if(JSON.stringify(ps)===JSON.stringify(projects))return;projects=ps.map(p=>({...p}));rebuild();},selecionar(){},modo(value){mode=value;el.hidden=value==='fundo';sync();},rolagem(){},pausar(value){paused=value;sync();},varredura(){if(!state.reduced&&bloom)gsap.fromTo(bloom,{strength:1},{strength:.72,duration:1});},jornada(root){journeyRoot=root;if(state.ready||state.failed)ui.attach(root);},
  depurar(){const c=world&&camera?screenPoint(world.getWorldPosition(new THREE.Vector3())):null;const edge=c?screenPoint(world.localToWorld(new THREE.Vector3(1.8,0,0))):null;const radius=c?Math.abs(edge.x-c.x):0;return {ready:state.ready,failed:state.failed,renderer:'Three.js WebGL2',firstRender,frames,ticks:frames,quality,loop,reduced:state.reduced,progress:state.progress,chapter:state.chapter,projects:planets.length,connections:flow?.veins.length||0,packets:flow?.packets.length||0,coreBounds:c?{x:c.x-radius,y:c.y-radius,width:radius*2,height:radius*2}:null,resolution:renderer?.getPixelRatio(),shaderErrors,drawCalls:renderer?.info.render.calls,geometries:renderer?.info.memory.geometries,textures:renderer?.info.memory.textures,backgrounds:universe?.layers.map(p=>({x:p.position.x,y:p.position.y,visible:p.visible}))||[],endpoints:planets.map(p=>({id:p.project.id,x:p.group.position.x,y:p.group.position.y,status:p.project.status}))};},
  destruir(){dead=true;sync();ui.dispose();window.removeEventListener('resize',resize);window.removeEventListener('pointermove',onPointer);window.removeEventListener('blur',resetPointer);window.removeEventListener('click',onClick);window.removeEventListener('scroll',onScroll);document.removeEventListener('visibilitychange',onVisibility);media.removeEventListener('change',onMotion);if(scene)disposeObject(scene);textures.forEach(t=>t.dispose());universe?.dot.dispose();composer?.passes.forEach(p=>p.dispose?.());composer?.dispose();renderer?.dispose();el.remove();}
 };
}
window.CenaJarvis={montar,cores:colors,nomes:names};
