'use strict';
/** Um único trilho reversível: HTML acessível sobre a câmera/canvas existentes. */
(function(){
  const ids=['ola','prototipo','travessia','acesso','situacao','noar','pedidos','avisos','projetos','fecho'];
  const nomes=['Abertura','Protótipo','Travessia','Acesso','Situação','Projetos no ar','Pedidos','Avisos','Meus projetos','Visão geral'];
  function montar({host,mapa,api}){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,leve=innerWidth<700;
    let ativa=true,progress=0,index=-1,access=null,accessMode='',master=null,entered=false;
    const dep=mapa&&mapa.depurar(),cine=mapa&&LandingCinema.criar(mapa,reduced);
    const particles=dep&&LandingParticulas.montar(dep.scene,{leve});
    const pointer=particles&&LandingPonteiro.montar({camera:dep.camera,particulas:particles});
    const proto=mapa&&Prototipo.montar(mapa,{leve,projetos:(api.dados().P?.estado.projetos)||[]});
    const telas=proto&&window.TelasVivas?TelasVivas.criar(proto,{dados:api.dados,liberado:()=>api.acesso()==='livre',camera:()=>dep.camera,qualidade:()=>mapa.qualidade()}):null;
    const fios=proto&&window.Fios?Fios.montar(mapa,proto,{leve}):null;
    if(mapa)mapa.orbitas(false);
    document.body.classList.add('narr-on','narr-sem-rotulos');
    host.innerHTML='<div class="narr-trilho"><div class="narr-fix"></div></div>';
    const fixed=host.querySelector('.narr-fix');
    const scenes=ids.map((id,i)=>{const el=document.createElement('section');el.className='narr-cena';el.setAttribute('aria-label',nomes[i]);
      el.innerHTML='<div class="mom-lado"><p class="narr-label"></p><h2 class="mom-g"></h2><p class="mom-p"></p><div class="narr-projects"></div></div>';
      el.querySelector('.narr-label').textContent=String(i+1).padStart(2,'0')+' / '+nomes[i];fixed.append(el);return{el,id,g:el.querySelector('.mom-g'),p:el.querySelector('.mom-p'),version:''};});
    const direct=document.createElement('button');direct.type='button';direct.className='ir-direto';direct.textContent='Ir direto · D';document.body.append(direct);
    function textos(id){
      if(api.acesso()!=='livre'&&ids.indexOf(id)>3)return['',''];
      const P=api.dados().P,m=P&&LandingDados.metricas(P);
      if(id==='ola')return['Olá, Caio',new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})];
      if(id==='prototipo')return['Jarvão','Núcleo de controle'];
      if(id==='travessia')return['Núcleo de controle',''];
      if(id==='acesso')return['Núcleo de controle',''];
      if(!P)return['—','carregando os dados reais…'];
      if(id==='situacao')return[m.situacao[1],'conferido '+api.ha(P.estado.verificadoEm)];
      if(id==='noar')return[String(m.projetosNoAr),'projetos no ar · os pausados não contam'];
      if(id==='pedidos')return[String(P.pedidos.filter(p=>['novo','andamento'].includes(p.status)).length),'pedidos abertos'];
      if(id==='avisos')return[String(m.avisosNovos),'avisos que você ainda não viu'];
      if(id==='projetos')return['Meus projetos',''];
      return['Visão geral','Buscar (Ctrl K), Conferir tudo e o dock ficam sempre à mão. Role para a visão geral.'];
    }
    async function escrever(s){const values=textos(s.id),version=JSON.stringify(values);if(s.version===version)return;s.version=version;const job=s.job=(s.job||0)+1;
      await Escrita.grande(s.g,values[0]);if(ativa&&s.version===version&&s.job===job)await Escrita.pequeno(s.p,values[1]);
    }
    function acesso(){const mode=api.acesso();if(mode===accessMode)return;accessMode=mode;const s=scenes[3];
      if(mode!=='livre'){access=LandingAcesso.montar(s.el,{modo:mode,aoLink:api.aoLink,aoPin:api.aoPin});}
      else{access=null;s.el.innerHTML='<div class="mom-lado"><h2 class="mom-g"></h2><p class="mom-p"></p></div>';s.g=s.el.querySelector('h2');s.p=s.el.querySelector('p');s.version='';escrever(s);}
    }
    function atualizar(){if(!ativa)return;acesso();const P=api.dados().P;
      if(accessMode==='livre'&&P){proto?.atualizarStatus(P.estado.projetos);const box=scenes[8].el.querySelector('.narr-projects');
        const signature=JSON.stringify(P.estado.projetos.map(p=>[p.id,p.nome,p.status]));
        if(box.dataset.signature!==signature){box.dataset.signature=signature;box.replaceChildren();P.estado.projetos.forEach(p=>{const b=document.createElement('button');b.type='button';b.textContent=MapaVivo.limpar(p.nome);b.dataset.status=p.status;b.onclick=()=>entrarProjeto(p.id);box.append(b);});}}
      if(reduced)scenes.forEach((s,i)=>{s.el.hidden=i>3&&api.acesso()!=='livre';if(!s.el.hidden&&(i!==3||!access))escrever(s);});
      if(index>=0&&index!==3)escrever(scenes[index]);
    }
    function aplicar(p){progress=p;if(mapa)mapa.orbitas(false);const livre=api.acesso()==='livre';const effective=livre?p:Math.min(p,3/9);let next=LandingMovimento.etapa(p,livre);
      if(cine)cine.aplicar(reduced?0:effective);if(particles)particles.progresso(reduced?0:effective);
      proto?.aparecer(Math.max(0,Math.min(1,(effective-.07)*5))*(1-Math.min(1,Math.max(0,(effective-.86)*7))));
      if(fios){fios.acenderChao(1);fios.acenderEsticados(Math.min(1,effective*4));fios.pacotes(1);fios.progresso?.(effective);}
      if(next!==index){if(index>=0){const old=scenes[index];old.job=(old.job||0)+1;Escrita.sair?.(old.g);Escrita.sair?.(old.p);}
        index=next;const s=scenes[index];if(index===3&&access)access.escrever();else{s.version='';escrever(s);}}
      const current=scenes[index],exiting=!reduced&&Math.abs(effective*9-index)>.46;
      if(exiting&&!current.exiting){current.exiting=true;current.job=(current.job||0)+1;Escrita.sair?.(current.g);Escrita.sair?.(current.p);}
      else if(!exiting&&current.exiting){current.exiting=false;current.version='';if(index!==3||!access)escrever(current);}
      scenes.forEach((s,i)=>{const visible=reduced||i===index;s.el.inert=!visible;s.el.style.visibility=visible?'visible':'hidden';s.el.style.opacity=visible?'.88':'0';});
      if(livre&&p>.38&&!entered){entered=true;api.aoEntrar();}
    }
    function irAoAcesso(){const st=master?.scrollTrigger;if(st)LandingScroll.ir(st.start+(st.end-st.start)/3);else scenes[3].el.scrollIntoView();}
    function entrarProjeto(id){if(!ativa||api.acesso()!=='livre')return false;api.abrirPainel(id);return true;}
    function irDireto(){if(api.acesso()!=='livre'){irAoAcesso();return;}terminar();}
    const onKey=e=>{if(!e.ctrlKey&&!e.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&e.key.toLowerCase()==='d')irDireto();};
    const onPointer=e=>fios?.ponteiro?.(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
    direct.onclick=irDireto;addEventListener('keydown',onKey);addEventListener('pointermove',onPointer,{passive:true});addEventListener('pointerdown',onPointer,{passive:true});
    let t=0,slow=0,q=0;
    const tick=(_,ms)=>{if(!ativa||document.hidden)return;const dt=Math.min(ms/1000,.05);if(!reduced)t+=dt;
      particles?.quadro(t,dt);proto?.quadro(t,reduced?0:dt);telas?.quadro(t,dt);fios?.quadro(t,reduced?0:dt);
      slow=ms>35?slow+Math.min(ms,100):Math.max(0,slow-25);if(slow>3000&&q<3){q++;slow=0;particles?.qualidade(q);fios?.qualidade?.(q);}
    };
    function terminar(){if(!ativa)return;ativa=false;master?.scrollTrigger?.kill();master?.kill();gsap.ticker.remove(tick);LandingScroll.parar();pointer?.destruir();particles?.destruir();fios?.destruir();
      if(proto){proto.raiz.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});dep.scene.remove(proto.raiz);}
      removeEventListener('keydown',onKey);removeEventListener('pointermove',onPointer);removeEventListener('pointerdown',onPointer);removeEventListener('pagehide',terminar);
      scenes.forEach(s=>{Escrita.zerar(s.g);Escrita.zerar(s.p);});direct.remove();host.replaceChildren();document.body.classList.remove('narr-on','narr-sem-rotulos');mapa?.orbitas(true);mapa?.cinema(null);window.scrollTo(0,0);api.aoTerminar();}
    atualizar();
    if(!reduced){LandingScroll.iniciar();const clock={p:0};master=gsap.timeline({scrollTrigger:{id:'narrativa',trigger:host,start:'top top',end:'bottom bottom',scrub:.65},onUpdate:()=>aplicar(clock.p)}).to(clock,{p:1,duration:1,ease:'none'});}
    else host.classList.add('narr-estatico');
    aplicar(0);if(reduced)scenes.forEach(s=>{if(s.id==='acesso'&&access)access.escrever();else escrever(s);});gsap.ticker.add(tick);addEventListener('pagehide',terminar);
    return{ativa:()=>ativa,emB:()=>ativa&&progress>.38&&api.acesso()==='livre',acessoPendente:()=>api.acesso()!=='livre',altura:()=>ativa?host.offsetHeight:0,atualizar,entrarProjeto,irDireto,irAoAcesso,terminar,progresso:()=>progress,trecho:()=>progress>.38?'B':'A',cenaEm:p=>ids[Math.min(9,Math.round(p*9))]};
  }
  window.Narrativa={montar};
})();
