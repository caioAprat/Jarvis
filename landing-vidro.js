'use strict';
/**
 * JARVÃO · landing — caixa de vidro interativa.
 *
 * Cena Three própria, pequena e sem pós-processamento, dentro da caixa de vidro do hero.
 * 10 peças do vocabulário do núcleo: 4 poliedros em wireframe âmbar/creme e 6 esferas de projeto
 * (cor de status só nessas, porque representam status real da lista que recebe).
 * O ponteiro (ou o dedo) empurra e gira as peças com inércia; a mola as devolve ao lugar em ≤ 1,2 s.
 *
 * Sem build: carregado por <script> em landing.html. Não guarda dados nem chaves.
 */
(function () {
  const COR = { ok: 0x7bf0b4, atencao: 0xffc247, erro: 0xff4d5e, pausado: 0x7a6e60, config: 0x9a8c7a, aguardando: 0xc4a06a };
  const AMBAR = 0xff8a3d, QUENTE = 0xffe0b8;

  function montar(caixa, op) {
    op = op || {};
    if (!caixa || !window.THREE) return null;
    const estreito = innerWidth < 700;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !estreito, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, estreito ? 1.25 : 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    caixa.appendChild(renderer.domElement);

    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 60);
    camera.position.set(0, 0, 11);

    const pecas = [];
    const geoms = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TetrahedronGeometry(1, 0),
    ];
    const poli = estreito ? 3 : 4, esferas = estreito ? 4 : 6;     // 390 px: 7 peças; 1366 px: 10

    function por(malha, x, y, z, raio) {
      malha.position.set(x, y, z);
      pecas.push({ m: malha, bx: x, casa: new THREE.Vector3(x, y, z), v: new THREE.Vector3(),
        gv: new THREE.Vector3((Math.random() - .5) * .3, (Math.random() - .5) * .3, 0), raio });
      cena.add(malha);
    }
    /** A caixa é bem mais larga que alta: espalha as peças na horizontal conforme a proporção. */
    function espalhar() {
      const f = Math.max(1, Math.min(3.4, camera.aspect / 1.7));
      for (const q of pecas) { q.casa.x = q.bx * f; q.m.position.x = q.casa.x; }
    }

    for (let i = 0; i < poli; i++) {
      const g = geoms[i % geoms.length], c = i % 2 ? QUENTE : AMBAR;
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: i % 2 ? .5 : .72 }));
      const esc = .9 + (i % 3) * .3; m.scale.setScalar(esc);
      por(m, -3.4 + i * 2.3, (i % 2 ? .9 : -1), (i % 3 - 1) * 1.2, esc * 1.1);
    }
    const lista = (op.projetos || []).slice(0, esferas);
    for (let i = 0; i < esferas; i++) {
      const p = lista[i], cor = new THREE.Color(COR[(p && p.status) || 'aguardando'] || COR.aguardando);
      const g = new THREE.Group();
      const malha = new THREE.Mesh(new THREE.OctahedronGeometry(.34), new THREE.MeshBasicMaterial({ color: cor, wireframe: true }));
      const miolo = new THREE.Mesh(new THREE.OctahedronGeometry(.17), new THREE.MeshBasicMaterial({ color: cor }));
      g.add(malha); g.add(miolo);
      por(g, -3.9 + i * 1.55, i % 2 ? -1.9 : 1.9, (i % 2 ? .6 : -.6), .55);
    }

    // ------------------------------------------------------------ ponteiro (mouse e dedo)
    const ptr = { x: 999, y: 999, dentro: false };
    const ray = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), mundo = new THREE.Vector3();
    function mover(e) {
      const r = caixa.getBoundingClientRect(); if (!r.width) return;
      const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
      ptr.dentro = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;
      if (!ptr.dentro) return;
      ray.setFromCamera({ x: nx * 2 - 1, y: -(ny * 2 - 1) }, camera);
      if (ray.ray.intersectPlane(plano, mundo)) { ptr.x = mundo.x; ptr.y = mundo.y; }
      acordar();
    }
    const sair = () => { ptr.dentro = false; ptr.x = ptr.y = 999; acordar(); };
    if (!op.reduzido) {
      caixa.addEventListener('pointermove', mover, { passive: true });
      caixa.addEventListener('pointerdown', mover, { passive: true });
      caixa.addEventListener('pointerleave', sair);
      caixa.addEventListener('pointercancel', sair);
    }

    // ------------------------------------------------------------ quadro a quadro
    const tmp = new THREE.Vector3();
    let largura = 0, altura = 0, ultimo = 0, rodando = false, visivel = true;
    function medir() {
      const r = caixa.getBoundingClientRect(); if (r.width < 10 || r.height < 10) { largura = 0; return; }
      largura = r.width; altura = r.height; renderer.setSize(largura, altura, false);
      camera.aspect = largura / altura; camera.updateProjectionMatrix();
      espalhar();
      if (op.reduzido) desenhar(0);
    }
    function desenhar(d) {
      let movendo = false;
      for (const q of pecas) {
        if (!op.reduzido) {
          // repulsão limitada do ponteiro (1/r², com teto) + mola de volta à casa + amortecimento
          tmp.set(q.m.position.x - ptr.x, q.m.position.y - ptr.y, 0);
          const dd = Math.max(.45, tmp.length());
          if (ptr.dentro && dd < 4.2) { tmp.multiplyScalar(Math.min(26, 3.2 / (dd * dd)) * d / dd); q.v.add(tmp); q.gv.x += tmp.y * .9; q.gv.y -= tmp.x * .9; }
          tmp.copy(q.casa).sub(q.m.position).multiplyScalar(26 * d); q.v.add(tmp);      // mola
          q.v.multiplyScalar(Math.pow(.12, d));                                         // amortecimento (~1,1 s para assentar)
          q.m.position.addScaledVector(q.v, d);
          q.gv.multiplyScalar(Math.pow(.3, d));
          q.m.rotation.x += (q.gv.x + .16) * d; q.m.rotation.y += (q.gv.y + .22) * d;
          if (q.v.lengthSq() > 1e-4 || Math.abs(q.gv.x) + Math.abs(q.gv.y) > .01) movendo = true;
        } else { q.m.rotation.x = .4; q.m.rotation.y = .7; }
      }
      renderer.render(cena, camera);
      return movendo || (ptr.dentro && !op.reduzido);
    }
    function quadro() {
      const agora = performance.now(), d = Math.min(.05, (agora - ultimo) / 1000); ultimo = agora;
      if (!largura || !caixa.isConnected) { rodando = false; return; }
      desenhar(d);
      if (!visivel || document.hidden) { rodando = false; return; }   // fora da tela não gasta nada
      requestAnimationFrame(quadro);
    }
    function acordar() { if (op.reduzido || rodando || !visivel) return; rodando = true; ultimo = performance.now(); requestAnimationFrame(quadro); }

    const ro = new ResizeObserver(medir); ro.observe(caixa);
    const io = new IntersectionObserver(es => { visivel = es[0].isIntersecting; if (visivel) acordar(); }); io.observe(caixa);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) acordar(); });
    medir(); if (!op.reduzido) acordar(); else desenhar(0);

    return { el: renderer.domElement, acordar, pecas: pecas.length,
      destruir: () => { ro.disconnect(); io.disconnect(); renderer.dispose(); renderer.domElement.remove(); } };
  }

  window.LandingVidro = { montar };
})();
