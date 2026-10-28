import * as THREE from 'three';
import {TOKENS,installDesignTokens} from './DesignTokens.js';
import {createSceneSetup} from './SceneSetup.js';
import {JarvisEntity,createEntityResources} from './JarvisEntity.js';
import {createBackgroundParallax} from './BackgroundParallax.js';
import {createParticles} from './Particles.js';
import {createDocumentTexture,createConnections} from './Connections.js';
import {createGSAPAnimations} from './GSAPAnimations.js';
import {resolveEntityLayout,projectEntityBounds,findEntityOverlaps} from './SpatialLayout.js';

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
  let time=0,frames=0,slow=0,quality=1,firstRender=null,flashTween=null;
  const shaderErrors=[],screenBounds=[];
  const pointer=new THREE.Vector2(),target=new THREE.Vector2(),ndc=new THREE.Vector2();
  const raycaster=new THREE.Raycaster();
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
    connections?.dispose();nodes.forEach(node=>node.entity.dispose());labels.replaceChildren();
    nodes=projects.map((project,i)=>{
      const angle=-Math.PI/2+i*Math.PI*2/Math.max(1,projects.length);
      const entity=new JarvisEntity(resources,{radius:TOKENS.layout.nodeRadius,seed:i+1});
      const home=new THREE.Vector3(Math.cos(angle)*3.1,Math.sin(angle)*2.45,.12);
      entity.group.position.copy(home);setup.world.add(entity.group);
      const label=document.createElement('button');label.type='button';label.className='cena-label';
      label.textContent=project.nome;label.dataset.status=project.status;
      label.onclick=()=>options.aoSelecionar?.(project.id);labels.appendChild(label);
      return {project,entity,group:entity.group,home,target:new THREE.Vector3(),emphasis:0,label};
    });
    connections=createConnections(hero,nodes,setup.world,documentTexture);
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
    world.scale.setScalar(scale);world.position.set((mobile?0:.15)*width,(.5-centerY/h)*height,0);
    world.rotation.set(pointer.y*.025,pointer.x*.035,0);
    hero.group.position.y=state.motion.heroLift;
    hero.update(time,state.motion);resources.update(time,state.progress);
    resolveEntityLayout(hero,nodes,mobile,state.focus,dt);
    nodes.forEach((node,i)=>{node.group.position.y+=Math.sin(time*.25+i)*.015;node.entity.update(time,state.motion,node.emphasis);});
    background.update(time,state.motion.background,pointer);
    particles.update(time,state.progress,pointer,nodes,renderer.getPixelRatio());
    setup.scene.updateMatrixWorld(true);camera.updateMatrixWorld();

    // Barreiras HTML são medidas uma vez por frame, não por partícula.
    const reserved=[rect,...document.querySelectorAll('.stats-dock,.dock')].filter(Boolean).map(r=>r.getBoundingClientRect?r.getBoundingClientRect():r);
    const used=[];screenBounds.length=0;
    screenBounds.push(projectEntityBounds(hero,camera,w,h));
    nodes.forEach(node=>{
      const bounds=projectEntityBounds(node.entity,camera,w,h);screenBounds.push(bounds);
      const labelRect={left:bounds.cx-75,right:bounds.cx+75,top:bounds.cy+bounds.radius+6,bottom:bounds.cy+bounds.radius+38};
      const overlaps=r=>r.left<labelRect.right&&r.right>labelRect.left&&r.top<labelRect.bottom&&r.bottom>labelRect.top;
      const visible=state.progress<.025&&labelRect.left>0&&labelRect.right<w&&labelRect.top>90&&labelRect.bottom<h-110&&!reserved.concat(used).some(overlaps);
      if(visible)used.push(labelRect);
      node.label.style.transform=`translate(${bounds.cx}px,${labelRect.top}px) translateX(-50%)`;
      node.label.style.visibility=visible?'visible':'hidden';node.label.tabIndex=visible?0:-1;
    });
    connections.update(time,state.focus,mobile,camera,reserved);
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
  const onClick=e=>{
    if(!state.ready||state.failed||mode==='fundo'||e.target.closest('button,a,input,textarea,select,.viagem-texto,.stats-dock'))return;
    ndc.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
    raycaster.setFromCamera(ndc,setup.camera);
    const hit=raycaster.intersectObjects(nodes.map(n=>n.entity.shell))[0];
    if(hit)options.aoSelecionar?.(nodes.find(n=>n.entity.shell===hit.object).project.id);
  };
  const onLost=e=>{e.preventDefault();fail('Contexto WebGL perdido');};
  const listeners=[[window,'resize',resize],[window,'pointermove',onPointer],[window,'blur',resetPointer],[window,'click',onClick],[window,'scroll',onScroll],[document,'visibilitychange',onVisibility],[media,'change',onMotion]];
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
      packets:connections?.packets.length||0,trafficDrawCalls:connections?1:0,instancedTraffic:!!connections?.instances.isInstancedMesh,
      entities:[hero,...nodes.map(n=>n.entity)].filter(Boolean).map(e=>({generator:e.group.userData.kind,meshes:e.group.children.length,earthMaterial:e.shell.material===resources?.materials.earth})),
      entityBounds:screenBounds.map(b=>({...b})),entityOverlaps:findEntityOverlaps(screenBounds),coreBounds:screenBounds[0]||null,
      resolution:setup?.renderer.getPixelRatio(),shaderErrors,drawCalls:setup?.renderer.info.render.calls,geometries:setup?.renderer.info.memory.geometries,textures:setup?.renderer.info.memory.textures,
      backgrounds:background?.planets.map(p=>({x:p.group.position.x,y:p.group.position.y,z:p.group.position.z,kind:p.group.userData.kind,rings:p.group.children.length-1}))||[],
      endpoints:nodes.map(n=>({id:n.project.id,x:n.group.position.x,y:n.group.position.y,status:n.project.status}))
    };},
    destruir(){
      dead=true;sync();flashTween?.kill();ui.dispose();listeners.forEach(([target,event,handler])=>target.removeEventListener(event,handler));
      connections?.dispose();nodes.forEach(n=>n.entity.dispose());hero?.dispose();resources?.dispose();documentTexture?.dispose();
      background?.dispose();particles?.dispose();setup?.dispose();el.remove();
    }
  };
}

window.CenaJarvis={montar,cores:TOKENS.status,nomes:names};
