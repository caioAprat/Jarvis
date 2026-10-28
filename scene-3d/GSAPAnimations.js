import {createSmoothScroll} from './SmoothScroll.js';
// DOM acessível e ScrollTrigger compartilham o estado da cena, sem criar outro RAF.
export function createGSAPAnimations(state,draw){
 let anchorHandler=null;
 let root=null,master=null,headerTween=null,intro=null,sections=[],smooth=null;
 function detach(){if(root&&anchorHandler)root.removeEventListener('click',anchorHandler);anchorHandler=null;smooth?.dispose();smooth=null;master?.scrollTrigger?.kill();master?.kill();headerTween?.scrollTrigger?.kill();headerTween?.kill();intro?.kill();master=headerTween=intro=null;state.activeText=null;}
 function attach(next){
  detach();root=next;if(!root?.isConnected)return;
  sections=[...root.querySelectorAll('.viagem-etapa')];
  const animated=!state.reduced&&!state.failed;
  root.classList.toggle('jornada-ativa',animated);root.classList.remove('jornada-fora');
  if(!animated){sections.forEach(s=>{const text=s.querySelector('.viagem-texto');gsap.set(text,{clearProps:'all'});text.inert=false;});gsap.set('.barra,.stats-dock,body>header',{clearProps:'all'});document.querySelectorAll('.barra,body>header').forEach(e=>{e.inert=false;e.style.pointerEvents='';});return;}
  gsap.registerPlugin(ScrollTrigger);
  smooth=createSmoothScroll();
  root.style.marginTop=(parseFloat(getComputedStyle(root).marginTop)-(root.getBoundingClientRect().top+scrollY))+'px';
  const update=()=>{
   const time=master?.time()||0,index=Math.min(sections.length-1,Math.floor(time+.5));
   state.progress=sections.length>1?time/(sections.length-1):0;state.focus=index>=2&&index<sections.length-1?index-2:-1;
   const outside=root.getBoundingClientRect().bottom<innerHeight-2;root.classList.toggle('jornada-fora',outside);
   state.activeText=outside?null:sections[index]?.querySelector('.viagem-texto');
   state.chapter=index;
   const mobile=innerWidth<=700;
   const side=index>=2&&index<sections.length-1?(index-2)%3:0;
   state.motion.heroSide=mobile?0:side===1?-.18:side===2?.12:.19;
   sections.forEach((s,i)=>{
    const text=s.querySelector('.viagem-texto'),active=i===index&&!outside;
    const distance=Math.abs(time-i),fade=Math.max(.08,Math.min(1,(.5-distance)/.25));
    const direction=time<i?1:-1;
    text.inert=!active;text.style.pointerEvents=active?'auto':'none';
    // Cada composição tem uma entrada própria. Só o painel legível recebe foco.
    gsap.set(text,{opacity:active?fade:0,y:active?direction*(1-fade)*85:0,x:active?(i%2?1:-1)*(1-fade)*35:0,scale:active?.92+.08*fade:1,rotation:active?(i%2?1:-1)*(1-fade)*2:0,visibility:active?'visible':'hidden'});
    const plasma=s.querySelector('.project-plasma');
    if(plasma){plasma.style.setProperty('--plasma-scroll',String(time-i));plasma.style.opacity=active?String(.65+.35*fade):'0';}
   });
   const marker=root.querySelector('.viagem-regua span');if(marker)marker.textContent=String(index+1).padStart(2,'0')+' / '+String(sections.length).padStart(2,'0');
   if(state.reduced)draw();
  };
  master=gsap.timeline({onUpdate:update,scrollTrigger:{id:'jarvis-jornada',trigger:root,start:'top top',end:'bottom bottom',scrub:.3,onEnterBack:update,onLeave:update}});
  const clock={time:0};
  Object.assign(state.motion,{heroYaw:0,heroScale:1,heroLift:0,background:0,heroSide:.19});
  master.to(clock,{time:sections.length-1,duration:sections.length-1,ease:'none'},0);
  // O mesmo relógio move o Jarvis e as camadas profundas, não só os projetos.
  master.to(state.motion,{heroYaw:1.05,heroScale:.94,heroLift:.16,background:1,duration:sections.length-1,ease:'sine.inOut'},0);
  const header=document.querySelector('.barra')||document.querySelector('body>header');
  if(header){gsap.set(header,{opacity:1,y:0});headerTween=gsap.to(header,{y:-50,opacity:0,ease:'none',scrollTrigger:{id:'jarvis-header',trigger:root,start:'top top',end:'top -140',scrub:true,onUpdate:t=>{header.inert=t.progress>.98;header.style.pointerEvents=t.progress>.98?'none':'';}}});}
  const dock=document.querySelector('.stats-dock');if(dock)intro=gsap.fromTo(dock,{opacity:0,y:18},{opacity:1,y:0,duration:state.reduced?0:.9,delay:.25,ease:'power2.out'});
  anchorHandler=event=>{
   const anchor=event.target.closest('a[href="#viagem-nucleo"]');
   if(!anchor)return;
   event.preventDefault();
   event.stopPropagation(); // Esta âncora pertence ao passeio, não ao roteador de abas.
   const st=master.scrollTrigger;
   smooth.lenis.scrollTo(st.start+(st.end-st.start)/Math.max(1,sections.length-1),{duration:1.2});
  };
  root.addEventListener('click',anchorHandler);
  ScrollTrigger.refresh();master.scrollTrigger.update();update();
 }
 return {attach,refresh(){if(root?.isConnected)attach(root);},get smooth(){return !!smooth;},get root(){return root;},scroll(){if(root?.isConnected&&root.getBoundingClientRect().bottom<innerHeight-2){root.classList.add('jornada-fora');state.activeText=null;}},dispose:detach};
}
