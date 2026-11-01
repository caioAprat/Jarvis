'use strict';
(function () {
  let smooth = null, tick = null;
  function iniciar() {
    if (smooth || !window.Lenis || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    smooth = new Lenis({ autoRaf: false, lerp: .09, smoothWheel: true, syncTouch: false,
      prevent: el => !!el.closest('input,textarea,select,.pal,.painel-sel') });
    smooth.on('scroll', () => window.ScrollTrigger && ScrollTrigger.update());
    tick = t => { if (!document.hidden) smooth.raf(t * 1000); };
    gsap.ticker.add(tick);
  }
  function parar() { if (tick) gsap.ticker.remove(tick); if (smooth) smooth.destroy(); smooth = tick = null; }
  window.LandingScroll = { iniciar, parar, ir: y => smooth ? smooth.scrollTo(y) : window.scrollTo(0,y) };
  addEventListener('pagehide', parar);
})();
