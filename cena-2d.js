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
    const camera={x:0,y:0,zoom:1,rotation:0,progress:0,focus:-1,opening:0,anchorY:.43}, breath={scale:1,alpha:.8};
    let master=null, lenis=null, journey=null, breathTween=null, revealed=false;
    const mobile=()=>innerWidth<700;
    const sprite=(texture,parent,size)=>{ const s=new PIXI.Sprite(texture);s.anchor.set(.5);if(size)s.width=s.height=size;parent.addChild(s);return s; };
    function fallback(error) { failed=true;lenis?.destroy();lenis=null;el.dataset.fallback='true';boot.hidden=false;boot.textContent='Visual estático · seus controles continuam disponíveis';if(app)app.canvas.hidden=true;syncLoop();el.dispatchEvent(new CustomEvent('cena-fallback',{detail:String(error)})); }
    async function start() {
      try {
        if(!window.PIXI || !window.gsap) throw new Error('Biblioteca indisponível');
        const sheets=['nucleo-0','nucleo-1','universo'];
        assets=await Promise.all(sheets.map(async name=>{try{return await PIXI.Assets.load('assets/scene/'+name+'.json');}catch(e){return PIXI.Assets.load('assets/scene/'+name+'-png.json');}}));
        if(dead)return;
        app=new PIXI.Application();
        await app.init({width:innerWidth,height:innerHeight,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,autoStart:false,sharedTicker:false,backgroundAlpha:0,antialias:false,preference:'webgl'});
        if(dead){app.destroy(true,{children:true});return;}
        el.prepend(app.canvas);app.canvas.setAttribute('aria-hidden','true');
        app.canvas.addEventListener('webglcontextlost',contextLost);
        const universe=assets[2].textures;
        const nebula=new PIXI.Container();app.stage.addChild(nebula);
        for(let i=0;i<3;i++){const n=sprite(universe['nebulosa-'+i],nebula,innerWidth*.95);n.position.set(innerWidth*(.2+i*.35),innerHeight*(.25+i*.25));n.alpha=.26;n.blendMode='add';}
        nebula.cacheAsTexture({resolution:.5});
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
        const halo=sprite(assets[1].textures.glow,body,120);halo.tint=0xffbb78;halo.alpha=.32;halo.blendMode='add';
        // Mesma linguagem circular do núcleo; o estado aparece num arco, não num bloco neon.
        const gem=new PIXI.Graphics();
        gem.circle(0,0,23).fill({color:0x15120f,alpha:.96}).stroke({color:0xd5a371,width:1,alpha:.75});
        gem.circle(0,0,17).stroke({color:0xffc48a,width:.7,alpha:.4});
        gem.arc(0,0,28,-Math.PI*.7,Math.PI*.65).stroke({color:cores[p.status]||cores.config,width:1.5,alpha:.85});
        gem.circle(0,0,6).fill({color:0xffce95,alpha:.95});
        for(let k=0;k<4;k++){const a=k*Math.PI/2;gem.moveTo(Math.cos(a)*32,Math.sin(a)*32).lineTo(Math.cos(a)*36,Math.sin(a)*36).stroke({color:0xd5a371,width:1,alpha:.5});}
        body.addChild(gem);
        const angle=-Math.PI/2+i*Math.PI*2/Math.max(1,projects.length);
        const pulse={value:0};const tween=p.status==='pausado'?null:gsap.to(pulse,{value:1,duration:p.status==='ok'?3:6,repeat:-1,yoyo:p.status==='ok',ease:'sine.inOut',paused:media.matches});
        nodes.push({p,body,gem,halo,button,angle,x:Math.cos(angle)*470,y:Math.sin(angle)*275,pulse,tween,emphasis:0});
      });
      if(world)world.setChildIndex(core,world.children.length-1);
      if(journey)connectJourney(journey);draw(0);
    }
    function resize(){if(!app||dead)return;app.renderer.resize(el.clientWidth||innerWidth,el.clientHeight||innerHeight);draw(0);if(journey)connectJourney(journey);}
    function draw(dt){
      if(!app||!world||dead||failed)return;
      const w=app.screen.width,h=app.screen.height,compact=mobile(),base=Math.min(w/(compact?1100:1300),h/850);
      
      world.scale.set(base*camera.zoom);world.rotation=camera.rotation;
      world.position.set(w*(compact?.5:.62)-camera.x*base*camera.zoom,h*(compact?camera.anchorY:.53)-camera.y*base*camera.zoom);
      core.scale.set(breath.scale);glow.alpha=.45*breath.alpha;corona.alpha=.32+.12*breath.alpha;
      mesh.gotoAndStop(Math.floor(elapsed*12)%96);mesh.scale.set((440/384)*(1+camera.opening*.18));ring.rotation=Math.sin(elapsed*.08)*.07;
      for(const [index,n] of nodes.entries()){
        const focused=camera.focus===index, a=n.angle+(media.matches?0:Math.sin(elapsed*.035)*.08);
        n.emphasis+=(Number(focused)-n.emphasis)*(media.matches?1:1-Math.exp(-Math.max(dt,16)/180));
        const orbitX=Math.cos(a)*470,orbitY=Math.sin(a)*275+Math.sin(elapsed*.6+n.angle)*5;
        n.body.position.set(orbitX+(-210-orbitX)*n.emphasis,orbitY+(145-orbitY)*n.emphasis);
        n.body.scale.set(1+n.emphasis*.35);n.gem.rotation=media.matches?0:Math.sin(elapsed*.18)*.12;
        n.body.alpha=(n.p.status==='pausado'?.55:1)*(camera.focus>=0?.28+.72*n.emphasis:1);
        n.halo.alpha=.25+n.emphasis*.2;
        const pt=world.toGlobal(n.body.position);n.button.style.transform=`translate(${Math.max(55,Math.min(w-55,pt.x))}px,${pt.y+40*base}px) translateX(-50%)`;n.button.style.opacity=camera.progress>.025?'0':'1';n.button.style.pointerEvents=camera.progress>.025?'none':'auto';n.button.tabIndex=camera.progress>.025?-1:0;
      }
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
        const focused=selected===n.p.id||camera.focus===index;
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
        if(focused&&journey){const content=journey.querySelectorAll('.viagem-projeto .viagem-texto')[index];if(content){const rect=content.getBoundingClientRect();if(rect.top>80&&rect.top<innerHeight-100){const end=world.toLocal(new PIXI.Point(mobile()?rect.left+28:rect.right,rect.top+30));lines.moveTo(x,y).quadraticCurveTo(x-80,y,end.x,end.y).stroke({color:0xe5ad73,width:1,alpha:.55*Number(content.style.opacity||1)});lines.circle(end.x,end.y,3).fill({color:0xffce95,alpha:.9});}}}
        if(!off){for(let k=0;k<4;k++){const t=Math.max(0,n.pulse.value-k*.018),p=point(t);lines.circle(p.x,p.y,k?1.1:2.6).fill({color,alpha:(1-k/5)*(focused?.95:.65)});}}
      });
    }
    function tick(time,delta){
      if(paused||!visible||document.hidden||mode==='fundo'||failed)return;
      lenis?.raf(time*1000);elapsed+=Math.min(delta,100)/1000;ticks++;lastTime=time;
      if(delta>20)slow+=Math.min(delta,100);else slow=Math.max(0,slow-20);
      if(slow>3000&&quality===1){quality=.65;stars[0].container.visible=false;foreground.visible=false;app.renderer.resolution=Math.min(devicePixelRatio||1,1,Math.sqrt(600000/(app.screen.width*app.screen.height)));el.dataset.quality='adaptativa';}
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
      if(!lenis&&!media.matches&&window.Lenis){lenis=new Lenis({autoRaf:false,smoothWheel:true,duration:.65});lenis.on('scroll',ScrollTrigger.update);gsap.ticker.lagSmoothing(0);}
      if(media.matches&&lenis){lenis.destroy();lenis=null;}
      const sections=[...root.querySelectorAll('.viagem-etapa')];
      root.classList.toggle('jornada-ativa',!media.matches);
      const renderProgress=()=>{
        const time=master?.time()||0,current=Math.min(sections.length-1,Math.floor(time+.5));
        // Cada capítulo tem uma pausa de leitura e uma passagem curta, reversível.
        camera.focus=current>=2&&current<sections.length-1?current-2:-1;
        el.dataset.chapter=String(current);
        const marker=root.querySelector('.viagem-regua span');
        if(marker)marker.textContent=String(current+1).padStart(2,'0')+' — '+String(sections.length).padStart(2,'0');
        sections.forEach((s,i)=>{const content=s.querySelector('.viagem-texto'),active=i===current&&!root.classList.contains('jornada-fora');
          content.inert=!media.matches&&!active;
          content.style.pointerEvents=media.matches||active?'auto':'none';
          if(!media.matches){const distance=Math.abs(time-i),fade=.15+.85*Math.max(0,Math.min(1,(.5-distance)/.18));gsap.set(content,{opacity:active?fade:0,y:active?(time<i?1:-1)*(1-fade)*22:0,visibility:active?'visible':'hidden'});}
        });
        if(media.matches)draw(0);
      };
      master=gsap.timeline({onUpdate:renderProgress,scrollTrigger:{id:'jarvis-jornada',trigger:root,start:'top top',end:'bottom bottom',scrub:true,
        onLeave:()=>{if(scrollY>root.getBoundingClientRect().bottom+scrollY-innerHeight+2)root.classList.add('jornada-fora');renderProgress();},
        onEnterBack:()=>{root.classList.remove('jornada-fora');renderProgress();}}});
      gsap.set(camera,{x:0,y:0,zoom:1,rotation:0,progress:0,focus:-1,opening:0,anchorY:.43});
      const steps=[{x:mobile()?0:-85,y:0,zoom:1,rotation:0,opening:0,anchorY:.23},
        {x:mobile()?0:-85,y:0,zoom:1.12,rotation:.015,opening:.4,anchorY:.23},
        ...nodes.map((n,i)=>({x:mobile()?0:-110,y:0,zoom:mobile()?1.2:.96,rotation:0,opening:.15,anchorY:.23})),
        {x:mobile()?0:-85,y:0,zoom:.85,rotation:0,opening:0,anchorY:.23}];
      gsap.set(camera,steps[0]);
      for(let i=1;i<steps.length;i++){
        master.to(camera,{...steps[i],duration:.6,ease:'sine.inOut'},i-.8);
        master.to(camera,{progress:i/(steps.length-1),duration:1,ease:'none'},i-1);
      }
      sections.forEach((section,i)=>{
        const content=section.querySelector('.viagem-texto');if(!content)return;
        section.querySelector('.viagem-posicao').dataset.side='left';
        if(media.matches)gsap.set(content,{clearProps:'all'});
        section.querySelectorAll('[data-contar]').forEach(counter=>{const value={n:0};master.to(value,{n:Number(counter.dataset.contar),duration:.5,onUpdate:()=>counter.textContent=Math.round(value.n)},Math.max(0,i-1));});
      });
      if(!revealed&&!media.matches){gsap.from('.viagem-letra',{opacity:0,y:12,stagger:.07,duration:.7,ease:'power2.out'});revealed=true;}
      ScrollTrigger.refresh();
      renderProgress();
    }
    function contextLost(e){e.preventDefault();fallback('Contexto gráfico indisponível');}
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncLoop();});observer.observe(el);
    const onVisibility=()=>syncLoop(),onMotion=()=>{syncLoop();if(journey)connectJourney(journey);},onScroll=()=>{
      // Também cobre scroll após o término do trigger, onde onUpdate já não muda.
      if(journey)journey.classList.toggle('jornada-fora',journey.getBoundingClientRect().bottom<innerHeight-2);
      if(media.matches)draw(0);
    };
    document.addEventListener('visibilitychange',onVisibility);media.addEventListener('change',onMotion);window.addEventListener('resize',resize);window.addEventListener('scroll',onScroll,{passive:true});
    start();
    return {el,atualizar(ps){const signature=JSON.stringify(ps);if(signature===JSON.stringify(projects))return;projects=ps.map(p=>({...p}));rebuild();},selecionar(id){selected=id;draw(0);},modo(value){mode=value;el.hidden=value==='fundo';syncLoop();},rolagem(){},pausar(value){paused=value;syncLoop();},varredura(){if(glow&&!media.matches)gsap.fromTo(breath,{alpha:1.8},{alpha:.8,duration:1});},jornada:connectJourney,
      depurar:()=>({ready:!!world,failed,firstRender,frames,ticks,quality,projects:nodes.length,connections:nodes.length,progress:camera.progress,renderer:app?.renderer.name,reduced:media.matches,loop:loopAttached,
        // Caixa conservadora da região incandescente central (não inclui corona transparente).
        coreBounds:world?{x:world.x-90*world.scale.x*breath.scale,y:world.y-90*world.scale.y*breath.scale,width:180*world.scale.x*breath.scale,height:180*world.scale.y*breath.scale}:null,
        resolution:app?.renderer.resolution,backgrounds:backgrounds.map(b=>({x:b.s.x,y:b.s.y,visible:b.s.visible,depth:b.depth})),
        endpoints:nodes.map(n=>({id:n.p.id,x:n.body.x,y:n.body.y,status:n.p.status}))}),
      destruir(){dead=true;syncLoop();master?.kill();lenis?.destroy();breathTween?.kill();nodes.forEach(n=>n.tween?.kill());observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);media.removeEventListener('change',onMotion);window.removeEventListener('resize',resize);window.removeEventListener('scroll',onScroll);app?.destroy(true,{children:true});el.remove();}
    };
  }
  return {montar,cores,nomes};
})();
