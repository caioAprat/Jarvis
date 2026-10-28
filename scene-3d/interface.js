// DOM acessível e ScrollTrigger compartilham o estado da cena, sem criar outro RAF.
export function createInterface(state,draw){
 let root=null,master=null,headerTween=null,intro=null,sections=[];
 function detach(){master?.scrollTrigger?.kill();master?.kill();headerTween?.scrollTrigger?.kill();headerTween?.kill();intro?.kill();master=headerTween=intro=null;state.activeText=null;}
 function attach(next){
  detach();root=next;if(!root?.isConnected)return;
  sections=[...root.querySelectorAll('.viagem-etapa')];
  const animated=!state.reduced&&!state.failed;
  root.classList.toggle('jornada-ativa',animated);root.classList.remove('jornada-fora');
  if(!animated){sections.forEach(s=>{const text=s.querySelector('.viagem-texto');gsap.set(text,{clearProps:'all'});text.inert=false;});gsap.set('.barra,.stats-dock,body>header',{clearProps:'all'});document.querySelectorAll('.barra,body>header').forEach(e=>{e.inert=false;e.style.pointerEvents='';});return;}
  gsap.registerPlugin(ScrollTrigger);
  root.style.marginTop=(parseFloat(getComputedStyle(root).marginTop)-(root.getBoundingClientRect().top+scrollY))+'px';
  const update=()=>{
   const time=master?.time()||0,index=Math.min(sections.length-1,Math.floor(time+.5));
   state.progress=sections.length>1?time/(sections.length-1):0;state.focus=index>=2&&index<sections.length-1?index-2:-1;
   const outside=root.getBoundingClientRect().bottom<innerHeight-2;root.classList.toggle('jornada-fora',outside);
   state.activeText=outside?null:sections[index]?.querySelector('.viagem-texto');
   state.chapter=index;
   sections.forEach((s,i)=>{const text=s.querySelector('.viagem-texto'),active=i===index&&!outside,distance=Math.abs(time-i),fade=.12+.88*Math.max(0,Math.min(1,(.5-distance)/.22));
    text.inert=!active;text.style.pointerEvents=active?'auto':'none';gsap.set(text,{opacity:active?fade:0,y:active?(time<i?1:-1)*(1-fade)*26:0,visibility:active?'visible':'hidden'});
   });
   const marker=root.querySelector('.viagem-regua span');if(marker)marker.textContent=String(index+1).padStart(2,'0')+' / '+String(sections.length).padStart(2,'0');
   if(state.reduced)draw();
  };
  master=gsap.timeline({onUpdate:update,scrollTrigger:{id:'jarvis-jornada',trigger:root,start:'top top',end:'bottom bottom',scrub:.3,onEnterBack:update,onLeave:update}});
  const clock={time:0};master.to(clock,{time:sections.length-1,duration:sections.length-1,ease:'none'});
  const header=document.querySelector('.barra')||document.querySelector('body>header');
  if(header){gsap.set(header,{opacity:1,y:0});headerTween=gsap.to(header,{y:-50,opacity:0,ease:'none',scrollTrigger:{id:'jarvis-header',trigger:root,start:'top top',end:'top -140',scrub:true,onUpdate:t=>{header.inert=t.progress>.98;header.style.pointerEvents=t.progress>.98?'none':'';}}});}
  const dock=document.querySelector('.stats-dock');if(dock)intro=gsap.fromTo(dock,{opacity:0,y:18},{opacity:1,y:0,duration:state.reduced?0:.9,delay:.25,ease:'power2.out'});
  ScrollTrigger.refresh();master.scrollTrigger.update();update();
 }
 return {attach,refresh(){if(root?.isConnected)attach(root);},get root(){return root;},scroll(){if(root?.isConnected&&root.getBoundingClientRect().bottom<innerHeight-2){root.classList.add('jornada-fora');state.activeText=null;}},dispose:detach};
}
