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
    let app, world, assets, core, nuc, fios, part, lines, foreground;
    let geral=false, snap=null, painelId='', pular=false, hover=-1, projects=[], nodes=[], backgrounds=[], stars=[], paused=false, visible=true, dead=false, failed=false, selected='', mode='palco';
    let firstRender=null, ticks=0, elapsed=0, frames=0, quality=1, slow=0, loopAttached=false, lastTime=0;
    const camera={x:0,y:0,zoom:1,rotation:0,progress:0,focus:-1,opening:0,anchorY:.43,geral:0};
    let master=null, lenis=null, journey=null, revealed=false;
    const mobile=()=>innerWidth<700;
    const sprite=(texture,parent,size)=>{ const s=new PIXI.Sprite(texture);s.anchor.set(.5);if(size)s.width=s.height=size;parent.addChild(s);return s; };
    function fallback(error) { console.error('Jarvão: cena 2D em modo estático —',error);failed=true;lenis?.destroy();lenis=null;el.dataset.fallback='true';boot.hidden=false;boot.textContent='Visual estático · seus controles continuam disponíveis';if(app)app.canvas.hidden=true;syncLoop();el.dispatchEvent(new CustomEvent('cena-fallback',{detail:String(error)})); }
    async function start() {
      try {
        if(!window.PIXI || !window.gsap) throw new Error('Biblioteca indisponível');
        const sheets=['nucleo-1','gemas','universo'];
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
          for(let i=0;i<(mobile()?230:850);i++){const x=rnd(),y=rnd(),size=.025+rnd()*.09,al=.2+rnd()*.65;const p=new PIXI.Particle({texture:universe.poeira,x:x*innerWidth,y:y*innerHeight,scaleX:size,scaleY:size,alpha:al,tint:i%5?0xcba77c:0xf4ead6});container.addParticle(p);points.push({p,x,y,size,al,tw:i%4===0?1.2+rnd()*2.8:0,ph:rnd()*6.28});}
          stars.push({container,points,depth});
        }
        const bg=new PIXI.Container();app.stage.addChild(bg);
        const types=Object.keys(universe).filter(k=>!k.startsWith('nebulosa')&&k!=='poeira');
        types.forEach((type,i)=>{const s=sprite(universe[type],bg,55+(i%4)*38);s.alpha=.3+(i%3)*.07;backgrounds.push({s,x:(i*.271+.09)%1,y:(i*.437+.13)%1,depth:.13+(i%3)*.09,index:i});});
        world=new PIXI.Container();app.stage.addChild(world);
        const orbits=new PIXI.Graphics();world.addChild(orbits);
        for(let i=0;i<3;i++)orbits.ellipse(0,0,350+i*100,155+i*55).stroke({color:0xc58242,width:.6,alpha:.19});
        orbits.cacheAsTexture({resolution:1});
        lines=new PIXI.Graphics();world.addChild(lines);
        nuc=NucleoJarvo.criar(PIXI,{raio:150,tam:mobile()?1024:2048,frequencia:mobile()?8:12,nos:mobile()?90:190});core=nuc.container;world.addChild(core);
        fios=FiosJarvo.criar(PIXI,{mundo:world,nucleo:nuc,densidade:mobile()?.5:1});
        part=ParticulasJarvo.criar(PIXI,{mundo:world,nucleo:nuc,densidade:mobile()?.45:1});
        foreground=new PIXI.ParticleContainer({dynamicProperties:{position:true,color:false,vertex:false,rotation:false}});app.stage.addChild(foreground);
        for(let i=0;i<60;i++)foreground.addParticle(new PIXI.Particle({texture:universe.poeira,tint:0xe89b55,alpha:.3,scaleX:.15,scaleY:.15}));
        boot.hidden=true;el.dataset.ready='true';rebuild();resize();syncLoop();
      }catch(e){fallback(e);}
    }
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(!dead)medeRotulos();});
    function rebuild(){
      labels.replaceChildren();
      for(const n of nodes){n.body.destroy({children:true});n.tween?.kill();}nodes=[];
      projects.forEach((p,i)=>{
        const button=document.createElement('button');button.type='button';button.className='cena-label';button.dataset.id=p.id;button.dataset.status=p.status;
        button.innerHTML='<span>'+esc(p.nome)+'</span><small>'+esc(nomes[p.status]||p.status)+'</small>';button.onclick=()=>clique(p.id);labels.appendChild(button);
        const alvo=document.createElement('div');alvo.className='cena-alvo';alvo.setAttribute('aria-hidden','true');alvo.onclick=()=>clique(p.id);labels.appendChild(alvo);
        for(const el2 of [button,alvo]){el2.addEventListener('mouseenter',()=>{hover=i;});el2.addEventListener('mouseleave',()=>{hover=-1;});}
        button.addEventListener('focus',()=>{hover=i;});button.addEventListener('blur',()=>{hover=-1;});
        if(!world)return;
        const body=new PIXI.Container();world.addChild(body);
        const halo=sprite(assets[0].textures.glow,body,150);halo.tint=cores[p.status]||cores.config;halo.alpha=.7;halo.blendMode='add';
        // Anel de status: mostra de longe quem está ok, parado ou com problema.
        const anel=new PIXI.Graphics().circle(0,0,46).stroke({color:cores[p.status]||cores.config,width:1.4,alpha:p.status==='pausado'?.3:.7});body.addChild(anel);
        const gem=new PIXI.AnimatedSprite(assets[1].animations.gema,false);gem.anchor.set(.5);gem.width=gem.height=68;gem.tint=cores[p.status]||cores.config;body.addChild(gem);
        const angle=-Math.PI/2+i*Math.PI*2/Math.max(1,projects.length);
        const pulse={value:0};const tween=p.status==='pausado'?null:gsap.to(pulse,{value:1,duration:p.status==='ok'?3:6,repeat:-1,yoyo:p.status==='ok',ease:'sine.inOut',paused:media.matches});
        nodes.push({p,body,gem,halo,button,alvo,angle,x:Math.cos(angle)*520,y:Math.sin(angle)*330,pulse,tween});
      });
      if(world){fios?.montar(projects);part?.montar(projects);world.setChildIndex(core,world.children.length-1);}
      if(journey)connectJourney(journey);draw(0);
    }
    // Rótulos que se sobrepõem são afastados (para o lado se couber, senão para baixo); larguras em cache.
    function medeRotulos(){for(const n of nodes){n.lw=n.button.offsetWidth||100;n.lh=n.button.offsetHeight||40;}}
    function separaRotulos(w,compact){
      if(nodes.length&&nodes[0].lw===undefined)medeRotulos();
      const folga=4,max=w-(compact?20:Math.min(240,Math.max(140,w*.125)))+40;
      for(let passo=0;passo<3;passo++)for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j],dx=b.lx-a.lx,dy=b.ly-a.ly,lx=(a.lw+b.lw)/2+folga;
        if(Math.abs(dx)>=lx||Math.abs(dy)>=Math.max(a.lh,b.lh)+folga)continue;
        const dir=dx>=0?1:-1,novoX=b.lx+dir*(lx-Math.abs(dx));
        if(novoX>55&&novoX<max){b.lx=novoX;}else{if(dy>=0)b.ly=a.ly+Math.max(a.lh,b.lh)+folga;else a.ly=b.ly+Math.max(a.lh,b.lh)+folga;}
      }
      for(const n of nodes)n.button.style.transform=`translate(${n.lx}px,${n.ly}px) translateX(-50%)`;
    }
    function resize(){if(!app||dead)return;medeRotulos();app.renderer.resize(el.clientWidth||innerWidth,el.clientHeight||innerHeight);draw(0);if(journey)connectJourney(journey);}
    function draw(dt){
      if(!app||!world||dead||failed)return;
      const w=app.screen.width,h=app.screen.height,compact=mobile();let base=Math.min(w/(compact?1100:1300),h/850),cx=compact?.5:.62;
      // Abertura: a órbita (com os rótulos) cabe na área livre à direita do texto; volta ao normal quando a câmera entra.
      if(!compact){const rv=Math.min(240,Math.max(140,w*.125)),tr=w*.08+Math.min(w*.38,560)+16,fit=Math.min(1,((w-tr-rv)/2)/(560*base)),t=Math.min(1,camera.progress/.125),cf=(tr+w-rv)/2/w;cx=cf+(cx-cf)*t;base*=fit+(1-fit)*t;cx+=(.5-cx)*camera.geral;}
      
      world.scale.set(base*camera.zoom);world.rotation=camera.rotation;
      world.position.set(w*cx-camera.x*base*camera.zoom,h*(compact?camera.anchorY:.53)-camera.y*base*camera.zoom);
      nuc.suave(media.matches);nuc.atualizar(dt/1000);
      for(const n of nodes){const a=n.angle+(media.matches?0:Math.sin(elapsed*.035)*.08);n.body.position.set(Math.cos(a)*520,Math.sin(a)*330+Math.sin(elapsed*.6+n.angle)*5);n.gem.gotoAndStop(Math.floor(elapsed*12)%64);n.body.alpha=n.p.status==='pausado'?.45:1;const pt=world.toGlobal(n.body.position);n.lx=Math.max(compact?55:90,Math.min(w-(compact?55:Math.min(240,Math.max(140,w*.125))),pt.x));n.ly=pt.y+36*base;const vis=geral||camera.geral>.01||camera.progress<=.06;n.button.style.opacity=vis?'1':'0';n.button.style.pointerEvents=vis?'auto':'none';n.button.tabIndex=vis?0:-1;n.alvo.style.transform=`translate(${pt.x}px,${pt.y}px)`;n.alvo.style.pointerEvents=vis?'auto':'none';}
      separaRotulos(w,compact);
      const forcas=nodes.map((n,i)=>{const f=selected===n.p.id||Math.round(camera.focus)===i||hover===i;return n.p.status==='pausado'?.14:f?.95:camera.focus>=0?.18:.45;});
      part.suave(media.matches);part.atualizar(dt/1000,nodes.map(n=>n.body));fios.suave(media.matches);fios.atualizar(dt/1000,nodes.map(n=>n.body),forcas,i=>{});
      nodes.forEach((n,i)=>{const fl=fios.flash(i);n.halo.alpha=.7+.9*fl+(hover===i?.5:0);n.body.scale.set(1+.16*fl);});
      drawConnections();
      for(const layer of stars){layer.container.alpha=quality<1&&layer.depth===0?.35:1;const d=(layer.depth+1)*.13;for(const q of layer.points){q.p.x=((q.x*w-camera.x*d+elapsed*d*2)%w+w)%w;q.p.y=((q.y*h-camera.y*d-camera.progress*120*d)%h+h)%h;if(q.tw&&!media.matches)q.p.alpha=q.al*(.55+.45*Math.sin(elapsed*q.tw+q.ph));q.p.scaleX=q.size*(1+Math.min(2,Math.abs(camera.progress-(camera.previousProgress||0))*100));}}
      backgrounds.forEach(b=>{b.s.visible=!compact||b.index<5;b.s.x=((b.x*w-camera.x*b.depth)%(w+180)+w+180)%(w+180)-90;b.s.y=((b.y*h-camera.y*b.depth-camera.progress*h*b.depth)%(h+180)+h+180)%(h+180)-90;b.s.rotation=camera.rotation*b.depth;b.s.scale.set((.25+(b.index%4)*.15)*(1+camera.progress*b.depth));});
      foreground.particleChildren.forEach((p,i)=>{p.x=(i*157.7+elapsed*4)%w;p.y=((i*93.1-elapsed*9-camera.progress*90)%h+h)%h;});
      camera.previousProgress=camera.progress;
      if(!pular){app.render();frames++;}
      if(firstRender===null)firstRender=performance.now();
      if(window.__jarvisMeasure?.sampling)window.__jarvisMeasure.frames.push(performance.now());
    }
    function drawConnections(){
      lines.clear();
      nodes.forEach((n,index)=>{
        const focused=selected===n.p.id||Math.round(camera.focus)===index;
        if(painelId&&n.p.id===painelId){const pe=labels.querySelector('.painel-proj');if(pe){const r=pe.getBoundingClientRect(),cor=cores[n.p.status]||cores.config,end=world.toLocal(new PIXI.Point(r.left<innerWidth/2?r.right:r.left,r.top+26));lines.moveTo(n.body.x,n.body.y).lineTo(end.x,end.y).stroke({color:cor,width:.9,alpha:.55});lines.circle(end.x,end.y,2.5).fill({color:cor,alpha:.9});}}
        if(!focused||!journey)return;
        const x=n.body.x,y=n.body.y,color=cores[n.p.status]||cores.config;
        const content=journey.querySelectorAll('.viagem-projeto .viagem-texto')[index];if(content){const rect=content.getBoundingClientRect();if(rect.top>80&&rect.top<innerHeight-100){const end=world.toLocal(new PIXI.Point(mobile()?rect.left+20:rect.right+15,rect.top+6));lines.moveTo(x,y).lineTo(end.x,end.y).stroke({color,width:.65,alpha:.3});lines.circle(end.x,end.y,2).fill({color,alpha:.6});}}
      });
    }
    function tick(time,delta){
      if(paused||!visible||document.hidden||mode==='fundo'||failed)return;
      lenis?.raf(time*1000);elapsed+=Math.min(delta,100)/1000;ticks++;lastTime=time;
      if(delta>20)slow+=Math.min(delta,100);else slow=Math.max(0,slow-20);
      if(slow>3000&&quality===1){quality=.65;stars[0].container.visible=false;foreground.visible=false;nuc?.qualidade(.65);fios?.qualidade(.65);part?.qualidade(.65);el.dataset.quality='adaptativa';}
      draw(delta);
    }
    function syncLoop(){
      const active=!dead&&!failed&&!paused&&visible&&!document.hidden&&mode!=='fundo';
      const animated=active&&!media.matches;
      nodes.forEach(n=>n.tween?.paused(!animated));
      if(animated&&!loopAttached){gsap.ticker.add(tick);loopAttached=true;}
      if(!animated&&loopAttached){gsap.ticker.remove(tick);loopAttached=false;}
      if(active)draw(0);
    }
    // ---- navegação: mapa de projetos, teclas 1-9, Visão geral (G) e painel de detalhes
    function irPara(i){
      const st=master?.scrollTrigger;if(!st||!journey)return;
      if(geral)sairGeral(true);fecharPainel();
      const n=Math.max(1,journey.querySelectorAll('.viagem-etapa').length-1),y=st.start+(st.end-st.start)*Math.max(0,Math.min(1,i/n));
      if(lenis&&!media.matches)lenis.scrollTo(y,{duration:1.4,easing:t=>1-Math.pow(1-t,3)});else scrollTo({top:y,behavior:media.matches?'auto':'smooth'});
    }
    function entrarGeral(){
      const st=master?.scrollTrigger;if(geral||!st||!journey)return;
      geral=true;snap={...camera};st.disable(false);lenis?.stop();fecharPainel();
      journey.classList.add('jornada-geral');document.documentElement.classList.add('visao-geral');
      journey.querySelectorAll('.mp-geral').forEach(b=>b.setAttribute('aria-pressed','true'));
      gsap.to(camera,{x:0,y:0,zoom:media.matches?.9:.82,rotation:0,focus:-1,opening:0,anchorY:.5,geral:1,duration:media.matches?0:1.1,ease:'power3.inOut',onUpdate:()=>{if(media.matches)draw(0);},onComplete:()=>draw(0)});
    }
    function sairGeral(rapido){
      if(!geral)return;fecharPainel();
      const fim=()=>{geral=false;master?.scrollTrigger?.enable(false);lenis?.start();journey?.classList.remove('jornada-geral');document.documentElement.classList.remove('visao-geral');journey?.querySelectorAll('.mp-geral').forEach(b=>b.setAttribute('aria-pressed','false'));draw(0);};
      const alvo={...snap,geral:0};
      if(rapido||media.matches){gsap.killTweensOf(camera);Object.assign(camera,alvo);fim();}
      else gsap.to(camera,{...alvo,duration:.9,ease:'power3.inOut',onComplete:fim});
    }
    function clique(id){if(geral||camera.geral>.5)abrirPainel(id);else options.aoSelecionar?.(id);}
    function abrirPainel(id){
      const p=projects.find(x=>x.id===id);if(!p)return;painelId=id;
      let el2=labels.querySelector('.painel-proj');if(!el2){el2=document.createElement('aside');el2.className='painel-proj';el2.setAttribute('role','dialog');el2.setAttribute('aria-label','Detalhes do projeto');labels.appendChild(el2);}
      const pct=v=>v==null?'—':(Math.round(v*10)/10)+'%',quando=p.desde&&typeof window.ha==='function'?window.ha(p.desde):'';
      el2.innerHTML='<button type="button" class="pp-x" aria-label="Fechar detalhes">×</button><p class="pp-k">'+(p.cliente?'SISTEMA DO CLIENTE':'MEU PROJETO')+'</p><h3>'+esc(p.nome)+'</h3><p class="pp-s" data-status="'+esc(p.status)+'">'+esc(nomes[p.status]||p.status)+(quando?' · '+esc(quando):'')+'</p><div class="pp-n"><span><b>'+pct(p.disp7)+'</b><small>7 dias</small></span><span><b>'+pct(p.disp30)+'</b><small>30 dias</small></span></div><p class="pp-d">'+esc(p.detalhe||'Conectado ao núcleo de controle.')+'</p><button type="button" class="pp-a">Abrir projeto ↗</button>';
      el2.querySelector('.pp-x').onclick=fecharPainel;el2.querySelector('.pp-a').onclick=()=>options.aoSelecionar?.(id);
      el2.dataset.aberto='true';draw(0);el2.querySelector('.pp-a').focus({preventScroll:true});
    }
    function fecharPainel(){painelId='';const el2=labels.querySelector('.painel-proj');if(el2)el2.dataset.aberto='false';}
    function aoTecla(e){
      if(!journey||!journey.isConnected||e.ctrlKey||e.metaKey||e.altKey||e.defaultPrevented)return;
      const t=e.target,tag=t&&t.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)||document.querySelector('.pal'))return;
      if(e.key==='Escape'){if(painelId)fecharPainel();else if(geral)sairGeral();return;}
      if(e.key==='g'||e.key==='G'){e.preventDefault();geral?sairGeral():entrarGeral();return;}
      if(/^[1-9]$/.test(e.key)&&+e.key<=projects.length){e.preventDefault();irPara(+e.key+1);}
    }
    const aoClicarMapa=e=>{
      const alvo=e.target.closest&&e.target.closest('[data-viagem],[data-viagem-geral]');if(!alvo||!journey||!journey.contains(alvo))return;
      if(alvo.hasAttribute('data-viagem-geral'))geral?sairGeral():entrarGeral();else irPara(+alvo.dataset.viagem);
    };
    document.addEventListener('keydown',aoTecla);document.addEventListener('click',aoClicarMapa);
    function connectJourney(root){
      if(geral){geral=false;lenis?.start();document.documentElement.classList.remove('visao-geral');}
      master?.scrollTrigger?.kill();master?.kill();master=null;journey=root;
      if(!root||!root.isConnected){lenis?.destroy();lenis=null;return;}
      if(!world||!window.ScrollTrigger)return;
      root.style.marginTop=(parseFloat(getComputedStyle(root).marginTop)-(root.getBoundingClientRect().top+scrollY))+'px';
      gsap.registerPlugin(ScrollTrigger);
      if(!lenis&&!media.matches&&window.Lenis){lenis=new Lenis({autoRaf:false,smoothWheel:true,duration:1.15});lenis.on('scroll',ScrollTrigger.update);gsap.ticker.lagSmoothing(0);}
      if(media.matches&&lenis){lenis.destroy();lenis=null;}
      const sections=[...root.querySelectorAll('.viagem-etapa')];
      root.classList.toggle('jornada-ativa',!media.matches);
      const renderProgress=()=>{
        const time=master?.time()||0,current=Math.min(sections.length-1,Math.floor(time+.5));
        // A atualização pertence à timeline: o scrub continua após a roda parar.
        sections.forEach((s,i)=>{const content=s.querySelector('.viagem-texto'),active=i===current&&!root.classList.contains('jornada-fora');
          content.inert=!media.matches&&!active;
          content.style.pointerEvents=media.matches||active?'auto':'none';
          if(!media.matches)gsap.set(content,{opacity:active?1:0,y:active?Math.sin((time-i)*Math.PI)*10:0});
        });
        root.querySelectorAll('.mp-item').forEach(b=>{if(+b.dataset.viagem===current)b.setAttribute('data-ativo','');else b.removeAttribute('data-ativo');});
        if(media.matches)draw(0);
      };
      master=gsap.timeline({onUpdate:renderProgress,scrollTrigger:{id:'jarvis-jornada',trigger:root,start:'top top',end:'bottom bottom',scrub:media.matches?true:1,
        onLeave:()=>{if(scrollY>root.getBoundingClientRect().bottom+scrollY-innerHeight+2)root.classList.add('jornada-fora');renderProgress();},
        onEnterBack:()=>{root.classList.remove('jornada-fora');renderProgress();}}});
      gsap.set(camera,{x:0,y:0,zoom:1,rotation:0,progress:0,focus:-1,opening:0,anchorY:.43});
      const steps=[{x:0,y:0,zoom:1,rotation:0,focus:-1,opening:0,anchorY:.43},
        {x:mobile()?0:-110,y:0,zoom:1.55,rotation:.025,focus:-1,opening:1,anchorY:.43},
        ...nodes.map((n,i)=>({x:n.x+(mobile()?0:n.x>5?160:-100),y:n.y,zoom:mobile()?2.1:1.9,rotation:i%2?.025:-.025,focus:i,opening:0,anchorY:.18})),
        {x:0,y:0,zoom:.78,rotation:0,focus:-1,opening:0,anchorY:.43}];
      for(let i=1;i<steps.length;i++)master.to(camera,{...steps[i],progress:i/(steps.length-1),duration:1,ease:'power2.inOut'},i-1);
      sections.forEach((section,i)=>{
        const content=section.querySelector('.viagem-texto');if(!content)return;
        section.querySelector('.viagem-posicao').dataset.side=!mobile()&&nodes[i-2]?.x>5?'right':'left';
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
      if(journey){journey.classList.toggle('jornada-fora',journey.getBoundingClientRect().bottom<innerHeight-2);document.documentElement.classList.toggle('cena-fundo',journey.classList.contains('jornada-fora'));}
      if(media.matches)draw(0);
    };
    document.addEventListener('visibilitychange',onVisibility);media.addEventListener('change',onMotion);window.addEventListener('resize',resize);window.addEventListener('scroll',onScroll,{passive:true});
    start();
    return {el,atualizar(ps){const signature=JSON.stringify(ps);if(signature===JSON.stringify(projects))return;projects=ps.map(p=>({...p}));rebuild();},selecionar(id){selected=id;draw(0);},modo(value){mode=value;el.hidden=value==='fundo';syncLoop();},rolagem(){},irPara,visaoGeral(v){v===false?sairGeral():entrarGeral();},get emGeral(){return geral;},evento(id,tipo){fios?.evento(id,tipo);},ritmo(avisos){nuc?.ritmo(avisos);},avancar(ms,n=1){for(let i=0;i<n;i++){elapsed+=ms/1000;pular=i<n-1;draw(ms);}pular=false;},pausar(value){paused=value;syncLoop();},varredura(){if(nuc&&!media.matches){const o=nuc.ondas.find(w=>w.t>.7)||nuc.ondas[0];o.t=0;}},jornada:connectJourney,
      depurar:()=>({nucleo:nuc,fiosApi:fios,partApi:part,ready:!!world,failed,firstRender,frames,ticks,quality,projects:nodes.length,connections:nodes.length,progress:camera.progress,renderer:app?.renderer.name,reduced:media.matches,loop:loopAttached,
        // Caixa conservadora da região incandescente central (não inclui corona transparente).
        coreBounds:world?{x:world.x-90*world.scale.x*(nuc?nuc.batida.escala:1),y:world.y-90*world.scale.y*(nuc?nuc.batida.escala:1),width:180*world.scale.x*(nuc?nuc.batida.escala:1),height:180*world.scale.y*(nuc?nuc.batida.escala:1)}:null,
        resolution:app?.renderer.resolution,backgrounds:backgrounds.map(b=>({x:b.s.x,y:b.s.y,visible:b.s.visible,depth:b.depth})),
        endpoints:nodes.map(n=>({id:n.p.id,x:n.body.x,y:n.body.y,status:n.p.status}))}),
      destruir(){dead=true;syncLoop();master?.kill();lenis?.destroy();nodes.forEach(n=>n.tween?.kill());observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);document.removeEventListener('keydown',aoTecla);document.removeEventListener('click',aoClicarMapa);media.removeEventListener('change',onMotion);window.removeEventListener('resize',resize);window.removeEventListener('scroll',onScroll);app?.destroy(true,{children:true});el.remove();}
    };
  }
  return {montar,cores,nomes};
})();
