'use strict';
(function(){
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chars='01/\\|<>[]{}=+-_#ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function limpar(el){if(!el)return;el._tl?.kill();el._resolve?.();el._split?.revert();el._tl=el._split=el._resolve=null;el.replaceChildren();el.dataset.escrito='';}
  function escrever(el,texto,duration=.85){
    if(!el)return Promise.resolve();limpar(el);texto=String(texto??'');el.setAttribute('aria-label',texto);
    if(reduced()||!window.ScrambleTextPlugin||!window.SplitText){el.textContent=texto;el.dataset.escrito='1';return Promise.resolve();}
    gsap.registerPlugin(ScrambleTextPlugin,SplitText);
    const real=document.createElement('span'),vis=document.createElement('span');real.className='esc-reserva';vis.className='esc-vis';
    real.setAttribute('aria-hidden','true');vis.setAttribute('aria-hidden','true');real.textContent=vis.textContent=texto;el.append(real,vis);el.classList.add('esc-host');
    // O texto final reserva altura/largura; somente a camada visual muda caracteres.
    const split=new SplitText(vis,{type:'lines,words',aria:'none'});el._split=split;
    split.words.forEach(w=>{w.style.display='inline-block';w.style.width=w.getBoundingClientRect().width+'px';w.style.whiteSpace='nowrap';});
    return new Promise(resolve=>{el._resolve=resolve;el._tl=gsap.timeline({onComplete:()=>{el.dataset.escrito='1';el._resolve=null;resolve();}});
      split.words.forEach((w,i)=>el._tl.to(w,{duration,scrambleText:{text:w.textContent,chars,revealDelay:.1,speed:.65},ease:'none'},i*.04));
      if(!split.words.length)resolve();
    });
  }
  function sair(el){if(!el||reduced()||!el._split)return;el._tl?.kill();el._resolve?.();el._tl=gsap.timeline();
    el._split.words.forEach(w=>el._tl.to(w,{duration:.25,scrambleText:{text:chars.slice(0,Math.max(1,Math.min(w.textContent.length,chars.length))),chars,speed:1},opacity:0,ease:'none'},0));}
  window.Escrita={grande:(el,t,op)=>{if(op?.cor)el.style.color=op.cor;return escrever(el,t,.85);},pequeno:(el,t)=>escrever(el,t,.55),decodificar:escrever,zerar:limpar,sair,reduzido:reduced()};
})();
