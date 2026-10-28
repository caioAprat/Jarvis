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
    const interaction={x:0,y:0,targetX:0,targetY:0,velocity:0,lastProgress:0};
    let readingAreas=[],chromeAreas=[],activeContent=null;
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
          const container=new PIXI.ParticleContainer({dynamicProperties:{position:true,vertex:true,color:true,rotation:false}});app.stage.addChild(container);
          const points=[];let seed=4821+depth*777;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
          for(let i=0;i<(mobile()?85:220);i++){const x=rnd(),y=rnd(),size=.035+rnd()*.075,alpha=.2+rnd()*.5;const p=new PIXI.Particle({texture:universe.poeira,scaleX:size,scaleY:size,alpha,tint:i%5?0xcba77c:0xf4ead6});container.addParticle(p);points.push({p,x,y,size,alpha});}
          stars.push({container,points,depth});
        }
        const bg=new PIXI.Container();app.stage.addChild(bg);
        const types=Object.keys(universe).filter(k=>!k.startsWith('nebulosa')&&k!=='poeira');
        types.forEach((type,i)=>{const size=55+(i%4)*30,s=sprite(universe[type],bg,size);s.alpha=.22+(i%3)*.045;backgrounds.push({s,size,x:(i*.271+.09)%1,y:(i*.437+.13)%1,depth:.13+(i%3)*.09,index:i});});
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
        foreground=new PIXI.ParticleContainer({dynamicProperties:{position:true,color:true,vertex:true,rotation:false}});app.stage.addChild(foreground);
        for(let i=0;i<36;i++)foreground.addParticle(new PIXI.Particle({texture:universe.poeira,tint:0xe89b55,alpha:.3,scaleX:.12,scaleY:.12}));
        breathTween=gsap.to(breath,{scale:1.045,alpha:1,duration:2.8,repeat:-1,yoyo:true,ease:'sine.inOut',paused:media.matches});
        boot.hidden=true;el.dataset.ready='true';rebuild();resize();syncLoop();
      }catch(e){fallback(e);}
    }
    function rebuild(){
      labels.replaceChildren();
      for(const n of nodes){n.body.destroy({children:true});n.packet.destroy();n.tween?.kill();}nodes=[];
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
        const packet=new PIXI.Graphics();
        packet.poly([-7,-10,2,-10,7,-5,7,10,-7,10]).fill({color:0x191510,alpha:.98}).stroke({color:0xffd29a,width:1.4});
        packet.moveTo(2,-10).lineTo(2,-5).lineTo(7,-5).stroke({color:0xffd29a,width:1});
        for(let row=0;row<3;row++)packet.moveTo(-3,-1+row*3).lineTo(row===2?1:4,-1+row*3).stroke({color:0xffd29a,width:1});
        world.addChild(packet);
        const angle=-Math.PI/2+i*Math.PI*2/Math.max(1,projects.length);
        nodes.push({p,body,gem,halo,packet,button,angle,x:Math.cos(angle)*470,y:Math.sin(angle)*275,emphasis:0});
      });
      if(world)world.setChildIndex(core,world.children.length-1);
      if(journey)connectJourney(journey);draw(0);
    }
    function resize(){if(!app||dead)return;app.renderer.resize(el.clientWidth||innerWidth,el.clientHeight||innerHeight);draw(0);if(journey)connectJourney(journey);}
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
    // Fondu progressivo nas áreas de leitura, em vez de partículas sobre as letras.
    function clearance(x,y,padding=18,radius=0){
      let alpha=1;
      for(const r of readingAreas){const distance=Math.max(r.left-x,x-r.right,r.top-y,y-r.bottom)-radius;alpha=Math.min(alpha,clamp(distance/padding,0,1));}
      return alpha;
    }
    function draw(dt){
      if(!app||!world||dead||failed)return;
      const w=app.screen.width,h=app.screen.height,compact=mobile(),base=Math.min(w/(compact?1100:1300),h/850);
      
      world.scale.set(base*camera.zoom);world.rotation=camera.rotation;
      world.position.set(w*(compact?.5:.62)-camera.x*base*camera.zoom,h*(compact?camera.anchorY:.53)-camera.y*base*camera.zoom);
      readingAreas=[...chromeAreas,activeContent].filter(e=>e?.isConnected).map(e=>e.getBoundingClientRect());
      if(compact&&activeContent){
        const card=readingAreas[readingAreas.length-1],top=Math.max(0,...readingAreas.slice(0,-1).filter(r=>r.top<20).map(r=>r.bottom));
        const available=Math.max(40,card.top-top-24);
        world.scale.set(Math.min(world.scale.x,available/640));
        const radius=320*world.scale.x;
        world.y=clamp(world.y,top+12+radius,Math.max(top+12+radius,card.top-12-radius));
      }
      const blend=1-Math.exp(-Math.min(Math.max(dt,0),64)/180);
      interaction.x+=(interaction.targetX-interaction.x)*blend;interaction.y+=(interaction.targetY-interaction.y)*blend;
      const velocity=dt>0?clamp((camera.progress-interaction.lastProgress)*1000/dt,-1,1):0;
      interaction.velocity+=(velocity-interaction.velocity)*blend;interaction.lastProgress=camera.progress;
      core.scale.set(breath.scale);glow.alpha=.45*breath.alpha;corona.alpha=.32+.12*breath.alpha;
      mesh.gotoAndStop(Math.floor(elapsed*12)%96);mesh.scale.set((440/384)*(1+camera.opening*.18));ring.rotation=Math.sin(elapsed*.08)*.07;
      const labelRects=[];
      for(const [index,n] of nodes.entries()){
        const focused=camera.focus===index, a=n.angle+(media.matches?0:Math.sin(elapsed*.035)*.08);
        n.emphasis+=(Number(focused)-n.emphasis)*(media.matches?1:1-Math.exp(-Math.max(dt,16)/180));
        const orbitX=Math.cos(a)*470,orbitY=Math.sin(a)*275+Math.sin(elapsed*.6+n.angle)*5;
        n.body.position.set(orbitX+(-210-orbitX)*n.emphasis,orbitY+(145-orbitY)*n.emphasis);
        n.body.scale.set(1+n.emphasis*.35);n.gem.rotation=media.matches?0:Math.sin(elapsed*.18)*.12;
        n.body.alpha=(n.p.status==='pausado'?.55:1)*(camera.focus>=0?.28+.72*n.emphasis:1);
        n.halo.alpha=.25+n.emphasis*.2;
        const pt=world.toGlobal(n.body.position),lx=clamp(pt.x,90,w-90),ly=pt.y+40*base,half=compact?52:90;
        const labelRect={left:lx-half,right:lx+half,top:ly,bottom:ly+50};
        const overlaps=r=>r.left<labelRect.right&&r.right>labelRect.left&&r.top<labelRect.bottom&&r.bottom>labelRect.top;
        const show=camera.progress<=.025&&ly>0&&ly+50<h&&![...readingAreas,...labelRects].some(overlaps);
        if(show)labelRects.push(labelRect);
        n.button.style.transform=`translate(${lx}px,${ly}px) translateX(-50%)`;n.button.style.opacity=show?'1':'0';n.button.style.pointerEvents=show?'auto':'none';n.button.tabIndex=show?0:-1;
      }
      drawConnections();
      const pointerX=interaction.x*(compact?10:45),pointerY=interaction.y*(compact?10:32),travel=camera.progress*Math.PI*1.4;
      for(const layer of stars){
        const depth=(layer.depth+1)/3;
        layer.container.alpha=quality<1&&layer.depth===0?.5:1;
        for(const q of layer.points){
          const a=q.x*Math.PI*2+elapsed*.018*depth+travel*depth,r=(.18+q.y*.78)*Math.max(w,h);
          q.p.x=world.x+Math.cos(a)*r+pointerX*depth;q.p.y=world.y+Math.sin(a)*r*.62+pointerY*depth-interaction.velocity*60*depth;
          const nearCore=clamp((Math.hypot(q.p.x-world.x,q.p.y-world.y)-100*base)/100,0,1);
          q.p.alpha=q.alpha*clearance(q.p.x,q.p.y)*nearCore;
          q.p.scaleX=q.p.scaleY=q.size*(1+Math.abs(interaction.velocity)*.5);
        }
      }
      backgrounds.forEach(b=>{
        b.s.visible=!compact||b.index<5;
        const phase=b.index*2.399+travel*b.depth*.6+elapsed*.012*(b.index%2?1:-1);
        const radius=(compact?190:280)+(b.index%4)*(compact?48:78);
        b.s.x=world.x+Math.cos(phase)*radius+pointerX*b.depth;
        b.s.y=world.y+Math.sin(phase)*radius*.78+pointerY*b.depth;
        const size=b.size*(compact?.65:1)*(1+Math.sin(elapsed*.15+b.index)*.035);
        b.s.width=b.s.height=size;b.s.rotation=Math.sin(elapsed*.06+b.index+travel*.3)*.12;
        const separation=clamp((Math.hypot(b.s.x-world.x,b.s.y-world.y)-165*base-size*.5)/80,0,1);
        b.s.alpha=(.22+(b.index%3)*.055)*separation*clearance(b.s.x,b.s.y,35,size*.5);
      });
      sparks.particleChildren.forEach((p,i)=>{
        const a=i*2.399+elapsed*.1+travel*.8,r=175+(i%13)*9+Math.sin(elapsed*.7+i)*12;
        p.x=Math.cos(a)*r+interaction.x*12;p.y=Math.sin(a)*r*.66+interaction.y*8;
        const sx=world.x+p.x*world.scale.x,sy=world.y+p.y*world.scale.y;
        p.alpha=(.2+.3*(.5+.5*Math.sin(a*2)))*clearance(sx,sy);p.scaleX=p.scaleY=.07+Math.abs(interaction.velocity)*.06;
      });
      foreground.particleChildren.forEach((p,i)=>{
        const a=i*2.399+elapsed*.025+travel*.65,r=(.35+(i%9)*.08)*Math.max(w,h);
        p.x=world.x+Math.cos(a)*r+pointerX*1.5;p.y=world.y+Math.sin(a)*r*.6+pointerY*1.5;
        p.alpha=.23*clearance(p.x,p.y,35);p.scaleX=p.scaleY=.08+Math.abs(interaction.velocity)*.05;
      });
      camera.previousProgress=camera.progress;
      app.render();frames++;
      if(firstRender===null)firstRender=performance.now();
      if(window.__jarvisMeasure?.sampling)window.__jarvisMeasure.frames.push(performance.now());
    }
    function drawConnections(){
      lines.clear();
      nodes.forEach((n,index)=>{
        const x=n.body.x,y=n.body.y,wave=media.matches?0:Math.sin(elapsed*.65+index)*6+interaction.x*5,cx=x*.42-y*.22+wave,cy=y*.42+x*.12+interaction.y*5;
        const point=t=>({x:2*(1-t)*t*cx+t*t*x,y:2*(1-t)*t*cy+t*t*y});
        const focused=journey?camera.focus===index:selected===n.p.id;
        const color=cores[n.p.status]||cores.config,waiting=['aguardando','config'].includes(n.p.status),off=n.p.status==='pausado';
        const strength=off?.14:focused?.9:camera.focus>=0?.18:.45;
        lines.moveTo(0,0).quadraticCurveTo(cx,cy,x,y).stroke({color:0xffb967,width:focused?5:3,alpha:strength*.09});
        for(let i=0;i<16;i++){
          if(waiting&&i%4>1)continue;
          const t=i/16,a=point(t),b=point((i+1)/16);
          const mix=(v,w)=>Math.round(v+(w-v)*t);
          const c=(mix(255,(color>>16)&255)<<16)|(mix(162,(color>>8)&255)<<8)|mix(70,color&255);
          lines.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:c,width:focused?1.5:.8,alpha:strength});
        }
        lines.circle(x,y,4).fill({color,alpha:strength});
        const start=point(.2);lines.circle(start.x,start.y,1.5).fill({color:0xffbd6c,alpha:strength});
        let cardEnd=null;
        if(camera.focus===index&&activeContent){const rect=activeContent.getBoundingClientRect();if(rect.top>80&&rect.top<innerHeight-100){const end=world.toLocal(new PIXI.Point(mobile()?rect.left+28:rect.right,mobile()?rect.top:rect.top+30));cardEnd=end;lines.moveTo(x,y).quadraticCurveTo(x-80,y,end.x,end.y).stroke({color:0xe5ad73,width:1.2,alpha:.6*Number(activeContent.style.opacity||1)});lines.circle(end.x,end.y,3).fill({color:0xffce95,alpha:.9});}}
        const phase=(elapsed/(waiting?7:4.5)+index*.137+camera.progress*.6)%1;
        let p=point(.26+phase*.7);
        if(cardEnd){
          if(phase<.45)p=point(.26+phase/.45*.74);
          else {const t=(phase-.45)/.55,u=1-t;p={x:u*u*x+2*u*t*(x-80)+t*t*cardEnd.x,y:u*u*y+2*u*t*y+t*t*cardEnd.y};}
        }
        n.packet.position.set(p.x,p.y);n.packet.scale.set((focused?1.1:.85)/world.scale.x);
        const screen=world.toGlobal(n.packet.position),edgeFade=Math.min(1,phase*8,(1-phase)*8);
        const coreClearance=clamp((Math.hypot(screen.x-world.x,(screen.y-world.y)/.8)-180*world.scale.x-12)/25,0,1);
        n.packet.visible=!off&&(!mobile()||camera.focus<0||focused);
        n.packet.alpha=(focused?1:camera.focus>=0?.3:.8)*edgeFade*coreClearance*clearance(screen.x,screen.y,25,14);
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
      // Um novo DOM nunca herda o destino de rolagem da tela anterior.
      if(root!==journey){lenis?.destroy();lenis=null;activeContent=null;interaction.velocity=0;}
      master?.scrollTrigger?.kill();master?.kill();master=null;journey=root;
      if(!root||!root.isConnected){lenis?.destroy();lenis=null;activeContent=null;chromeAreas=[];return;}
      if(!world||!window.ScrollTrigger)return;
      root.style.marginTop=(parseFloat(getComputedStyle(root).marginTop)-(root.getBoundingClientRect().top+scrollY))+'px';
      gsap.registerPlugin(ScrollTrigger);
      if(!lenis&&!media.matches&&window.Lenis){lenis=new Lenis({autoRaf:false,smoothWheel:true,duration:.65});lenis.on('scroll',ScrollTrigger.update);gsap.ticker.lagSmoothing(0);}
      if(media.matches&&lenis){lenis.destroy();lenis=null;}
      const sections=[...root.querySelectorAll('.viagem-etapa')];
      chromeAreas=[...document.querySelectorAll('.barra,.dock,body>header')];
      root.classList.toggle('jornada-ativa',!media.matches);
      const renderProgress=()=>{
        const time=master?.time()||0,current=Math.min(sections.length-1,Math.floor(time+.5));
        // Cada capítulo tem uma pausa de leitura e uma passagem curta, reversível.
        camera.focus=current>=2&&current<sections.length-1?current-2:-1;
        activeContent=root.classList.contains('jornada-fora')?null:sections[current]?.querySelector('.viagem-texto');
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
      const anchorY=mobile()&&!document.body.classList.contains('jornada-mobile')?.32:.23;
      const steps=[{x:mobile()?0:-85,y:0,zoom:1,rotation:0,opening:0,anchorY},
        {x:mobile()?0:-85,y:0,zoom:mobile()?1.05:1.12,rotation:.015,opening:.4,anchorY},
        ...nodes.map((n,i)=>({x:mobile()?0:-110,y:0,zoom:mobile()?1.05:.96,rotation:0,opening:.15,anchorY})),
        {x:mobile()?0:-85,y:0,zoom:.85,rotation:0,opening:0,anchorY}];
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
      master.scrollTrigger.update();
      interaction.lastProgress=camera.progress;
      renderProgress();
    }
    function contextLost(e){e.preventDefault();fallback('Contexto gráfico indisponível');}
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncLoop();});observer.observe(el);
    const onVisibility=()=>syncLoop(),onMotion=()=>{syncLoop();if(journey)connectJourney(journey);},onScroll=()=>{
      // Também cobre scroll após o término do trigger, onde onUpdate já não muda.
      if(journey)journey.classList.toggle('jornada-fora',journey.getBoundingClientRect().bottom<innerHeight-2);
      if(media.matches)draw(0);
    };
    const onPointer=e=>{if(e.pointerType==='touch'||media.matches)return;interaction.targetX=clamp(e.clientX/innerWidth*2-1,-1,1);interaction.targetY=clamp(e.clientY/innerHeight*2-1,-1,1);};
    const resetPointer=()=>{interaction.targetX=interaction.targetY=0;};
    document.addEventListener('visibilitychange',onVisibility);media.addEventListener('change',onMotion);window.addEventListener('resize',resize);window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('pointermove',onPointer,{passive:true});document.addEventListener('pointerleave',resetPointer);window.addEventListener('blur',resetPointer);
    start();
    return {el,atualizar(ps){const signature=JSON.stringify(ps);if(signature===JSON.stringify(projects))return;projects=ps.map(p=>({...p}));rebuild();},selecionar(id){selected=id;draw(0);},modo(value){mode=value;el.hidden=value==='fundo';syncLoop();},rolagem(){},pausar(value){paused=value;syncLoop();},varredura(){if(glow&&!media.matches)gsap.fromTo(breath,{alpha:1.8},{alpha:.8,duration:1});},jornada:connectJourney,
      depurar:()=>({ready:!!world,failed,firstRender,frames,ticks,quality,projects:nodes.length,connections:nodes.length,progress:camera.progress,renderer:app?.renderer.name,reduced:media.matches,loop:loopAttached,
        // Caixa conservadora da região incandescente central (não inclui corona transparente).
        coreBounds:world?{x:world.x-90*world.scale.x*breath.scale,y:world.y-90*world.scale.y*breath.scale,width:180*world.scale.x*breath.scale,height:180*world.scale.y*breath.scale}:null,
        interaction:{...interaction},particleSamples:stars.map(l=>l.points.slice(0,3).map(q=>({x:q.p.x,y:q.p.y,alpha:q.p.alpha}))),
        packets:nodes.map(n=>({id:n.p.id,x:n.packet.x,y:n.packet.y,alpha:n.packet.alpha,visible:n.packet.visible})),
        resolution:app?.renderer.resolution,backgrounds:backgrounds.map(b=>({x:b.s.x,y:b.s.y,visible:b.s.visible,alpha:b.s.alpha,depth:b.depth})),
        endpoints:nodes.map(n=>({id:n.p.id,x:n.body.x,y:n.body.y,status:n.p.status}))}),
      destruir(){dead=true;syncLoop();master?.scrollTrigger?.kill();master?.kill();lenis?.destroy();breathTween?.kill();nodes.forEach(n=>n.tween?.kill());observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);media.removeEventListener('change',onMotion);window.removeEventListener('resize',resize);window.removeEventListener('scroll',onScroll);window.removeEventListener('pointermove',onPointer);document.removeEventListener('pointerleave',resetPointer);window.removeEventListener('blur',resetPointer);app?.destroy(true,{children:true});el.remove();}
    };
  }
  return {montar,cores,nomes};
})();
