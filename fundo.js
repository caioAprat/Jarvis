'use strict';
/**
 * JARVÃO · fundo que muda com a rolagem (R2/Monogrid) — sempre dentro da paleta quente.
 *
 * estado(x), x contínuo de 0 a 4 (a narrativa amarra ao progresso da rolagem, com scrub):
 *   0 escuro absoluto (abertura) · 1 chão aceso (fios do chão) · 2 protótipo (névoa leve, grade de chão)
 *   3 fios esticados (brilho maior, partículas rápidas) · 4 planeta (névoa densa, grão)
 * Camadas: névoa da cena (FogExp2 em #080706), véu de brilho laranja por cima do canvas (os mesmos gradientes do
 * body::before, que fica escondido atrás do canvas opaco), grade de chão sutil, grão (ruído SVG), e a densidade e a
 * velocidade das partículas do ambiente.
 */
(function () {
  //          névoa   véu   grade  grão  vel  partículas
  const EST = [
    [0,      .12,  0,    .025, .4,  .45],
    [.004,   .35,  .45,  .03,  .7,  .65],
    [.008,   .55,  .9,   .03,  1,   .85],
    [.006,   1,    .55,  .04,  1.9, 1.25],
    [.017,   .7,   0,    .075, 1.2, 1],
  ];
  const reduzido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const CSS = `
  .fundo-veu{position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0;
    background:radial-gradient(ellipse 80% 60% at 60% 0%,rgba(255,120,40,.09),transparent 70%),radial-gradient(ellipse 50% 40% at 0% 100%,rgba(255,90,30,.06),transparent 70%),radial-gradient(ellipse 70% 50% at 50% 50%,rgba(255,120,40,.05),transparent 70%)}
  .fundo-grao{position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
    background-size:160px 160px}`;

  function montar(mapa, op) {
    op = op || {};
    if (!document.getElementById('fundo-css')) { const s = document.createElement('style'); s.id = 'fundo-css'; s.textContent = CSS; document.head.appendChild(s); }
    const veu = document.createElement('div'); veu.className = 'fundo-veu'; veu.setAttribute('aria-hidden', 'true');
    const grao = document.createElement('div'); grao.className = 'fundo-grao'; grao.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veu); document.body.appendChild(grao);
    let cena = null, grade = null, E = 2.6;
    if (mapa && window.THREE) {
      const dep = mapa.depurar(); cena = dep.scene; E = dep.escala || 2.6;
      cena.fog = new THREE.FogExp2(0x080706, 0);
      const n = 34, tam = 36 * E, pts = [];
      for (let i = 0; i <= n; i++) { const k = -tam / 2 + i * tam / n; pts.push(-tam / 2, 0, k, tam / 2, 0, k, k, 0, -tam / 2, k, 0, tam / 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      grade = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0, depthWrite: false }));
      grade.position.y = (op.chao != null ? op.chao : -3.2 * E) - .02 * E; cena.add(grade);
    }
    const atual = { vel: 1, part: 1, x: 0 };
    function estado(x) {
      x = Math.max(0, Math.min(EST.length - 1, x)); atual.x = x;
      const i = Math.min(EST.length - 2, Math.floor(x)), u = x - i, A = EST[i], B = EST[i + 1], m = k => A[k] + (B[k] - A[k]) * u;
      if (cena && cena.fog) cena.fog.density = m(0);
      veu.style.opacity = m(1).toFixed(3);
      if (grade) { grade.material.opacity = m(2) * .07; grade.visible = m(2) > .01; }
      grao.style.opacity = m(3).toFixed(3);
      atual.vel = reduzido ? 0 : m(4); atual.part = m(5);
      if (op.particulas && op.particulas.intensidade) op.particulas.intensidade(atual.part);
    }
    function remover() { veu.remove(); grao.remove(); if (grade && cena) cena.remove(grade); if (cena) cena.fog = null; }
    estado(0);
    return { estado, velocidade: () => atual.vel, atual: () => atual.x, remover, ESTADOS: EST.length };
  }

  window.Fundo = { montar };
})();
