'use strict';
/** Letras com espaço reservado. A cena 3D e a sua linha do tempo não dependem deste módulo. */
(function () {
  const movimento = matchMedia('(prefers-reduced-motion: reduce)');
  const animando = new Set();
  const GLIFOS = '01/\\|<>[]{}=+-_#ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (window.gsap && window.ScrambleTextPlugin && window.SplitText) gsap.registerPlugin(ScrambleTextPlugin, SplitText);
  const css = document.createElement('style');
  css.textContent = `
    .esc-reserva{visibility:hidden;white-space:inherit}
    .esc-superficie{position:relative;display:block}
    .esc-vis{position:absolute;inset:0;white-space:inherit;opacity:.85}
    .esc-vis .esc-char{display:inline-block;text-align:center;overflow:visible}
    .narr-texto-camada{pointer-events:none!important;transform:none!important;filter:none!important;will-change:opacity!important}
    .narr-texto-camada .mom-tela,.narr-texto-camada form,.narr-texto-camada button{visibility:hidden!important;pointer-events:none!important}
  `;
  document.head.appendChild(css);

  // Uma única superfície por texto; sem cópia da cena ou do formulário.
  function superficie(el) {
    return el;
  }

  function cancelar(el) {
    animando.delete(el);
    el._geracao = (el._geracao || 0) + 1;
    if (el._tl) { el._tl.kill(); el._tl = null; }
    if (el._resolver) { el._resolver(false); el._resolver = null; }
    if (el._split) { el._split.revert(); el._split = null; }
  }
  function montar(el, texto) {
    el.textContent = '';
    const bloco = document.createElement('span'); bloco.className = 'esc-superficie';
    const reserva = document.createElement('span'); reserva.className = 'esc-reserva'; reserva.textContent = texto; reserva.setAttribute('aria-hidden', 'true');
    const vis = document.createElement('span'); vis.className = 'esc-vis'; vis.textContent = texto; vis.setAttribute('aria-hidden', 'true'); vis.style.opacity = '0';
    const final=document.createElement('span');final.className='sr';final.textContent=texto;
    bloco.append(reserva, vis); el.append(final,bloco); el.removeAttribute('aria-label');
    return vis;
  }
  function preparar(el, texto) {
    if (!el) return;
    texto = String(texto == null ? '' : texto);
    if (el._texto === texto && el.querySelector('.esc-reserva')) return;
    cancelar(el); el._texto = texto; montar(el, texto);
    if (el._superficie) montar(el._superficie, texto);
  }
  async function escrever(el, texto, op) {
    op = op || {}; preparar(el, texto); cancelar(el);
    const geracao = el._geracao, alvo = superficie(el);
    alvo.style.color = op.cor || '';
    const vis = alvo.querySelector('.esc-vis');
    if (!vis) return false;
    vis.textContent = el._texto; vis.style.opacity = '0';vis.style.transform='';
    if (movimento.matches || !window.gsap || !window.SplitText || !window.ScrambleTextPlugin) { if(window.gsap)gsap.to(vis,{opacity:1,duration:.2});else vis.style.opacity='1';el.dataset.escrito='1';return true; }
    // Medir somente depois da fonte chegar evita larguras erradas e saltos de linha.
    if (document.fonts) { try { await document.fonts.load(getComputedStyle(alvo).font, el._texto); } catch (e) {} }
    if (geracao !== el._geracao || !el.isConnected) return false;
    vis.style.opacity = '1';
    if(el.classList.contains('mom-g')){
      el.style.overflow='hidden';
      return new Promise(resolve=>{
        el._resolver=resolve;animando.add(el);
        el._tl=gsap.fromTo(vis,{yPercent:110},{yPercent:0,duration:.6,ease:suave,onComplete:()=>{animando.delete(el);el._resolver=null;resolve(true);}});
      });
    }
    // ScrambleText revela da esquerda para a direita sem dividir/medir cada letra.
    return new Promise(resolve=>{
      el._resolver=resolve;animando.add(el);
      const duracao=Math.max(.8,el._texto.length*.03);
      el._tl=gsap.to(vis,{duration:duracao,scrambleText:{text:el._texto,chars:GLIFOS,speed:.6,tweenLength:false},ease:'none',onComplete:()=>{animando.delete(el);el.dataset.escrito='1';el._resolver=null;resolve(true);}});
    });
  }
  function suave(x){let lo=0,hi=1,t=x;for(let i=0;i<14;i++){t=(lo+hi)/2;const bx=.6*t*(1-t)*(1-t)+t*t*t;if(bx<x)lo=t;else hi=t;}return x<=0?0:x>=1?1:t*t*(3-2*t);}

  function sair(el) {
    if (!el || !el._texto || el.dataset.saindo === '1') return;
    cancelar(el); el.dataset.saindo = '1';
    const alvo = el._superficie || el, vis = alvo.querySelector('.esc-vis');
    if (!vis) return;
    if (movimento.matches || !window.gsap) { vis.style.opacity = '0'; return; }
    if (!window.SplitText || !window.ScrambleTextPlugin) { vis.style.opacity = '0'; return; }
    const split = el._split = new SplitText(vis, { type: 'words,chars', charsClass: 'esc-char', aria: 'none' });
    const larguras = split.chars.map(ch => ch.getBoundingClientRect().width);
    split.chars.forEach((ch,i) => { ch.style.width = larguras[i] + 'px'; ch.style.letterSpacing = '0'; });
    animando.add(el);
    el._tl = gsap.timeline({ onComplete: () => animando.delete(el) })
      .to(vis, { opacity: 0, duration: .25, ease: 'none' }, 0);
    split.chars.forEach(ch => el._tl.to(ch, { duration: .25,
      scrambleText: { text: GLIFOS[Math.floor(Math.random() * GLIFOS.length)], chars: GLIFOS, speed: 1 }, ease: 'none' }, 0));
  }

  function zerar(el) {
    cancelar(el); el.dataset.escrito = ''; el.dataset.saindo = '';
    const vis = (el._superficie || el).querySelector('.esc-vis');
    if (vis) { vis.textContent = el._texto || ''; vis.style.opacity = '0'; }
  }
  function grande(el, texto, op) { el.dataset.saindo = ''; return escrever(el, texto, op); }
  function pequeno(el, texto) { el.dataset.saindo = ''; return escrever(el, texto); }
  function liberar(cena) {
    if (cena._textoObservador) cena._textoObservador.disconnect();
    if (cena._textoCamada) cena._textoCamada.remove();
    cena.querySelectorAll('.mom-g,.mom-p').forEach(zerar);
    cena._textoCamada = null;
  }
  movimento.addEventListener('change', () => {
    if (!movimento.matches) return;
    [...animando].forEach(el => {
      cancelar(el);
      const vis = (el._superficie || el).querySelector('.esc-vis');
      if (vis) { vis.style.transform='';vis.textContent = el._texto || ''; vis.style.opacity = el.dataset.saindo === '1' ? '0' : '.85'; }
    });
  });
  window.Escrita = { grande, pequeno, decodificar: pequeno, preparar, sair, zerar, liberar, get reduzido() { return movimento.matches; } };
})();
