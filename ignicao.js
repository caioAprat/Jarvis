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
    const tex = texturaFaisca(), materiais = [];
    mapa.depurar().renderer.initTexture(tex);
    // GPURenderer só cria o atlas ao receber a primeira partícula. Fazer isso
    // agora evita reconstruir/subir o atlas no disparo de 2,8 s.
    renderer.getTextureID(tex);
    renderer.textureAtlas.update();
    mapa.depurar().renderer.initTexture(renderer.textureAtlas.atlasTexture);
    if (renderer.textureAtlas.atlasIndex) mapa.depurar().renderer.initTexture(renderer.textureAtlas.atlasIndex);
    // Caixa que segura as faíscas: o fundo é o piso (quicam), as laterais e o teto ficam longe.
    const caixa = new N.BoxZone(0, pisoY + 40 * E, 0, 160 * E, 80 * E, 160 * E);

    function emissor(o, registrar = true) {
      const em = new N.Emitter();
      const material = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
      materiais.push(material);
      em.setRate(new N.Rate(new N.Span(o.n[0], o.n[1]), new N.Span(o.intervalo || .05, (o.intervalo || .05) * 1.6)))
        .setInitializers([
          new N.Mass(1),
          new N.Life(o.vida[0], o.vida[1]),
          new N.Body(new THREE.Sprite(material)),
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
      if (registrar) sistema.addEmitter(em);
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
    // As rajadas conhecidas ganham materiais e inicializadores durante a
    // saudação. O disparo só posiciona e ativa; não constrói SpriteMaterial.
    const prontos = {};
    for (const [tipo, quantidade, rajadas] of [['arranque', 2, 1], ['explosao', 2, 3], ['poeira', 2, 2], ['conector', 7, 1]]) {
      const config = tipos[tipo];
      prontos[tipo] = Array.from({ length: quantidade }, () => emissor(Object.assign({}, config, { n: config.n.map(n => n * rajadas) }), false));
    }
    // Exercita o caminho real de criação/mapeamento e devolve partículas e
    // alvos aos pools ANTES do primeiro render. Não há faísca visível aqui.
    const ensaio = new N.Emitter().setInitializers([new N.Life(.001), new N.Body(new THREE.Sprite(materiais[0]))]);
    sistema.addEmitter(ensaio);
    for (let i = 0; i < 2400; i++) ensaio.createParticle();
    const alvos = ensaio.particles.map(p => p.target);
    ensaio.removeAllParticles(); sistema.update(.02); sistema.removeEmitter(ensaio);
    alvos.forEach(alvo => { if (alvo) renderer.targetPool.expire(alvo); });
    function disparar(tipo, p, vezes) {
      const config = tipos[tipo], rajadas = Math.max(1, Math.round(vezes || 1));
      const esperado = tipo === 'explosao' ? 3 : tipo === 'poeira' ? 2 : 1;
      const em = rajadas === esperado && prontos[tipo] && prontos[tipo].shift();
      const pronto = em || emissor(Object.assign({}, config, { n: config.n.map(n => n * rajadas) }), false);
      sistema.addEmitter(pronto);
      pronto.position.x = p.x; pronto.position.y = p.y; pronto.position.z = p.z;
      // Nebula: emit(1) faz uma rajada; emit(3) emite continuamente por 3 segundos.
      pronto.emit(1);
      pronto.life = config.vida[1] + .2; // preserva a vida das particulas antes de descartar o emissor
      ativos.push(pronto);
      return pronto;
    }
    let viva = null, desliga = null, destruido = false;
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
      destruir() {
        if (destruido) return; destruido = true;
        if (desliga) desliga();
        try { sistema.destroy(); } catch (e) {}
        // System.destroy do Nebula pode já estar sem emissores; nesse caso
        // não percorre o renderer. Garanta também os buffers preparados.
        try { renderer.destroy(); } catch (e) {}
        renderer.geometry.dispose(); renderer.material.dispose(); renderer.targetPool.destroy();
        materiais.forEach(m => m.dispose()); tex.dispose();
      },
    };
  }
  // Linhas de campo em volta do núcleo (ref: loader do activetheory.net). r(θ) = L·sen²θ num plano vertical girado em φ.
  function campo(mapa, op) {
    if (!window.THREE || !mapa || !mapa.depurar || !mapa.aoQuadro) return null;
    const { scene } = mapa.depurar(), E = op.E || 1, g = new THREE.Group(); g.name = 'campo-nucleo'; scene.add(g);
    const mats = [], N = 18, PTS = 90;
    for (let i = 0; i < N; i++) {
      const phi = i / N * Math.PI * 2 + (i % 2) * .09, L = (1.9 + (i % 3) * .55 + Math.sin(i * 2.3) * .2) * E, pos = [], u = [];
      for (let j = 0; j <= PTS; j++) {
        const th = .16 * Math.PI + (.68 * Math.PI) * j / PTS, r = L * Math.pow(Math.sin(th), 2);
        const x = r * Math.sin(th), y = r * Math.cos(th);
        pos.push(Math.cos(phi) * x, y, Math.sin(phi) * x); u.push(j / PTS);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aU', new THREE.Float32BufferAttribute(u, 1));
      const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uP: { value: 0 }, uT: { value: 0 }, uFase: { value: i * .37 }, uA: { value: .5 + .3 * (i % 2) } },
        vertexShader: 'attribute float aU;varying float vU;void main(){vU=aU;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'uniform float uP,uT,uFase,uA;varying float vU;void main(){float m=abs(vU-.5)*2.;float desenho=step(m,uP);float pulso=.35+.65*smoothstep(.12,0.,abs(fract(vU-uT*.25-uFase)-.5)-.38);float borda=smoothstep(0.,.08,1.-m);gl_FragColor=vec4(1.,.62,.3,uA*desenho*borda*pulso*(.25+.75*uP));}' });
      mats.push(mat); g.add(new THREE.Line(geo, mat));
    }
    let p = 0, t = 0;
    const tirar = mapa.aoQuadro(d => { t += d; g.rotation.y += d * .06 * (.2 + p); mats.forEach(m => { m.uniforms.uT.value = t; m.uniforms.uP.value = p; }); g.visible = p > .001; });
    return { progresso(v) { p = Math.max(0, Math.min(1, v)); }, destruir() { tirar(); scene.remove(g); g.children.forEach(l => { l.geometry.dispose(); l.material.dispose(); }); } };
  }
  window.Ignicao = { criar, campo };
})();
