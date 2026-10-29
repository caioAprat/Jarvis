'use strict';
/**
 * Landing v2 · objetos 3D da Seção 1, montados sobre a cena do mapa-vivo.js (modo cinema).
 *  ambiente()   partículas quentes em 3 camadas, giram com o núcleo, repulsão sutil do ponteiro
 *  construcao() blocos hexagonais em degraus que se montam um a um
 *  pele()       malha hexagonal em degraus na casca do núcleo, com o logo escondido por baixo
 *  pacotes()    documentos em traço viajando nas ligações núcleo ↔ projeto (nos dois sentidos)
 *  riscos()     riscos de velocidade presos à câmera
 *  regua()      marcações de grau na órbita mais externa
 */
(function () {
  const AMBAR = 0xff8a3d;
  const adt = () => ({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

  // ---------------------------------------------------------------- A. ambiente vivo
  const VERT_AMB = `
    attribute vec4 aSeed; attribute vec3 color;
    uniform float uTime, uPix, uK, uMax; uniform vec2 uPtr, uRes; uniform float uPtrF, uRaio, uDesl;
    varying vec3 vC; varying float vA;
    void main(){
      vec3 p = position + vec3(sin(uTime * aSeed.z + aSeed.y), cos(uTime * aSeed.z * .8 + aSeed.y * 1.7), sin(uTime * aSeed.z * .6 + aSeed.y * 2.3)) * aSeed.w;
      vec4 mv = modelViewMatrix * vec4(p, 1.); vec4 cp = projectionMatrix * mv;
      if (cp.w > 0.) {
        vec2 ndc = cp.xy / cp.w, px = (ndc - uPtr) * uRes * .5; float d = length(px);
        float k = uPtrF * (1. - smoothstep(0., uRaio, d));
        ndc += px / (d + .001) * k * uDesl / (uRes * .5); cp.xy = ndc * cp.w;
      }
      gl_Position = cp;
      gl_PointSize = min(uMax * uPix, aSeed.x * uPix * (uK / max(.5, -mv.z)));
      vA = .3 + .7 * pow(.5 + .5 * sin(uTime * (.6 + aSeed.z) + aSeed.y * 20.), 2.); vC = color;
    }`;
  const FRAG_AMB = `uniform float uOpac; varying vec3 vC; varying float vA;
    void main(){ float d = length(gl_PointCoord - .5); float s = smoothstep(.5, 0., d); gl_FragColor = vec4(vC, s * s * vA * uOpac); }`;

  function ambiente(cine, R0, baixo) {
    const CORES = [0xffc890, 0xffd9a0, 0xffe0b0, 0xff8a3d].map(c => new THREE.Color(c));
    // camada: [quantidade (PC, celular), raio mín, raio máx (× R0), constante de tamanho, deriva]
    const CAMADAS = [[[900, 300], 2.2, 5, 170, .9], [[900, 250], .9, 2.2, 95, .6], [[600, 150], .32, .9, 48, .35]];
    const ptr = { x: 9, y: 9, ax: 9, ay: 9, f: 0, alvo: 0 };
    const uni = { uTime: { value: 0 }, uPix: { value: Math.min(devicePixelRatio || 1, 1.5) }, uPtr: { value: new THREE.Vector2(9, 9) }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
      uPtrF: { value: 0 }, uRaio: { value: 90 }, uDesl: { value: 6 } };
    const grupo = new THREE.Group(), camadas = [];
    CAMADAS.forEach(([qtd, r0, r1, k, der]) => {
      const n = qtd[baixo ? 1 : 0], pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), seed = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        const r = (r0 + Math.random() * (r1 - r0)) * R0, a = Math.random() * 6.2832, e = Math.asin(Math.random() * 2 - 1) * .8;
        pos[i * 3] = r * Math.cos(e) * Math.cos(a); pos[i * 3 + 1] = r * Math.sin(e); pos[i * 3 + 2] = r * Math.cos(e) * Math.sin(a);
        const c = CORES[(Math.random() * CORES.length) | 0]; cor[i * 3] = c.r; cor[i * 3 + 1] = c.g; cor[i * 3 + 2] = c.b;
        seed[i * 4] = .6 + Math.pow(Math.random(), 2.2) * 2.6; seed[i * 4 + 1] = Math.random() * 6.2832; seed[i * 4 + 2] = .05 + Math.random() * .2; seed[i * 4 + 3] = der * R0 * .04 * (.4 + Math.random());
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cor, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
      const m = new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_AMB, fragmentShader: FRAG_AMB,
        uniforms: Object.assign({ uK: { value: k }, uMax: { value: 14 }, uOpac: { value: 1 } }, uni) }, adt()));
      const pts = new THREE.Points(g, m); pts.frustumCulled = false;
      const camada = new THREE.Group(); camada.add(pts); grupo.add(camada); camadas.push({ camada, pts, m, n });
    });
    cine.cena.add(grupo);
    const mover = (x, y) => { ptr.x = x / innerWidth * 2 - 1; ptr.y = -(y / innerHeight) * 2 + 1; if (ptr.ax > 5) { ptr.ax = ptr.x; ptr.ay = ptr.y; } ptr.alvo = 1; };
    addEventListener('pointermove', e => mover(e.clientX, e.clientY), { passive: true });
    addEventListener('touchstart', e => { const t = e.touches[0]; if (t) mover(t.clientX, t.clientY); }, { passive: true });
    addEventListener('touchmove', e => { const t = e.touches[0]; if (t) mover(t.clientX, t.clientY); }, { passive: true });
    addEventListener('resize', () => uni.uRes.value.set(innerWidth, innerHeight));
    let metade = false;
    // PARALLAX: velocidade de giro e de subida de cada camada em relação à rolagem (longe, meio, perto)
    const PARALLAX = { giro: [.15, .4, .8], subida: [.05, .15, .3] };
    return {
      PARALLAX, ptr, uni,
      quadro(dt, giro, p, congela, nivel) {
        uni.uTime.value += dt * (1 - congela);
        // o ponteiro: posição segue com atraso, força sobe rápido e volta devagar (~1,2 s)
        ptr.ax += (ptr.x - ptr.ax) * Math.min(1, dt * 6); ptr.ay += (ptr.y - ptr.ay) * Math.min(1, dt * 6);
        ptr.f += (ptr.alvo - ptr.f) * Math.min(1, dt * (ptr.alvo > ptr.f ? 5 : 2.5)); ptr.alvo *= Math.exp(-dt * 2.2);
        uni.uPtr.value.set(ptr.ax, ptr.ay); uni.uPtrF.value = ptr.f;
        camadas.forEach((c, i) => { c.camada.rotation.y = giro + p * PARALLAX.giro[i] * 3; c.camada.position.y = p * PARALLAX.subida[i] * R0; });
        if (nivel >= 3 && !metade) { metade = true; camadas.forEach(c => c.pts.geometry.setDrawRange(0, Math.floor(c.n / 2))); }
      },
      estatico() { uni.uPtrF.value = 0; },
    };
  }

  // ---------------------------------------------------------------- construção: prismas hexagonais em degraus
  function construcao(cine, U, baixo) {
    const RAIO = baixo ? 4 : 6, LADO = 2.5 * U, Y0 = -9 * U, cel = [];
    for (let q = -RAIO; q <= RAIO; q++) for (let r = Math.max(-RAIO, -q - RAIO); r <= Math.min(RAIO, -q + RAIO); r++) {
      const anel = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
      const x = LADO * Math.sqrt(3) * (q + r / 2), z = LADO * 1.5 * r;
      cel.push({ x, z, anel, ang: Math.atan2(z, x), alt: (.5 + anel * .7 + ((q * 7 + r * 13) & 3) * .25) * U });
    }
    cel.sort((a, b) => a.anel - b.anel || a.ang - b.ang);
    const seg = [], rc = LADO * .9;
    cel.forEach(c => {
      const pts = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; pts.push([c.x + Math.cos(a) * rc, c.z + Math.sin(a) * rc]); }
      for (let k = 0; k < 6; k++) {
        const [x0, z0] = pts[k], [x1, z1] = pts[(k + 1) % 6];
        seg.push(x0, Y0, z0, x1, Y0, z1, x0, Y0 + c.alt, z0, x1, Y0 + c.alt, z1, x0, Y0, z0, x0, Y0 + c.alt, z0);
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    const m = new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: 0 }, adt()));
    const ls = new THREE.LineSegments(g, m); ls.frustumCulled = false; ls.visible = false; cine.cena.add(ls);
    const POR = 36, N = cel.length;
    return {
      N,
      aplicar(prog, opac) {
        ls.visible = opac > .005 && prog > 0;
        g.setDrawRange(0, Math.round(Math.min(1, prog) * N) * POR);
        m.opacity = .3 * opac;
      },
    };
  }

  // ---------------------------------------------------------------- B. pele hexagonal com o logo escondido
  const VERT_PELE = 'varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }';
  const FRAG_PELE = `
    uniform sampler2D uLogo; uniform float uOpac, uTime; varying vec2 vUv; varying vec3 vN, vV;
    float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float hd(vec2 p){ p = abs(p); return max(dot(p, vec2(.5, .8660254)), p.x); }
    void main(){
      vec2 uv = vec2(vUv.x * 56., vUv.y * 28. * 1.1547);
      vec2 r = vec2(1., 1.7320508), hh = r * .5, a = mod(uv, r) - hh, b = mod(uv - hh, r) - hh;
      vec2 gv = dot(a, a) < dot(b, b) ? a : b, id = uv - gv;
      float borda = smoothstep(.34, .46, hd(gv));
      float degrau = floor(h21(id) * 4.) / 3.;
      vec2 lu = vec2((vUv.x - .15) / .2, (vUv.y - .3) / .4);
      float logo = (lu.x > 0. && lu.x < 1. && lu.y > 0. && lu.y < 1.) ? texture2D(uLogo, lu).a : 0.;
      float pulso = .5 + .5 * sin(uTime * 1.4 - degrau * 4. + id.x * .3);
      float frente = smoothstep(.0, .6, abs(dot(normalize(vN), normalize(vV))));
      float polo = sin(vUv.y * 3.14159);
      float a1 = borda * (.12 + .16 * degrau * pulso) + borda * logo * .14 + logo * .07;
      gl_FragColor = vec4(vec3(1., .54, .24), min(.3, a1) * uOpac * frente * polo);
    }`;
  function pele(cine) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const tex = new THREE.CanvasTexture(c);
    const svg = MapaVivo.logo().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" ');
    const img = new Image(); img.onload = () => { c.getContext('2d').drawImage(img, 0, 0, 256, 256); tex.needsUpdate = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const m = new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_PELE, fragmentShader: FRAG_PELE, uniforms: { uLogo: { value: tex }, uOpac: { value: 0 }, uTime: { value: 0 } } }, adt()));
    const malha = new THREE.Mesh(new THREE.SphereGeometry(2.2, 72, 48), m); malha.scale.setScalar(cine.esc); malha.visible = false; malha.renderOrder = 6;
    cine.cena.add(malha);
    return { aplicar(op, dt) { malha.visible = op > .005; m.uniforms.uOpac.value = op; m.uniforms.uTime.value += dt; } };
  }

  // ---------------------------------------------------------------- C. pacotes de dados (documento em traço)
  function texturaDocumento() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), k = 64 / 24;
    g.scale(k, k); g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.lineCap = g.lineJoin = 'round';
    ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'].forEach(d => g.stroke(new Path2D(d)));
    return new THREE.CanvasTexture(c);
  }
  function pacotes(cine) {
    const tex = texturaDocumento(), pool = [], tmp = new THREE.Vector3(), tam = .68 * cine.esc / 2.6 * (cine.baixo ? 1.6 : 1);
    for (let i = 0; i < 24; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: tex, color: 0xffe0b8, opacity: 0 }, adt())));
      s.scale.setScalar(tam); s.visible = false; cine.cena.add(s); pool.push({ s, p: null });
    }
    const agenda = new Map();
    function enviar(n, dir) {
      const livre = pool.find(x => !x.p); if (!livre) return;
      const p = cine.disparar(n, dir, dir === 0 ? 0xffb15c : 0xffe3bd, .38 + Math.random() * .22, 1.1); if (!p) return;
      livre.p = p; livre.no = n; livre.dir = dir; livre.s.material.color.set(dir === 0 ? 0xffc890 : 0xffe0b8);
    }
    return {
      enviar,
      quadro(dt, nos, congela, reduzido) {
        if (!reduzido && congela < .05) nos.forEach(n => {
          if (n.cineVis.v < .9) { agenda.delete(n); return; }
          let t = agenda.get(n);
          if (t === undefined) { enviar(n, 1); t = .8 + Math.random(); }
          t -= dt; if (t <= 0) { enviar(n, Math.random() < .5 ? 0 : 1); t = (3.2 + Math.random() * 2.4) * 6 / Math.max(3, n.taxa || 6); }
          agenda.set(n, t);
        });
        pool.forEach(x => {
          if (!x.p) return;
          if (!x.p.on || x.p.no !== x.no) { x.p = null; x.s.visible = false; return; }
          cine.bezier(x.no, x.dir === 0 ? x.p.u : 1 - x.p.u, tmp); x.s.position.copy(tmp);
          x.s.visible = true; x.s.material.opacity = .85 * Math.sin(Math.min(1, x.p.u) * Math.PI) ** .35 * x.no.cineVis.v;
        });
      },
    };
  }

  // ---------------------------------------------------------------- riscos de velocidade (presos à câmera)
  function riscos(cine, baixo) {
    const N = baixo ? 90 : 220, pos = new Float32Array(N * 6), info = [];
    for (let i = 0; i < N; i++) {
      const a = Math.random() * 6.2832, r = 1.6 + Math.random() * 7;
      info.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * .65, z: -4 - Math.random() * 40, l: 1.5 + Math.random() * 3 });
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineBasicMaterial(Object.assign({ color: 0xffc890, opacity: 0 }, adt()));
    const ls = new THREE.LineSegments(g, m); ls.frustumCulled = false; ls.visible = false;
    if (!cine.camera.parent) cine.cena.add(cine.camera);
    cine.camera.add(ls);
    return {
      quadro(dt, vel, faixa) {
        const op = Math.min(.5, vel * 2.2) * faixa; ls.visible = op > .01; m.opacity = op; if (!ls.visible) return;
        info.forEach((r, i) => {
          r.z += dt * (20 + vel * 260); if (r.z > -1.5) r.z -= 42;
          const l = r.l * (1 + vel * 6);
          pos.set([r.x, r.y, r.z, r.x, r.y, r.z - l], i * 6);
        });
        g.attributes.position.needsUpdate = true;
      },
    };
  }

  // ---------------------------------------------------------------- F. régua de graus na órbita mais externa
  function regua(cine) {
    let alvo = null, ls = null; const m = new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: 0 }, adt()));
    const marcas = [0, 90, 180, 270].map(g => { const e = document.createElement('span'); e.className = 'regua-n'; e.textContent = g + '°'; document.body.appendChild(e); return { e, g, v: new THREE.Vector3() }; });
    function montar(n) {
      if (ls) { cine.cena.remove(ls); ls.geometry.dispose(); }
      const P = n.trilho.geometry.attributes.position, seg = [], c = new THREE.Vector3(), d = new THREE.Vector3();
      for (let k = 0; k < 96; k += 2) {                        // 96 pontos no trilho = 3,75° cada; marca a cada 7,5°, maior a cada 15° e a cada 90°
        c.fromBufferAttribute(P, k); d.copy(c).normalize();
        const l = (k % 24 === 0 ? 1.1 : k % 4 === 0 ? .55 : .28) * cine.esc / 2.6 * 1.6;
        seg.push(c.x, c.y, c.z, c.x + d.x * l, c.y + d.y * l, c.z + d.z * l);
      }
      marcas.forEach(x => { x.v.fromBufferAttribute(P, x.g / 360 * 96 % 96); x.v.multiplyScalar(1 + 2.2 / x.v.length() * cine.esc / 2.6); });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      ls = new THREE.LineSegments(g, m); ls.frustumCulled = false; cine.cena.add(ls); alvo = n;
    }
    const tmp = new THREE.Vector3();
    return {
      aplicar(nos, op) {
        const n = nos[nos.length - 1]; if (!n) return;
        if (n !== alvo) montar(n);
        ls.visible = op > .005; m.opacity = .35 * op;
        marcas.forEach(x => {
          tmp.copy(x.v).project(cine.camera);
          const dentro = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
          x.e.style.opacity = dentro ? String(.35 * op) : '0';
          x.e.style.transform = `translate3d(${((tmp.x * .5 + .5) * innerWidth).toFixed(1)}px,${((-tmp.y * .5 + .5) * innerHeight).toFixed(1)}px,0) translate(-50%,-50%)`;
        });
      },
    };
  }

  window.LandingCena = { ambiente, construcao, pele, pacotes, riscos, regua };
})();
