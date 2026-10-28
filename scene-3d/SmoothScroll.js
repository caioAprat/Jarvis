import Lenis from 'lenis';

/** Um único relógio GSAP; touch nativo, modais excluídos e sem RAF duplicado. */
export function createSmoothScroll(){
  const lenis=new Lenis({autoRaf:false,lerp:.11,smoothWheel:true,syncTouch:false,
    prevent:node=>!!node.closest('[role="dialog"],.modal,.busca-box,[data-lenis-prevent]')});
  const tick=seconds=>lenis.raf(seconds*1000);
  lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(tick);
  return {lenis,dispose(){gsap.ticker.remove(tick);lenis.destroy();}};
}
