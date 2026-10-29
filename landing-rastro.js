'use strict';
/**
 * JARVÃO · landing — rastro do ponteiro.
 *
 * Cauda laranja em canvas 2D com mistura aditiva, que se dissipa em 700 ms (sumida total ≤ 800 ms).
 * Usa pointermove/pointerdown: segue o mouse no PC e o dedo no celular, sem depender de hover.
 * Em repouso não desenha nada. Nunca é montado com prefers-reduced-motion.
 *
 * Cores: só os tokens do Jarvão — #ff9a4d (--pri) na cabeça, #ff5a1f (laranja do núcleo) na cauda.
 */
(function () {
  const VIDA = 700;                     // ms de vida de cada ponto
  const MAX = 48;                       // pontos guardados

  function montar(canvas) {
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return null;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let largura = 0, altura = 0, rodando = false;
    const fila = [];

    function medir() {
      largura = innerWidth; altura = innerHeight;
      canvas.width = Math.round(largura * dpr); canvas.height = Math.round(altura * dpr);
      canvas.style.width = largura + 'px'; canvas.style.height = altura + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function ponto(e) {
      const agora = performance.now(), u = fila[fila.length - 1];
      if (u && Math.hypot(e.clientX - u.x, e.clientY - u.y) < 2 && agora - u.t < 30) return;
      fila.push({ x: e.clientX, y: e.clientY, t: agora });
      if (fila.length > MAX) fila.shift();
      acordar();
    }

    function desenhar() {
      const agora = performance.now();
      while (fila.length && agora - fila[0].t > VIDA) fila.shift();
      ctx.clearRect(0, 0, largura, altura);
      if (fila.length > 1) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 1; i < fila.length; i++) {
          const a = fila[i - 1], b = fila[i];
          const vida = 1 - (agora - b.t) / VIDA;                  // 1 = novo, 0 = dissipado
          if (vida <= 0) continue;
          const q = Math.pow(vida, 1.7);
          ctx.strokeStyle = 'rgba(' + Math.round(255) + ',' + Math.round(154 - 64 * (1 - q)) + ',' + Math.round(77 - 46 * (1 - q)) + ',' + (q * .5).toFixed(3) + ')';
          ctx.lineWidth = .8 + q * 4.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        const c = fila[fila.length - 1];                          // cabeça: brilho suave
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 26);
        g.addColorStop(0, 'rgba(255,154,77,.30)'); g.addColorStop(1, 'rgba(255,90,31,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, 26, 0, 6.2832); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      if (!fila.length) { rodando = false; return; }
      requestAnimationFrame(desenhar);
    }
    function acordar() { if (rodando) return; rodando = true; requestAnimationFrame(desenhar); }

    addEventListener('resize', medir);
    addEventListener('pointermove', ponto, { passive: true });
    addEventListener('pointerdown', ponto, { passive: true });
    medir();
    return { canvas, limpar: () => { fila.length = 0; ctx.clearRect(0, 0, largura, altura); } };
  }

  window.LandingRastro = { montar, VIDA };
})();
