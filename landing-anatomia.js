'use strict';
/**
 * JARVÃO · landing — anatomia do núcleo (técnica F): linhas-guia da peça explodida até a leitura real.
 *
 * Overlay em canvas 2D (sobre a cena 3D), 1px em --linha, sem caixa. Lê a posição de tela de
 * cada parte explodida (mapa.partesExplodidas()) e desenha uma linha curta até o ponto onde o
 * rótulo (HTML, fora deste canvas) deve ficar. O rótulo em si (JetBrains Mono + número em Saira)
 * é HTML comum, posicionado pela landing (landing-roteiro.js); este módulo só desenha as linhas.
 *
 * Sem build: carregado por <script> em index.html. Não inventa texto: cada chamada de desenhar()
 * recebe os pontos e o texto já prontos de quem a chama.
 */
(function () {
  function montar(canvas) {
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let largura = 0, altura = 0;

    function medir() {
      largura = innerWidth; altura = innerHeight;
      canvas.width = Math.round(largura * dpr); canvas.height = Math.round(altura * dpr);
      canvas.style.width = largura + 'px'; canvas.style.height = altura + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    addEventListener('resize', medir); medir();

    /** linhas: [{ de:{x,y} (0..1), ate:{x,y} (px), opacidade }] — x/y "de" vêm de partesExplodidas(); "ate" é onde o rótulo HTML está. */
    function desenhar(linhas) {
      ctx.clearRect(0, 0, largura, altura);
      ctx.strokeStyle = 'rgba(255,170,100,.65)'; ctx.lineWidth = 1;
      for (const l of linhas) {
        if (!l || l.de.atras) continue;
        const op = l.opacidade == null ? 1 : l.opacidade; if (op <= 0) continue;
        const x0 = l.de.x * largura, y0 = l.de.y * altura;
        ctx.globalAlpha = op;
        ctx.beginPath(); ctx.moveTo(x0, y0);
        const mx = x0 + (l.ate.x - x0) * .55;                        // cotovelo suave, no estilo "anatomia técnica"
        ctx.lineTo(mx, y0); ctx.lineTo(mx, l.ate.y); ctx.lineTo(l.ate.x, l.ate.y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,170,100,' + (op * .9).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(x0, y0, 2.4, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    return { desenhar, limpar: () => ctx.clearRect(0, 0, largura, altura) };
  }

  window.LandingAnatomia = { montar };
})();
