'use strict';
/**
 * JARVÃO · landing — ambiente vivo (técnica A).
 *
 * THREE.Points em duas camadas de profundidade (parallax), tons já usados no núcleo
 * (0xffc890, 0xffd9a0, 0xffe0b0, 0xff8a3d), sempre em movimento mesmo com o scroll parado.
 * O ponteiro/toque não deixa rastro: só empurra de leve as partículas perto dele (técnica D,
 * ver landing-ponteiro.js). Reaproveita a cena do mapa-vivo (mesma câmera/scene), então os
 * tons e a profundidade batem com o núcleo e os planetas.
 *
 * Sem build: carregado por <script> em index.html. Não guarda dados nem chaves.
 */
(function () {
  const CORES = [0xffc890, 0xffd9a0, 0xffe0b0, 0xff8a3d];

  const VERT = [
    'attribute float aTam; attribute float aFase; attribute vec3 aCor; attribute float aCamada;',
    'uniform float uTime; varying vec3 vCor; varying float vCamada;',
    'void main() {',
    '  vCor = aCor; vCamada = aCamada;',
    '  vec3 p = position;',
    '  p.x += sin(uTime * .06 + aFase) * (1.6 + aCamada * 1.2);',
    '  p.y += cos(uTime * .05 + aFase * 1.3) * (1.1 + aCamada * .9);',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  gl_PointSize = min(aTam * (260.0 / -mv.z), 14.0);',          // perto da câmera não vira mancha
    '  gl_Position = projectionMatrix * mv;',
    '}',
  ].join('\n');
  const FRAG = [
    'varying vec3 vCor; varying float vCamada; uniform sampler2D uMapa; uniform float uInt;',
    'void main() {',
    '  vec4 t = texture2D(uMapa, gl_PointCoord);',
    '  float op = t.a * (vCamada < .5 ? .9 : .4);',    // camada 0 = principal/secundária; 1 = fundo, mais fraca
    '  gl_FragColor = vec4(vCor, op * uInt);',
    '}',
  ].join('\n');

  function texturaPonto() {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
  }

  /** Monta a nuvem de partículas dentro da cena do mapa-vivo (reaproveita THREE já carregado). */
  function montar(cena, op) {
    op = op || {};
    if (!cena || !window.THREE) return null;
    const leve = !!op.leve, n = leve ? 90 : 220;
    const pos = new Float32Array(n * 3), tam = new Float32Array(n), fase = new Float32Array(n), cor = new Float32Array(n * 3), camada = new Float32Array(n);
    const alcance = 26;
    for (let i = 0; i < n; i++) {
      const c2 = Math.random() < .55 ? 0 : 1;     // 55% perto (principal/secundária), 45% longe (fundo)
      const r = c2 === 0 ? 4 + Math.random() * 10 : 12 + Math.random() * alcance;
      const ang = Math.random() * 6.2832, alt = (Math.random() - .5) * (c2 === 0 ? 7 : 14);
      pos[i * 3] = Math.cos(ang) * r; pos[i * 3 + 1] = alt; pos[i * 3 + 2] = Math.sin(ang) * r;
      tam[i] = (c2 === 0 ? 1.6 : 2.6) * (.6 + Math.random() * .8);
      fase[i] = Math.random() * 6.2832; camada[i] = c2;
      const c = new THREE.Color(CORES[(Math.random() * CORES.length) | 0]);
      cor[i * 3] = c.r; cor[i * 3 + 1] = c.g; cor[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
    geo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
    geo.setAttribute('aCor', new THREE.BufferAttribute(cor, 3));
    geo.setAttribute('aCamada', new THREE.BufferAttribute(camada, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMapa: { value: texturaPonto() }, uInt: { value: 1 } }, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pontos = new THREE.Points(geo, mat);
    cena.add(pontos);

    // o ponteiro empurra de leve as partículas perto dele (sem rastro) — técnica D
    const base = pos.slice(), empurro = new Float32Array(n * 3), alvo = { x: 999, y: 0, z: 999 }, dentro = { v: false };
    function perto(px, pz) { alvo.x = px; alvo.z = pz; dentro.v = true; }
    function longe() { dentro.v = false; }

    function quadro(t, d) {
      mat.uniforms.uTime.value = t;
      if (dentro.v) {
        for (let i = 0; i < n; i++) {
          const dx = base[i * 3] + empurro[i * 3] - alvo.x, dz = base[i * 3 + 2] + empurro[i * 3 + 2] - alvo.z, dd = Math.hypot(dx, dz);
          if (dd < 3.2 && dd > .001) { const f = (1 - dd / 3.2) * .5 * d; empurro[i * 3] += (dx / dd) * f; empurro[i * 3 + 2] += (dz / dd) * f; }
        }
      }
      let mexeu = false;
      for (let i = 0; i < n * 3; i++) { if (Math.abs(empurro[i]) > 1e-4) mexeu = true; empurro[i] *= Math.pow(.06, d); pos[i] = base[i] + empurro[i]; }
      if (mexeu) geo.attributes.position.needsUpdate = true;
    }
    return { pontos, quadro, perto, longe, intensidade: (v) => { mat.uniforms.uInt.value = v; }, destruir: () => { cena.remove(pontos); geo.dispose(); mat.dispose(); } };
  }

  window.LandingParticulas = { montar };
})();
