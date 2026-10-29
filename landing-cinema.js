'use strict';
/**
 * Landing v2 · Seção 1 (o Núcleo): scroll cinematográfico sobre a cena do mapa-vivo.js (modo cinema).
 *  - camadas com velocidades diferentes, câmera que mergulha por um túnel e atravessa a órbita
 *  - peças congeladas no ar + distorção (ShaderPass) e depois as métricas nítidas
 *  - caixa de vidro com peças que o ponteiro empurra; rastro do ponteiro
 * Não guarda dados nem chaves: os números só aparecem se o navegador já tiver o acesso salvo pela Central (pc.html).
 */
(function () {
  const $ = s => document.querySelector(s);
  const reduzido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const temMapa = !!(window.MapaVivo && window.THREE && window.gsap);

  // os 7 projetos reais, na ordem do servidor (apps-script/Codigo.gs)
  const PROJETOS = [
    { id: 'gabinete', nome: 'Gabinete Chamados' },
    { id: 'planilha', nome: 'Planilha J Hissnauer', cliente: true },
    { id: 'assistente', nome: 'Assistente financeiro' },
    { id: 'painel', nome: 'Painel Meu dinheiro' },
    { id: 'pedalada', nome: 'Pedalada do Delei' },
    { id: 'atrasos', nome: 'Bot de atrasos' },
    { id: 'cacador', nome: 'Caçador de clientes' },
  ];
  const COR = { ok: 0x7bf0b4, atencao: 0xffc247, erro: 0xff4d5e, pausado: 0x7a6e60, config: 0x9a8c7a, aguardando: 0xc4a06a };
  const AMBAR = 0xff8a3d, LARANJA = 0xff5a1f, QUENTE = 0xffe0b8;

  const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---------------------------------------------------------------- identidade e lista de projetos
  if (window.MapaVivo) { $('#logo').innerHTML = MapaVivo.logo(); $('#nome').innerHTML = MapaVivo.marca(); }
  function listaProjetos(ps) {
    $('#projs').innerHTML = ps.map(p => `<li${p.status && p.status !== 'aguardando' ? ` data-st="${p.status}"` : ''}>${window.MapaVivo ? MapaVivo.icone(p.id) : ''}<span></span></li>`).join('');
    [...$('#projs').children].forEach((li, i) => { li.children[li.children.length - 1].textContent = window.MapaVivo ? MapaVivo.limpar(ps[i].nome) : ps[i].nome; });
  }
  listaProjetos(PROJETOS);

  // ---------------------------------------------------------------- cena do núcleo (modo cinema)
  const mapa = temMapa ? MapaVivo.montar({ fundo: true, cinema: true, dica: 'Ver na Central', aoSelecionar: () => { location.href = 'pc.html'; } }) : null;
  const cine = mapa && mapa.cinema;
  if (mapa) {
    document.body.prepend(mapa.el);
    mapa.el.dataset.semDados = '';
    mapa.atualizar(PROJETOS.map(p => Object.assign({ status: 'aguardando' }, p)), { estado: 'ok', titulo: '' });
  }

  // ---------------------------------------------------------------- trajetória da câmera (unidades da cena do PC; escala no celular)
  // p (progresso da rolagem do hero) → ângulo ao redor do núcleo (graus), raio, altura, FOV
  const CHAVES = [
    [0,    0,  62,   4,   38],
    [.30,  0,  24,   3,   56],
    [.45,  33, 16.7, 2.2, 50],
    [.62, -40, 15,   5,   50],
    [.75, -40, 15,   5,   50],
    [1,   -52, 9.5,  1.5, 42],
  ];
  // interpolação cúbica monótona (sem passar do ponto entre as chaves)
  function monotona(xs, ys) {
    const n = xs.length, d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
    }
    return x => {
      if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const hgt = xs[i + 1] - xs[i], t = (x - xs[i]) / hgt, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * hgt * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * hgt * m[i + 1];
    };
  }
  const xs = CHAVES.map(c => c[0]);
  const ANG = monotona(xs, CHAVES.map(c => c[1])), RAIO = monotona(xs, CHAVES.map(c => c[2])),
        ALT = monotona(xs, CHAVES.map(c => c[3])), FOV = monotona(xs, CHAVES.map(c => c[4]));
  // a cena do celular é menor (raio dos planetas) e a tela é em pé: afasta a câmera na mesma proporção
  const fator = () => (cine ? cine.raio / 11.8 : 1) * Math.max(1, Math.pow(1.6 / (innerWidth / innerHeight), .85));

  // ---------------------------------------------------------------- túnel (anéis com marcações + riscos de velocidade)
  let tunel = null;
  function montarTunel() {
    const g = new THREE.Group(), aneis = [], N = cine.baixo ? 12 : 24;
    const adt = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
    for (let i = 0; i < N; i++) {
      const z = 58 - i * (40 / (N - 1)), r = 6.4 + (i % 3) * .5, n = i % 2 ? 72 : 48, seg = [];
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), l = k % 6 === 0 ? .55 : .22; seg.push(c * r, s * r, 0, c * (r + l), s * (r + l), 0); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      const linha = new THREE.LineSegments(geo, new THREE.LineBasicMaterial(Object.assign({ color: i % 4 === 1 ? QUENTE : AMBAR, opacity: 0 }, adt)));
      const circ = []; for (let k = 0; k <= 120; k++) circ.push(new THREE.Vector3(Math.cos(k / 120 * 6.2832) * r, Math.sin(k / 120 * 6.2832) * r, 0));
      const aro = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circ), new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: 0 }, adt)));
      const anel = new THREE.Group(); anel.add(linha, aro); anel.position.z = z; anel.userData = { z, base: .12 + (i % 3) * .05, v: (i % 2 ? -1 : 1) * (.05 + (i % 5) * .02), linha, aro };
      g.add(anel); aneis.push(anel);
    }
    const NR = cine.baixo ? 140 : 320, rs = [];
    for (let i = 0; i < NR; i++) {
      const a = Math.random() * 6.2832, r = 4.5 + Math.random() * 6, z = 16 + Math.random() * 46, l = 1.2 + Math.random() * 2.2;
      rs.push(Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a) * r, Math.sin(a) * r, z + l);
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rs, 3));
    const riscos = new THREE.LineSegments(rg, new THREE.LineBasicMaterial(Object.assign({ color: 0xffc890, opacity: 0 }, adt)));
    g.add(riscos); g.frustumCulled = false;
    cine.cena.add(g);
    return { g, aneis, riscos, vel: 0 };
  }

  // ---------------------------------------------------------------- distorção (Igloo): refração + aberração contida e quente + névoa
  const DISTORCAO = {
    uniforms: { tDiffuse: { value: null }, uForca: { value: 0 }, uTempo: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uForca, uTempo, uAspect; varying vec2 vUv;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
        return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
      float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
      void main(){
        vec2 c = vUv - .5; c.x *= uAspect; float r = length(c);
        vec2 q = vUv * vec2(uAspect, 1.) * 2.6;
        vec2 warp = vec2(n2(q + uTempo * .12), n2(q * 1.3 - uTempo * .1 + 7.3)) - .5;
        vec2 uv = vUv + warp * .075 * uForca * (.35 + r);
        vec2 dir = normalize(vUv - .5 + 1e-4) * (.0015 + .0045 * min(r, 1.)) * uForca;
        vec3 base = texture2D(tDiffuse, uv).rgb;
        vec3 a = texture2D(tDiffuse, uv + dir).rgb, b = texture2D(tDiffuse, uv - dir).rgb;
        vec2 px = vec2(.004 * uForca);
        vec3 nev = (texture2D(tDiffuse, uv + vec2(px.x, 0.)).rgb + texture2D(tDiffuse, uv - vec2(px.x, 0.)).rgb
                  + texture2D(tDiffuse, uv + vec2(0., px.y)).rgb + texture2D(tDiffuse, uv - vec2(0., px.y)).rgb) * .25;
        vec3 col = mix(base, nev, .6 * uForca);
        col += vec3(1., .54, .24) * abs(lum(a) - lum(b)) * 1.6 * uForca;
        col = mix(col, col * .8 + vec3(1., .54, .24) * .035, uForca * .6);
        gl_FragColor = vec4(col, 1.);
      }`,
  };
  let passo = null;
  if (cine && !reduzido && THREE.ShaderPass) {
    passo = new THREE.ShaderPass(DISTORCAO); passo.enabled = false;
    if (!cine.adicionarPasso(passo)) passo = null;
  }

  // ---------------------------------------------------------------- caixa de vidro (Lusion): peças que o ponteiro empurra e gira
  function caixaVidro(el, legenda) {
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true'); el.prepend(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .1, 50); camera.position.set(0, 0, 9);
    const adt = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
    const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    // 7 projetos (esferas) + 3 poliedros do núcleo = 10 peças
    const LUGAR = [[-.74, .42], [-.28, .62], [.74, .44], [-.56, -.16], [.5, -.06], [-.72, -.6], [.62, -.6], [.22, .5], [0, -.08], [-.08, -.6]];
    const pecas = [];
    PROJETOS.forEach((p, i) => {
      const tam = p.cliente ? .5 : .4, cor = new THREE.Color(COR.aguardando), g = new THREE.Group();
      const casca = new THREE.Mesh(new THREE.SphereGeometry(tam, 10, 7), new THREE.MeshBasicMaterial(Object.assign({ color: cor, wireframe: true, opacity: .3 }, adt)));
      const miolo = new THREE.Mesh(new THREE.OctahedronGeometry(tam * .32), new THREE.MeshBasicMaterial(Object.assign({ color: cor, opacity: .9 }, adt)));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: tex, color: cor, opacity: .22 }, adt))); halo.scale.setScalar(tam * 3.2);
      g.add(casca, miolo, halo); scene.add(g);
      pecas.push({ g, nome: p.nome, id: p.id, mats: [casca.material, miolo.material, halo.material], lugar: LUGAR[i] });
    });
    [[new THREE.IcosahedronGeometry(.8, 1), AMBAR, .7], [new THREE.DodecahedronGeometry(.52, 0), QUENTE, .8], [new THREE.OctahedronGeometry(.62, 0), LARANJA, .6]].forEach(([geo, cor, op], i) => {
      const g = new THREE.Group(); g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial(Object.assign({ color: cor, wireframe: true, opacity: op }, adt)))); scene.add(g);
      pecas.push({ g, nome: 'Núcleo', lugar: LUGAR[7 + i] });
    });
    pecas.forEach((o, i) => { o.pos = new THREE.Vector3(); o.v = new THREE.Vector3(); o.casa = new THREE.Vector3(); o.av = new THREE.Vector3(); o.giro = new THREE.Vector3((i % 3 - 1) * .25, .3 + (i % 4) * .08, (i % 2 ? -1 : 1) * .12); });
    let w = 0, h = 0, hw = 1, hh = 1;
    function medir() {
      const r = el.getBoundingClientRect(); if (r.width < 10) return; w = r.width; h = r.height;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      hh = Math.tan(17.5 * Math.PI / 180) * 9; hw = hh * camera.aspect;
      const esc = Math.min(1, hw / 3.4);
      pecas.forEach(o => { o.casa.set(o.lugar[0] * hw * .8, o.lugar[1] * hh * .72 + hh * .04, 0); o.g.scale.setScalar(esc); if (!o.iniciado) { o.pos.copy(o.casa); o.iniciado = true; } });
    }
    const ptr = { x: 0, y: 0, vx: 0, vy: 0, ativo: false, t: 0 };
    function mover(e) {
      const r = el.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width * 2 - 1) * hw, y = -((e.clientY - r.top) / r.height * 2 - 1) * hh;
      const agora = performance.now(), dt = Math.max(8, agora - ptr.t) / 1000;
      if (ptr.ativo) { ptr.vx = ptr.vx * .5 + (x - ptr.x) / dt * .5; ptr.vy = ptr.vy * .5 + (y - ptr.y) / dt * .5; }
      ptr.x = x; ptr.y = y; ptr.t = agora; ptr.ativo = true; ligar();
    }
    const sair = () => { ptr.ativo = false; ptr.vx = ptr.vy = 0; legenda.textContent = toque ? 'Toque e arraste' : 'Passe o cursor'; };
    const toque = matchMedia('(hover: none)').matches;
    legenda.textContent = toque ? 'Toque e arraste' : 'Passe o cursor';
    if (!reduzido) {
      el.addEventListener('pointermove', mover, { passive: true });
      el.addEventListener('pointerdown', mover, { passive: true });
      el.addEventListener('pointerleave', sair); el.addEventListener('pointercancel', sair);
      el.addEventListener('touchmove', e => { const t = e.touches[0]; if (t) mover(t); }, { passive: true });
      el.addEventListener('touchend', sair, { passive: true });
    }
    // mola amortecida (k=18, c=8 ≈ crítico): volta ao lugar em ~1 s; empurrão radial e giro pela velocidade do ponteiro
    const K = 18, C = 8, RAIO = 1.9, FORCA = 140, tmp = new THREE.Vector3();
    let ultimo = 0, rodando = false, visivel = true, calmo = 0, t = 0;
    function passoFisica(dt) {
      t += dt; let perto = null, dmin = 1e9, mov = 0;
      pecas.forEach(o => {
        tmp.subVectors(o.casa, o.pos).multiplyScalar(K).addScaledVector(o.v, -C);
        if (ptr.ativo) {
          const dx = o.pos.x - ptr.x, dy = o.pos.y - ptr.y, d = Math.hypot(dx, dy) || .001;
          if (d < RAIO) {
            const f = Math.pow(1 - d / RAIO, 2) * FORCA; tmp.x += dx / d * f; tmp.y += dy / d * f; tmp.z += f * .25;
            o.av.y += ptr.vx * (1 - d / RAIO) * dt * 1.6; o.av.x -= ptr.vy * (1 - d / RAIO) * dt * 1.6;
          }
          if (d < dmin) { dmin = d; perto = o; }
        }
        o.v.addScaledVector(tmp, dt); o.pos.addScaledVector(o.v, dt);
        o.av.multiplyScalar(Math.exp(-dt * 2.6));
        o.g.position.copy(o.pos);
        o.g.rotation.x += (o.giro.x * .4 + o.av.x) * dt; o.g.rotation.y += (o.giro.y * .4 + o.av.y) * dt; o.g.rotation.z += o.giro.z * .3 * dt;
        mov += o.v.lengthSq() + o.av.lengthSq();
      });
      if (ptr.ativo) legenda.textContent = perto && dmin < RAIO * 1.2 ? perto.nome : (toque ? 'Toque e arraste' : 'Passe o cursor');
      ptr.vx *= .9; ptr.vy *= .9;
      return mov;
    }
    function quadro() {
      const agora = performance.now(), dt = Math.min(.033, (agora - ultimo) / 1000); ultimo = agora;
      if (!w) medir();
      const mov = passoFisica(dt); renderer.render(scene, camera);
      calmo = mov < 1e-4 && !ptr.ativo ? calmo + 1 : 0;
      if (!visivel || document.hidden || calmo > 30) desligar();
    }
    function ligar() { if (rodando || reduzido || !visivel) return; rodando = true; ultimo = performance.now(); gsap.ticker.add(quadro); }
    function desligar() { if (!rodando) return; rodando = false; gsap.ticker.remove(quadro); }
    new ResizeObserver(() => { medir(); if (!rodando) renderer.render(scene, camera); }).observe(el);
    new IntersectionObserver(es => { visivel = es[0].isIntersecting; visivel ? ligar() : desligar(); }).observe(el);
    document.addEventListener('visibilitychange', () => { document.hidden ? desligar() : ligar(); });
    medir(); renderer.render(scene, camera); ligar();
    return {
      status(ps) {
        ps.forEach(p => { const o = pecas.find(x => x.id === p.id); if (!o) return; const c = new THREE.Color(COR[p.status] || COR.aguardando); o.mats.forEach(m => m.color.copy(c)); });
        if (!rodando) renderer.render(scene, camera);
      },
    };
  }
  const vidro = window.THREE && window.gsap ? caixaVidro($('#vidro'), $('#vidro-nome')) : null;

  // ---------------------------------------------------------------- rastro do ponteiro (Lusion): cauda laranja que some em 700 ms
  function rastro(cv) {
    const ctx = cv.getContext('2d'), VIDA = 700, pts = [];
    let dpr = 1, rodando = false;
    const medir = () => { dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    medir(); addEventListener('resize', medir);
    const add = (x, y) => { const agora = performance.now(), u = pts[pts.length - 1]; if (u && Math.hypot(u.x - x, u.y - y) < 1.5) { u.t = agora; return; } pts.push({ x, y, t: agora }); if (pts.length > 140) pts.shift(); if (!rodando) { rodando = true; requestAnimationFrame(desenhar); } };
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const lista = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (lista.length ? lista : [e]).forEach(c => add(c.clientX, c.clientY));
    }, { passive: true });
    addEventListener('touchmove', e => { const t = e.touches[0]; if (t) add(t.clientX, t.clientY); }, { passive: true });
    addEventListener('touchstart', e => { const t = e.touches[0]; if (t) add(t.clientX, t.clientY); }, { passive: true });
    // #ff9a4d (cabeça) → #ff8a3d (cauda)
    const cor = (k, a) => `rgba(255,${Math.round(138 + 16 * k)},${Math.round(61 + 16 * k)},${a.toFixed(3)})`;
    function desenhar() {
      const agora = performance.now();
      while (pts.length && agora - pts[0].t > VIDA) pts.shift();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = ctx.lineJoin = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = 1 - (agora - pts[i].t) / VIDA; if (a <= 0) continue;
        const e = a * a;
        ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = cor(a, e * .16); ctx.lineWidth = 2 + 16 * e; ctx.stroke();
        ctx.strokeStyle = cor(a, e * .85); ctx.lineWidth = 1 + 4.5 * e; ctx.stroke();
      }
      if (pts.length) requestAnimationFrame(desenhar); else { rodando = false; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
    }
  }
  if (!reduzido) rastro($('#rastro'));

  // ---------------------------------------------------------------- rolagem: tudo sai de p (0 → 1)
  const chamada = $('.chamada'), caixa = $('#vidro'), info = $('.c-info'), topo = $('.c-topo');
  let PIN = 4;                                   // altura do pin em telas
  const est = { p: 0 };
  function aplicar() {
    const p = est.p, S = innerHeight * PIN;
    if (cine) {
      const f = fator(), a = ANG(p) * Math.PI / 180, r = RAIO(p) * f;
      Object.assign(cine.cam, { x: Math.sin(a) * r, z: Math.cos(a) * r, y: ALT(p) * f, fov: FOV(p), ly: -1.9 * f * suave(.55, .75, p), cursor: 1 - .7 * suave(.3, .6, p) });
      cine.congela.v = suave(.42, .47, p) * (1 - suave(.78, .88, p));
      cine.rotulos.v = suave(.22, .28, p) * (1 - suave(.4, .46, p));
      if (tunel) {
        const vis = 1 - suave(.3, .38, p), cz = cine.cam.z / f;
        tunel.g.visible = vis > .005; tunel.g.scale.setScalar(f);
        tunel.aneis.forEach(an => { const dz = cz - an.userData.z, o = an.userData.base * vis * suave(5, 16, dz) * (1 - suave(34, 58, dz)); an.userData.linha.material.opacity = o * 1.6; an.userData.aro.material.opacity = o * .7; });
      }
      if (passo) {
        const forca = suave(.45, .52, p) * (1 - suave(.58, .66, p));
        passo.uniforms.uForca.value = forca; passo.enabled = forca > .002;
      }
      if (cine.reduzido) cine.quadroEstatico();
    }
    // camadas: título a 1,6× a rolagem, caixa a 1,25×, métricas entram a 0,6×
    chamada.style.transform = `translate3d(0,${(-1.6 * p * S).toFixed(1)}px,0)`;
    chamada.style.opacity = String(1 - suave(.02, .14, p));
    caixa.style.transform = `translate3d(0,${(-1.25 * p * S).toFixed(1)}px,0)`;
    caixa.style.opacity = String(1 - suave(.06, .2, p));
    topo.style.visibility = p > .22 ? 'hidden' : '';
    const ent = Math.max(0, .7 - p) * .6 * S, nit = suave(.62, .72, p);
    info.style.transform = `translate3d(0,${ent.toFixed(1)}px,0)`;
    info.style.opacity = String(nit);
    info.style.filter = nit < 1 ? `blur(${((1 - nit) * 8).toFixed(2)}px)` : '';
    info.style.visibility = nit > .001 ? '' : 'hidden';
  }
  // velocidade da câmera → riscos e giro do túnel; tempo da distorção
  let pAnt = 0;
  if (cine && !reduzido) {
    tunel = montarTunel();
    gsap.ticker.add((tm, dtMs) => {
      const dt = Math.min(.05, dtMs / 1000), congela = cine.congela.v;
      if (tunel.g.visible) {
        const v = Math.abs(est.p - pAnt) / Math.max(dt, .001); tunel.vel += (v - tunel.vel) * Math.min(1, dt * 8);
        tunel.riscos.material.opacity = Math.min(.55, tunel.vel * 3.2) * (1 - suave(.3, .38, est.p));
        tunel.aneis.forEach(an => { an.rotation.z += an.userData.v * dt * (1 + tunel.vel * 6) * (1 - congela); });
      }
      pAnt = est.p;
      if (passo && passo.enabled) { passo.uniforms.uTempo.value += dt; passo.uniforms.uAspect.value = innerWidth / innerHeight; }
    });
  }

  if (!reduzido && window.ScrollTrigger && window.gsap) {
    gsap.registerPlugin(ScrollTrigger);
    const pinAltura = () => { PIN = innerWidth < 700 ? 3.2 : 4; return innerHeight * PIN; };
    gsap.to(est, { p: 1, ease: 'none', onUpdate: aplicar,
      scrollTrigger: { trigger: '#nucleo', start: 'top top', end: () => '+=' + pinAltura(), pin: true, scrub: 1, invalidateOnRefresh: true } });
    addEventListener('resize', aplicar);
    aplicar();
  } else {
    // movimento reduzido (ou sem GSAP): plano geral parado, título, caixa e métricas empilhados e legíveis
    est.p = 0; if (cine) { Object.assign(cine.cam, { x: 0, y: 4 * fator(), z: 40 * fator(), fov: 40, cursor: 0 }); cine.rotulos.v = 0; cine.quadroEstatico(); }
    info.style.opacity = '1';
  }

  // ---------------------------------------------------------------- números reais (só se o navegador já tem o acesso da Central)
  async function dados() {
    let cfg = null; try { cfg = JSON.parse(localStorage.getItem('jarvis.pc.cfg')); } catch (e) { cfg = null; }
    if (!cfg || !cfg.k || !/^https:\/\//.test(String(cfg.u || ''))) return;
    let P;
    try { const r = await fetch(cfg.u + '?' + new URLSearchParams({ k: cfg.k, acao: 'pc' }), { cache: 'no-store', redirect: 'follow' }); P = JSON.parse(await r.text()); }
    catch (e) { return; }
    if (!P || P.ok === false || !P.estado || !Array.isArray(P.estado.projetos)) return;
    const ps = P.estado.projetos, plural = (n, s, pl) => n + ' ' + (n === 1 ? s : pl);
    const erros = ps.filter(p => p.status === 'erro').length, atencoes = ps.filter(p => p.status === 'atencao').length;
    const parado = P.estado.verificadoEm && Date.now() - new Date(P.estado.verificadoEm).getTime() > 30 * 60e3;
    const sit = parado ? ['erro', 'Jarvão parado'] : erros ? ['erro', plural(erros, 'projeto com problema', 'projetos com problema')] : atencoes ? ['atencao', plural(atencoes, 'projeto pedindo atenção', 'projetos pedindo atenção')] : ['ok', 'Tudo certo'];
    const ativos = ps.filter(p => p.status !== 'pausado'), noAr = ativos.filter(p => p.status === 'ok').length;
    const ped = (P.pedidos || []).filter(x => x.status === 'novo' || x.status === 'andamento').length;
    const novos = (P.estado.avisos || []).filter(a => a.id > (P.estado.avisosVistosAte || 0)).length;
    const por = (k, txt, cls) => { const b = $(`[data-m=${k}]`); b.textContent = txt; b.className = cls || ''; };
    por('sit', sit[1], sit[0]); por('noar', noAr + '/' + ativos.length); por('ped', String(ped)); por('avisos', String(novos));
    $('#nota').hidden = true;
    listaProjetos(ps);
    if (mapa) { delete mapa.el.dataset.semDados; mapa.atualizar(ps, { estado: sit[0], titulo: sit[1] }); }
    if (vidro) vidro.status(ps);
  }
  dados();
})();
