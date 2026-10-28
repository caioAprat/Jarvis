import * as THREE from 'three';
import {TOKENS,installDesignTokens} from './DesignTokens.js';
import {createSceneSetup} from './SceneSetup.js';
import {JarvisEntity,createEntityResources} from './JarvisEntity.js';
import {createBackgroundParallax} from './BackgroundParallax.js';
import {createParticles} from './Particles.js';
import {createDocumentTexture,createConnections} from './Connections.js';
import {createGSAPAnimations} from './GSAPAnimations.js';
import {projectEntityBounds,findEntityOverlaps} from './SpatialLayout.js';

installDesignTokens();
const names={ok:'No ar',atencao:'Atenção',erro:'Problema',aguardando:'Aguardando',config:'Configurar',pausado:'Pausado'};

function montar(options={}) {
  const el=document.createElement('div');el.className='cena-2d cena-3d';
  el.innerHTML='<div class="scene-fallback" aria-hidden="true"><i></i><i></i></div><div class="cena-boot" role="status">Conectando seu universo…</div><div class="cena-rotulos"></div>';
  const boot=el.querySelector('.cena-boot'),labels=el.lastElementChild;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const state={ready:false,failed:false,reduced:media.matches,progress:0,focus:-1,chapter:0,activeText:null,motion:{heroYaw:0,heroScale:1,heroLift:0,background:0}};
  let setup,resources,documentTexture,hero,background,particles,connections;
  let nodes=[],projects=[],journeyRoot=null,dead=false,paused=false,mode='palco',loop=false;
  let heroSide=.19;
  let time=0,frames=0,slow=0,quality=1,firstRender=null,flashTween=null;
  const shaderErrors=[],screenBounds=[];
  const pointer=new THREE.Vector2(),target=new THREE.Vector2();
  const ui=createGSAPAnimations(state,()=>render(0));
  const compact=()=>innerWidth<=700;

  function fail(error) {
    state.failed=true;el.dataset.failure=String(error);el.dataset.fallback='true';
    document.body.classList.add('scene-ready');boot.hidden=false;
    boot.textContent='Visual 3D indisponível · seus controles continuam disponíveis';
    if(setup)setup.renderer.domElement.hidden=true;
    ui.attach(journeyRoot);sync();
  }

  function rebuild() {
    if(!resources||!documentTexture||!hero)return;
    connections?.dispose();labels.replaceChildren();
    // Os projetos pertencem ao DOM. Não há mini-planetas nem hit targets 3D.
    nodes=projects.map(project=>({project}));
    connections=createConnections(hero,setup.world,documentTexture);
    if(journeyRoot)ui.attach(journeyRoot);
    render(0);
  }

  function resize() {
    if(!setup)return;
    setup.resize(quality);ui.refresh();render(0);
  }

  function render(dt) {
    if(!state.ready||state.failed||dead)return;
    const {camera,world,renderer}=setup,w=innerWidth,h=innerHeight,mobile=compact();
    const height=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z,width=height*camera.aspect;
    pointer.lerp(target,1-Math.exp(-dt*5));
    const rect=state.activeText?.getBoundingClientRect();
    const centerY=mobile?Math.min(h*.29,(rect?.top||h*.55)*.5):h*.48;
    const scale=mobile?Math.max(.3,Math.min(.95,((rect?.top||h*.55)-40)*.5/2.2*height/h)):1.7;
    heroSide=THREE.MathUtils.damp(heroSide,state.motion.heroSide??.19,4,dt);
    world.scale.setScalar(scale);world.position.set((mobile?0:(state.motion.heroSide??.15))*width,(.5-centerY/h)*height,0);
    world.rotation.set(pointer.y*.025,pointer.x*.035,0);
    hero.group.position.y=state.motion.heroLift;
    hero.update(time,state.motion);resources.update(time,state.progress);
    background.update(time,state.motion.background,pointer);
    particles.update(time,state.progress,pointer,[],renderer.getPixelRatio());
    setup.scene.updateMatrixWorld(true);camera.updateMatrixWorld();

    // Barreiras HTML são medidas uma vez por frame, não por partícula.
    const reserved=[rect,...document.querySelectorAll('.stats-dock,.dock')].filter(Boolean).map(r=>r.getBoundingClientRect?r.getBoundingClientRect():r);
    screenBounds.length=0;
    screenBounds.push(projectEntityBounds(hero,camera,w,h));
    background.protectReading(camera,reserved,screenBounds);
    connections.update(time,state.progress,mobile,camera,reserved);
    setup.render();frames++;
    if(firstRender===null)firstRender=performance.now();
    if(window.__jarvisMeasure?.sampling)window.__jarvisMeasure.frames.push(performance.now());
  }

  function tick(_,delta) {
    if(paused||document.hidden||mode==='fundo'||state.failed)return;
    const dt=Math.min(delta/1000,.06);time+=dt;
    slow=delta>35?slow+Math.min(delta,100):Math.max(0,slow-30);
    if(slow>4000&&quality===1){quality=.65;el.dataset.quality='adaptativa';resize();}
    render(dt);
  }

  function sync() {
    const active=state.ready&&!dead&&!state.failed&&!paused&&!document.hidden&&mode!=='fundo';
    const animated=active&&!state.reduced;
    if(animated&&!loop){gsap.ticker.add(tick);loop=true;}
    if(!animated&&loop){gsap.ticker.remove(tick);loop=false;}
    if(active)render(0);
  }

  const onMotion=()=>{state.reduced=media.matches;target.set(0,0);pointer.set(0,0);ui.attach(journeyRoot);sync();};
  const onVisibility=()=>sync();
  const onScroll=()=>{ui.scroll();if(state.reduced)render(0);};
  const onPointer=e=>{if(!state.reduced&&e.pointerType!=='touch')target.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);};
  const resetPointer=()=>target.set(0,0);
  const onLost=e=>{e.preventDefault();fail('Contexto WebGL perdido');};
  const listeners=[[window,'resize',resize],[window,'pointermove',onPointer],[window,'blur',resetPointer],[window,'scroll',onScroll],[document,'visibilitychange',onVisibility],[media,'change',onMotion]];
  listeners.forEach(([target,event,handler])=>target.addEventListener(event,handler,{passive:event==='scroll'||event==='pointermove'}));

  async function initialize() {
    try {
      setup=createSceneSetup();
      setup.renderer.domElement.setAttribute('aria-hidden','true');el.prepend(setup.renderer.domElement);
      setup.renderer.domElement.addEventListener('webglcontextlost',onLost);
      setup.renderer.debug.onShaderError=(gl,program)=>{shaderErrors.push(gl.getProgramInfoLog(program)||'Shader inválido');fail(shaderErrors[0]);};
      background=createBackgroundParallax(setup.scene);
      particles=createParticles(setup.scene,setup.world,compact());resize();
      const loaded=await Promise.allSettled([createEntityResources(),createDocumentTexture()]);
      if(dead||loaded.some(r=>r.status==='rejected')){
        loaded.forEach(r=>{if(r.status==='fulfilled')r.value.dispose();});
        if(!dead)fail(loaded.find(r=>r.status==='rejected').reason);
        return;
      }
      resources=loaded[0].value;documentTexture=loaded[1].value;
      hero=new JarvisEntity(resources,{hero:true});setup.world.add(hero.group);
      state.ready=true;el.dataset.ready='true';boot.hidden=true;document.body.classList.add('scene-ready');
      rebuild();sync();
    }catch(error){fail(error);}
  }
  initialize();

  return {
    el,
    atualizar(ps){if(JSON.stringify(ps)!==JSON.stringify(projects)){projects=ps.map(p=>({...p}));rebuild();}},
    selecionar(){},rolagem(){},
    modo(value){mode=value;el.hidden=value==='fundo';sync();},
    pausar(value){paused=value;sync();},
    varredura(){if(!state.reduced&&setup){flashTween?.kill();flashTween=gsap.fromTo(setup.bloom,{strength:.85},{strength:TOKENS.bloom.strength,duration:1});}},
    jornada(root){journeyRoot=root;if(state.ready||state.failed)ui.attach(root);},
    depurar(){return {
      ready:state.ready,failed:state.failed,renderer:'Three.js WebGL2',firstRender,frames,ticks:frames,quality,loop,reduced:state.reduced,
      progress:state.progress,chapter:state.chapter,motion:{heroYaw:state.motion.heroYaw,heroScale:state.motion.heroScale,heroLift:state.motion.heroLift,background:state.motion.background},projects:nodes.length,connections:connections?.veins.length||0,
      projectRepresentation:'DOM plasma',smoothScroll:ui.smooth,packets:connections?.packets.length||0,trafficDrawCalls:connections?1:0,instancedTraffic:!!connections?.instances.isInstancedMesh,
      entities:[hero].filter(Boolean).map(e=>({generator:e.group.userData.kind,meshes:e.group.children.length,earthMaterial:e.shell.material===resources?.materials.earth})),
      entityBounds:screenBounds.map(b=>({...b})),entityOverlaps:findEntityOverlaps(screenBounds),coreBounds:screenBounds[0]||null,
      resolution:setup?.renderer.getPixelRatio(),shaderErrors,drawCalls:setup?.renderer.info.render.calls,geometries:setup?.renderer.info.memory.geometries,textures:setup?.renderer.info.memory.textures,
      backgrounds:background?.planets.map(p=>({x:p.group.position.x,y:p.group.position.y,z:p.group.position.z,kind:p.group.userData.kind,rings:p.group.children.length-1}))||[],
      endpoints:nodes.map(n=>({id:n.project.id,anchor: 'DOM plasma',status:n.project.status}))
    };},
    destruir(){
      dead=true;sync();flashTween?.kill();ui.dispose();listeners.forEach(([target,event,handler])=>target.removeEventListener(event,handler));
      connections?.dispose();hero?.dispose();resources?.dispose();documentTexture?.dispose();
      background?.dispose();particles?.dispose();setup?.dispose();el.remove();
    }
  };
}

window.CenaJarvis={montar,cores:TOKENS.status,nomes:names};
