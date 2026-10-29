'use strict';
/**
 * JARVÃO · landing — ponteiro (técnica D, substitui o rastro de versões anteriores).
 *
 * Sem canvas de cauda, sem elemento visível seguindo o cursor. O ponteiro (ou o dedo) só
 * empurra de leve as partículas do ambiente (landing-particulas.js) quando passa perto,
 * com retorno lento — nada que se pareça com rastro.
 *
 * Sem build: carregado por <script> em index.html.
 */
(function () {
  function montar(op) {
    const camera = op.camera, particulas = op.particulas, el = op.el || window;
    if (!camera || !particulas || !window.THREE) return null;
    const ray = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), mundo = new THREE.Vector3();
    let ativo = false;

    function mover(e) {
      const x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX);
      const y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY);
      if (x == null) return;
      const nx = (x / innerWidth) * 2 - 1, ny = -(y / innerHeight) * 2 + 1;
      ray.setFromCamera({ x: nx, y: ny }, camera);
      if (ray.ray.intersectPlane(plano, mundo)) { particulas.perto(mundo.x, mundo.z); ativo = true; }
    }
    function sair() { if (ativo) { particulas.longe(); ativo = false; } }

    addEventListener('pointermove', mover, { passive: true });
    addEventListener('pointerdown', mover, { passive: true });
    addEventListener('pointerleave', sair);
    document.addEventListener('visibilitychange', () => { if (document.hidden) sair(); });

    return { destruir: () => { removeEventListener('pointermove', mover); removeEventListener('pointerdown', mover); removeEventListener('pointerleave', sair); } };
  }

  window.LandingPonteiro = { montar };
})();
