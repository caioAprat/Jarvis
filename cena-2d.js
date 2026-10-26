'use strict';
/** Cena sem dados próprios: recebe os mesmos projetos usados pelos indicadores. */
window.CenaJarvis = (() => {
  const cores = {ok:0x79e9b4,atencao:0xffc16c,erro:0xff5e74,aguardando:0xe9b66e,config:0xc2ab8c,pausado:0x776b61};
  const nomes = {ok:'No ar',atencao:'Atenção',erro:'Problema',aguardando:'Aguardando',config:'Configurar',pausado:'Pausado'};
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function montar(options = {}) {
    const el = document.createElement('div'); el.className = 'cena-2d';
    el.innerHTML = '<img class="cena-reserva" src="assets/scene/fallback-nucleo.webp" alt="Núcleo luminoso do Jarvão"><div class="cena-boot" role="status">Iniciando núcleo…</div><div class="cena-rotulos"></div>';
    const labels=el.lastElementChild, boot=el.querySelector('.cena-boot');
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    let app, world, assets, core, mesh, corona, ring, glow, lines, sparks, foreground;
    let projects=[], nodes=[], backgrounds=[], stars=[], paused=false, visible=true, dead=false, failed=false, selected='', mode='palco';
    let firstRender=null, ticks=0, elapsed=0, frames=0, quality=1, slow=0, loopAttached=false, lastTime=0;
    const camera={x:0,y:0,zoom:1,rotation:0,progress:0,focus:-1,opening:0}, breath={scale:1,alpha:.8};
    let master=null, lenis=null, journey=null, breathTween=null, revealed=false;
    const mobile=()=>innerWidth<700;
    const sprite=(texture,parent,size)=>{ const s=new PIXI.Sprite(texture);s.anchor.set(.5);if(size)s.width=s.height=size;parent.addChild(s);return s; };
    function fallback(error) { failed=true;el.dataset.fallback='true';boot.hidden=false;boot.textContent='Visual estático · seus controles continuam disponíveis';if(app)app.canvas.hidden=true;syncLoop();el.dispatchEvent(new CustomEvent('cena-fallback',{detail:String(error)})); }
    async function start() {
      try {
        if(!window.PIXI || !window.gsap) throw new Error('Biblioteca indisponível');
        const sheets=['nucleo-0','nucleo-1','gemas','universo'];
        assets=await Promise.all(sheets.map(async name=>{try{return await PIXI.Assets.load('assets/scene/'+name+'.json');}catch(e){return PIXI.Assets.load('assets/scene/'+name+'-png.json');}}));
        if(dead)return;
        app=new PIXI.Application();
        await app.init({width:innerWidth,height:innerHeight,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,autoStart:false,sharedTicker:false,backgroundAlpha:0,antialias:false,preference:'webgl'});
        if(dead){app.destroy(true,{children:true});return;}
        el.prepend(app.canvas);app.canvas.setAttribute('aria-hidden','true');
        app.canvas.addEventListener('webglcontextlost',contextLost);
        const universe=assets[3].textures;
        const nebula=new PIXI.Container();app.stage.addChild(nebula);
        for(let i=0;i<3;i++){const n=sprite(universe['nebulosa-'+i],nebula,innerWidth*.95);n.position.set(innerWidth*(.2+i*.35),innerHeight*(.25+i*.25));n.alpha=.26;n.blendMode='add';}
        // Texturas prontas: brilho sem filtro pesado durante o desenho.
        for(let depth=0;depth<3;depth++){
          const container=new PIXI.ParticleContainer({dynamicProperties:{position:true,vertex:true,color:false,rotation:false}});app.stage.addChild(container);
          const points=[];let seed=4821+depth*777;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
          for(let i=0;i<(mobile()?230:850);i++){const x=rnd(),y=rnd(),size=.025+rnd()*.09;const p=new PIXI.Particle({texture:universe.poeira,x:x*innerWidth,y:y*innerHeight,scaleX:size,scaleY:size,alpha:.2+rnd()*.65,tint:i%5?0xcba77c:0xf4ead6});container.addParticle(p);points.push({p,x,y,size});}
          stars.push({container,points,depth});
        }
        const bg=new PIXI.Container();app.stage.addChild(bg);
        const types=Object.keys(universe).filter(k=>!k.startsWith('nebulosa')&&k!=='poeira');
        types.forEach((type,i)=>{const s=sprite(universe[type],bg,55+(i%4)*38);s.alpha=.16+(i%3)*.055;backgrounds.push({s,x:(i*.271+.09)%1,y:(i*.437+.13)%1,depth:.13+(i%3)*.09,index:i});});
        world=new PIXI.Container();app.stage.addChild(world);
        const orbits=new PIXI.Graphics();world.addChild(orbits);
        for(let i=0;i<3;i++)orbits.ellipse(0,0,350+i*100,155+i*55).stroke({color:0xc58242,width:.6,alpha:.19});
        orbits.cacheAsTexture({resolution:1});
        lines=new PIXI.Graphics();world.addChild(lines);
        core=new PIXI.Container();world.addChild(core);
        corona=sprite(assets[1].textures.corona,core,640);corona.blendMode='add';corona.alpha=.4;
        ring=sprite(assets[1].textures.aneis,core,720);ring.blendMode='add';ring.alpha=.7;
        mesh=new PIXI.AnimatedSprite(assets[0].animations.rede,false);mesh.anchor.set(.5);mesh.width=mesh.height=440;mesh.tint=0xffa34e;mesh.alpha=.85;core.addChild(mesh);
        const center=sprite(assets[1].textures.nucleo,core,480);center.blendMode='add';
        glow=sprite(assets[1].textures.glow,core,510);glow.blendMode='add';glow.alpha=.55;
        sparks=new PIXI.ParticleContainer({dynamicProperties:{position:true,color:true,vertex:true,rotation:false}});core.addChild(sparks);
        for(let i=0;i<90;i++)sparks.addParticle(new PIXI.Particle({texture:universe.poeira,tint:0xffb85e,scaleX:.12,scaleY:.12}));
        foreground=new PIXI.ParticleContainer({dynamicProperties:{position:true,color:false,vertex:false,rotation:false}});app.stage.addChild(foreground);
        for(let i=0;i<60;i++)foreground.addParticle(new PIXI.Particle({texture:universe.poeira,tint:0xe89b55,alpha:.3,scaleX:.15,scaleY:.15}));
        breathTween=gsap.to(breath,{scale:1.045,alpha:1,duration:2.8,repeat:-1,yoyo:true,ease:'sine.inOut',paused:media.matches});
        boot.hidden=true;el.dataset.ready='true';rebuild();resize();syncLoop();
      }catch(e){fallback(e);}
    }
    function rebuild(){
      labels.replaceChildren();
      for(const n of nodes){n.body.destroy({children:true});n.tween?.kill();}nodes=[];
      projects.forEach((p,i)=>{
        const button=document.createElement('button');button.type='button';button.className='cena-label';button.dataset.id=p.id;button.dataset.status=p.status;
        button.innerHTML='<span>'+esc(p.nome)+'</span><small>'+esc(nomes[p.status]||p.status)+'</small>';button.onclick=()=>options.aoSelecionar?.(p.id);labels.appendChild(button);
        if(!world)return;
        const body=new PIXI.Container();world.addChild(body);
        const halo=sprite(assets[1].textures.glow,body,105);halo.tint=cores[p.status]||cores.config;halo.alpha=.65;halo.blendMode='add';
        const gem=new PIXI.AnimatedSprite(assets[2].animations.gema,false);gem.anchor.set(.5);gem.width=gem.height=55;gem.tint=cores[p.status]||cores.config;body.addChild(gem);
        const angle=-Math.PI/2+i*Math.PI*2/Math.max(1,projects.length);
        const pulse={value:0};const tween=p.status==='pausado'?null:gsap.to(pulse,{value:1,duration:p.status==='ok'?3:6,repeat:-1,yoyo:p.status==='ok',ease:'sine.inOut',paused:media.matches});
        nodes.push({p,body,gem,halo,button,angle,x:Math.cos(angle)*470,y:Math.sin(angle)*275,pulse,tween});
      });
      if(world)world.setChildIndex(core,world.children.length-1);
      if(journey)connectJourney(journey);draw(0);
    }
    function resize(){if(!app||dead)return;app.renderer.resize(el.clientWidth||innerWidth,el.clientHeight||innerHeight);draw(0);if(journey)connectJourney(journey);}
    function draw(dt){
      if(!app||!world||dead||failed)return;
      const w=app.screen.width,h=app.screen.height,compact=mobile(),base=Math.min(w/(compact?1100:1300),h/850);
      
      world.scale.set(base*camera.zoom);world.rotation=camera.rotation;
      world.position.set(w*(compact?.5:.62)-camera.x*base*camera.zoom,h*(compact?.43:.53)-camera.y*base*camera.zoom);
      core.scale.set(breath.scale);glow.alpha=.45*breath.alpha;corona.alpha=.32+.12*breath.alpha;
      mesh.gotoAndStop(Math.floor(elapsed*12)%96);mesh.scale.set((440/384)*(1+camera.opening*.18));ring.rotation=Math.sin(elapsed*.08)*.07;
      for(const n of nodes){const a=n.angle+(media.matches?0:Math.sin(elapsed*.035)*.08);n.body.position.set(Math.cos(a)*470,Math.sin(a)*275+Math.sin(elapsed*.6+n.angle)*5);n.gem.gotoAndStop(Math.floor(elapsed*12)%64);n.body.alpha=n.p.status==='pausado'?.45:1;const pt=world.toGlobal(n.body.position);n.button.style.transform=`translate(${Math.max(55,Math.min(w-55,pt.x))}px,${pt.y+24*base}px) translateX(-50%)`;n.button.style.opacity=camera.progress>.06?'0':'1';n.button.style.pointerEvents=camera.progress>.06?'none':'auto';n.button.tabIndex=camera.progress>.06?-1:0;}
      drawConnections();
      for(const layer of stars){layer.container.alpha=quality<1&&layer.depth===0?.35:1;const d=(layer.depth+1)*.13;for(const q of layer.points){q.p.x=((q.x*w-camera.x*d+elapsed*d*2)%w+w)%w;q.p.y=((q.y*h-camera.y*d-camera.progress*120*d)%h+h)%h;q.p.scaleX=q.size*(1+Math.min(2,Math.abs(camera.progress-(camera.previousProgress||0))*100));}}
      backgrounds.forEach(b=>{b.s.visible=!compact||b.index<5;b.s.x=((b.x*w-camera.x*b.depth)%(w+180)+w+180)%(w+180)-90;b.s.y=((b.y*h-camera.y*b.depth-camera.progress*h*b.depth)%(h+180)+h+180)%(h+180)-90;b.s.rotation=camera.rotation*b.depth;b.s.scale.set((.25+(b.index%4)*.15)*(1+camera.progress*b.depth));});
      sparks.particleChildren.forEach((p,i)=>{const age=(elapsed*.16+i/90)%1,a=i*2.399;const r=120+age*230;p.x=Math.cos(a)*r;p.y=Math.sin(a)*r*.7;p.alpha=(1-age)*.65;});
      foreground.particleChildren.forEach((p,i)=>{p.x=(i*157.7+elapsed*4)%w;p.y=((i*93.1-elapsed*9-camera.progress*90)%h+h)%h;});
      camera.previousProgress=camera.progress;
      app.render();frames++;
      if(firstRender===null)firstRender=performance.now();
      if(window.__jarvisMeasure?.sampling)window.__jarvisMeasure.frames.push(performance.now());
    }
    function drawConnections(){
      lines.clear();
      nodes.forEach((n,index)=>{
        const x=n.body.x,y=n.body.y,cx=x*.42-y*.22,cy=y*.42+x*.12;
        const point=t=>({x:2*(1-t)*t*cx+t*t*x,y:2*(1-t)*t*cy+t*t*y});
        const focused=selected===n.p.id||Math.round(camera.focus)===index;
        const color=cores[n.p.status]||cores.config,waiting=['aguardando','config'].includes(n.p.status),off=n.p.status==='pausado';
        const strength=off?.14:focused?.9:camera.focus>=0?.18:.45;
        for(let i=0;i<32;i++){
          if(waiting&&i%4>1)continue;
          const t=i/32,a=point(t),b=point((i+1)/32);
          const mix=(v,w)=>Math.round(v+(w-v)*t);
          const c=(mix(255,(color>>16)&255)<<16)|(mix(162,(color>>8)&255)<<8)|mix(70,color&255);
          lines.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:c,width:focused?4:2.4,alpha:strength*.12});
          lines.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:c,width:focused?1.4:.65,alpha:strength});
        }
        lines.circle(x,y,4).fill({color,alpha:strength});
        const start=point(.2);lines.circle(start.x,start.y,1.5).fill({color:0xffbd6c,alpha:strength});
        if(focused&&journey){const content=journey.querySelectorAll('.viagem-projeto .viagem-texto')[index];if(content){const rect=content.getBoundingClientRect();if(rect.top>80&&rect.top<innerHeight-100){const end=world.toLocal(new PIXI.Point(mobile()?rect.left+20:rect.right+15,rect.top+6));lines.moveTo(x,y).lineTo(end.x,end.y).stroke({color,width:.65,alpha:.3});lines.circle(end.x,end.y,2).fill({color,alpha:.6});}}}
        if(!off){for(let k=0;k<4;k++){const t=Math.max(0,n.pulse.value-k*.018),p=point(t);lines.circle(p.x,p.y,k?1.1:2.6).fill({color,alpha:(1-k/5)*(focused?.95:.65)});}}
      });
    }
    function tick(time,delta){
      if(paused||!visible||document.hidden||mode==='fundo'||failed)return;
      lenis?.raf(time*1000);elapsed+=Math.min(delta,100)/1000;ticks++;lastTime=time;
      if(delta>20)slow+=Math.min(delta,100);else slow=Math.max(0,slow-20);
      if(slow>3000&&quality===1){quality=.65;stars[0].container.visible=false;foreground.visible=false;app.renderer.resolution=Math.min(devicePixelRatio||1,1);el.dataset.quality='adaptativa';}
      draw(delta);
    }
    function syncLoop(){
      const active=!dead&&!failed&&!paused&&visible&&!document.hidden&&mode!=='fundo';
      const animated=active&&!media.matches;
      breathTween?.paused(!animated);nodes.forEach(n=>n.tween?.paused(!animated));
      if(animated&&!loopAttached){gsap.ticker.add(tick);loopAttached=true;}
      if(!animated&&loopAttached){gsap.ticker.remove(tick);loopAttached=false;}
      if(active)draw(0);
    }
    function connectJourney(root){
      master?.scrollTrigger?.kill();master?.kill();master=null;journey=root;
      if(!root||!root.isConnected){lenis?.destroy();lenis=null;return;}
      if(!world||!window.ScrollTrigger)return;
      root.style.marginTop=(parseFloat(getComputedStyle(root).marginTop)-(root.getBoundingClientRect().top+scrollY))+'px';
      gsap.registerPlugin(ScrollTrigger);
      if(!lenis&&!media.matches&&window.Lenis){lenis=new Lenis({autoRaf:false,smoothWheel:true,duration:1.15});lenis.on('scroll',ScrollTrigger.update);gsap.ticker.lagSmoothing(0);}
      if(media.matches&&lenis){lenis.destroy();lenis=null;}
      const sections=[...root.querySelectorAll('.viagem-etapa')];
      const renderProgress=()=>{if(media.matches)draw(0);};
      master=gsap.timeline({scrollTrigger:{id:'jarvis-jornada',trigger:root,start:'top top',end:'bottom bottom',scrub:media.matches?true:1,onUpdate:renderProgress}});
      gsap.set(camera,{x:0,y:0,zoom:1,rotation:0,progress:0,focus:-1,opening:0});
      const steps=[{x:0,y:0,zoom:1,rotation:0,focus:-1,opening:0},
        {x:mobile()?0:-110,y:0,zoom:1.55,rotation:.025,focus:-1,opening:1},
        ...nodes.map((n,i)=>({x:n.x-(mobile()?0:100),y:n.y,zoom:mobile()?2.1:1.9,rotation:i%2?.025:-.025,focus:i,opening:0})),
        {x:0,y:0,zoom:.78,rotation:0,focus:-1,opening:0}];
      for(let i=1;i<steps.length;i++)master.to(camera,{...steps[i],progress:i/(steps.length-1),duration:1,ease:'power2.inOut'},i-1);
      sections.forEach((section,i)=>{
        const content=section.querySelector('.viagem-texto');if(!content)return;
        if(!media.matches){gsap.set(content,{opacity:i?0:1,y:i?32:0});if(i)master.to(content,{opacity:1,y:0,duration:.38,ease:'power2.out'},i-.55);if(i<sections.length-1)master.to(content,{opacity:0,y:-25,duration:.3},i+.25);}
        else gsap.set(content,{clearProps:'all'});
        section.querySelectorAll('[data-contar]').forEach(counter=>{const value={n:0};master.to(value,{n:Number(counter.dataset.contar),duration:.5,onUpdate:()=>counter.textContent=Math.round(value.n)},Math.max(0,i-.6));});
      });
      if(!revealed&&!media.matches){gsap.from('.viagem-letra',{opacity:0,y:12,stagger:.07,duration:.7,ease:'power2.out'});revealed=true;}
      ScrollTrigger.refresh();
    }
    function contextLost(e){e.preventDefault();fallback('Contexto gráfico indisponível');}
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncLoop();});observer.observe(el);
    const onVisibility=()=>syncLoop(),onMotion=()=>{syncLoop();if(journey)connectJourney(journey);},onScroll=()=>{if(media.matches)draw(0);};
    document.addEventListener('visibilitychange',onVisibility);media.addEventListener('change',onMotion);window.addEventListener('resize',resize);window.addEventListener('scroll',onScroll,{passive:true});
    start();
    return {el,atualizar(ps){const signature=JSON.stringify(ps);if(signature===JSON.stringify(projects))return;projects=ps.map(p=>({...p}));rebuild();},selecionar(id){selected=id;draw(0);},modo(value){mode=value;el.hidden=value==='fundo';syncLoop();},rolagem(){},pausar(value){paused=value;syncLoop();},varredura(){if(glow&&!media.matches)gsap.fromTo(breath,{alpha:1.8},{alpha:.8,duration:1});},jornada:connectJourney,
      depurar:()=>({ready:!!world,failed,firstRender,frames,ticks,quality,projects:nodes.length,connections:nodes.length,progress:camera.progress,renderer:app?.renderer.name,reduced:media.matches,loop:loopAttached,endpoints:nodes.map(n=>({id:n.p.id,x:n.body.x,y:n.body.y,status:n.p.status}))}),
      destruir(){dead=true;syncLoop();master?.kill();lenis?.destroy();breathTween?.kill();nodes.forEach(n=>n.tween?.kill());observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);media.removeEventListener('change',onMotion);window.removeEventListener('resize',resize);window.removeEventListener('scroll',onScroll);app?.destroy(true,{children:true});el.remove();}
    };
  }
  return {montar,cores,nomes};
})();
