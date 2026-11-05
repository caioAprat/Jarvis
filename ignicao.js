'use strict';
/**
 * JARVÃO · ignição — faíscas da landing com three-nebula (motor de partículas) sobre a cena do mapa-vivo.
 *
 * Ignicao.criar(mapa, { E, pisoY }) -> { arranque(p, forca), explosao(p), conector(p), viva(sim), destruir() } | null
 *   arranque: chuvinha curta a cada "tropeço" do núcleo · explosao: a ignição (150–250 faíscas) · conector: faísca no painel que liga
 *   viva(true): faíscas raras perto do núcleo depois de ligado (parece vivo)
 * Faíscas: gravidade, quicam no piso (CrossZone bound), cor branco-quente → âmbar e somem devagar.
 * Sem build: carregado por <script> em pc.html, depois do three-nebula. Não guarda dados.
 */
(function () {
  const N = window.Nebula;
  function texturaFaisca() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.18, 'rgba(255,236,200,.95)'); r.addColorStop(.45, 'rgba(255,154,77,.35)'); r.addColorStop(1, 'rgba(255,138,61,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); return t;
  }

  function criar(mapa, op) {
    if (!N || !window.THREE || !mapa || !mapa.depurar || !mapa.aoQuadro) return null;
    const { scene, camera } = mapa.depurar();
    const E = op.E || 1, pisoY = op.pisoY != null ? op.pisoY : -3.2 * E;
    const sistema = new N.System();
    let renderer;
    try { renderer = new N.GPURenderer(scene, THREE, { camera, maxParticles: 2400, baseColor: 0xffffff, blending: 'AdditiveBlending', depthTest: true, depthWrite: false, transparent: true }); }
    catch (e) { return null; }
    sistema.addRenderer(renderer);
    const tex = texturaFaisca();
    // Caixa que segura as faíscas: o fundo é o piso (quicam), as laterais e o teto ficam longe.
    const caixa = new N.BoxZone(0, pisoY + 40 * E, 0, 160 * E, 80 * E, 160 * E);

    function emissor(o) {
      const em = new N.Emitter();
      em.setRate(new N.Rate(new N.Span(o.n[0], o.n[1]), new N.Span(o.intervalo || .05, (o.intervalo || .05) * 1.6)))
        .setInitializers([
          new N.Mass(1),
          new N.Life(o.vida[0], o.vida[1]),
          new N.Body(new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }))),
          new N.Radius(o.raio[0] * E, o.raio[1] * E),
          new N.Position(new N.SphereZone(0, 0, 0, (o.zona || .2) * E)),
          new N.RadialVelocity(new N.Span(o.vel[0] * E, o.vel[1] * E), new N.Vector3D(0, o.cima ? 1 : 0, 0), o.abertura || 180),
        ])
        .setBehaviours([
          new N.Alpha(1, 0, Infinity, N.easeInQuad),
          new N.Scale(1, .25, Infinity, N.easeInQuad),
          new N.Color('#fff4e0', '#ff7a2e', Infinity, N.easeOutCubic),
          new N.Gravity(o.gravidade != null ? o.gravidade * E : 9 * E),
          new N.CrossZone(caixa, 'bound'),
        ]);
      em.damping = o.atrito != null ? o.atrito : .012;
      sistema.addEmitter(em);
      return em;
    }
    const tipos = {
      arranque: { n: [22, 34], vida: [.45, 1.1], raio: [.12, .26], vel: [12, 28], gravidade: 7, abertura: 180 },
      explosao: { n: [150, 200], vida: [1.1, 2.6], raio: [.1, .28], vel: [22, 58], gravidade: 9, zona: .6, abertura: 180 },
      poeira: { n: [160, 220], vida: [1.8, 3.6], raio: [.03, .08], vel: [6, 22], gravidade: .6, zona: .8, abertura: 180, atrito: .035 },
      conector: { n: [18, 26], vida: [.4, 1], raio: [.1, .2], vel: [8, 20], gravidade: 8, abertura: 180 },
      viva: { n: [2, 5], vida: [.4, .9], raio: [.08, .16], vel: [5, 13], gravidade: 6, abertura: 180 },
    };
    const ativos = [];
    function disparar(tipo, p, vezes) {
      const em = emissor(tipos[tipo]);
      em.position.x = p.x; em.position.y = p.y; em.position.z = p.z;
      em.emit(vezes || 1, (tipos[tipo].vida[1] || 1) + .2);
      ativos.push(em);
      return em;
    }
    let viva = null, desliga = null;
    desliga = mapa.aoQuadro(d => {
      sistema.update(Math.min(d, 1 / 20));
      for (let i = ativos.length - 1; i >= 0; i--) { const em = ativos[i]; if (em.dead || (!em.isEmitting && !em.particles.length)) { sistema.removeEmitter(em); ativos.splice(i, 1); } }
    });
    const nucleo = () => (op.centro ? op.centro() : mapa.nucleoMundo(new THREE.Vector3()));
    return {
      arranque: (p, forca) => disparar('arranque', p || nucleo(), Math.max(1, Math.round(forca || 1))),
      explosao: (p) => { const c = p || nucleo(); disparar('explosao', c, 3); disparar('poeira', c, 2); },
      conector: (p) => disparar('conector', p, 1),
      viva(sim) {
        if (!sim) { if (viva) { viva.stopEmit(); viva = null; } return; }
        if (viva) return;
        viva = emissor(Object.assign({}, tipos.viva, { intervalo: 1.6 }));
        const c = nucleo(); viva.position.x = c.x; viva.position.y = c.y; viva.position.z = c.z;
        viva.emit();
      },
      _sistema: sistema,
      destruir() { if (desliga) desliga(); try { sistema.destroy(); } catch (e) {} tex.dispose(); },
    };
  }
  window.Ignicao = { criar };
})();
