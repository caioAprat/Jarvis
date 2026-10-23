'use strict';
/**
 * Mapa vivo do Jarvis: o núcleo (a inteligência) no centro, os projetos em órbita ligados a ele.
 * Cada verificação, execução e batida vira um pulso que vai até o núcleo e volta; entre eles, partículas
 * entram e saem do núcleo o tempo todo. Three.js (cena) + GSAP (movimento). Não guarda dados nem chaves.
 *
 *   const mapa = MapaVivo.montar({ aoSelecionar: id => ... });   // null se faltar WebGL ou as bibliotecas
 *   slot.appendChild(mapa.el);                                    // o elemento sobrevive a redesenhos da tela
 *   mapa.atualizar(projetos, { estado: 'ok', titulo: 'Tudo certo' });
 *   mapa.varredura();                                             // onda de conferência (ao conferir tudo)
 */
(function () {
  const ESTADO_TXT = { ok: 'no ar', atencao: 'atenção', erro: 'problema', pausado: 'pausado', config: 'configurar', aguardando: 'aguardando' };
  const COR = { ok: 0x7bf0b4, atencao: 0xffc247, erro: 0xff4d5e, pausado: 0x7a6e60, config: 0x9a8c7a, aguardando: 0xc4a06a };
  const AMBAR = 0xff8a3d, LARANJA = 0xff5a1f, QUENTE = 0xffe0b8;
  const COR_NUCLEO = { ok: 0xffb060, atencao: 0xffc247, erro: 0xff5a4a };

  const CSS = `
  .mv{position:relative;width:100%;height:100%;overflow:hidden;touch-action:pan-y}
  .mv canvas{display:block;width:100%;height:100%}
  .mv-hud{position:absolute;inset:0;pointer-events:none;overflow:hidden;font-family:"IBM Plex Mono",ui-monospace,Consolas,monospace}
  .mv-pos{position:absolute;left:0;top:0;will-change:transform;transition:opacity .25s}
  .mv-rotulo{pointer-events:auto;display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-width:44px;min-height:40px;padding:6px 10px;border-radius:7px;
    background:rgba(12,9,7,.7);color:#f4e7d6;font:500 10.5px/1.25 "IBM Plex Mono",ui-monospace,Consolas,monospace;letter-spacing:.07em;text-transform:uppercase;text-align:left;
    box-shadow:0 0 0 1px rgba(255,160,80,.26),0 6px 18px rgba(0,0,0,.45);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);
    transition:box-shadow .2s,background-color .2s,scale .12s cubic-bezier(.2,0,0,1);cursor:pointer}
  .mv-rotulo:active{scale:.96}
  .mv-rotulo:hover,.mv-rotulo.sel{background:rgba(30,18,10,.88);box-shadow:0 0 0 1px rgba(255,170,90,.7),0 0 22px rgba(255,120,40,.28),0 6px 18px rgba(0,0,0,.5)}
  .mv-rotulo:focus-visible{outline:2px solid #ffb060;outline-offset:2px}
  .mv-nome{font-weight:600;font-size:11px}
  .mv-st{font-size:9.5px;opacity:.9;display:flex;gap:6px;align-items:center}
  .mv-st::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
  .mv-rotulo[data-st=ok] .mv-st{color:#7bf0b4}.mv-rotulo[data-st=atencao] .mv-st{color:#ffc247}.mv-rotulo[data-st=erro] .mv-st{color:#ff4d5e}
  .mv-rotulo[data-st=erro]{box-shadow:0 0 0 1px rgba(255,77,94,.7),0 0 22px rgba(255,77,94,.25),0 6px 18px rgba(0,0,0,.45)}
  .mv-rotulo[data-st=pausado] .mv-st,.mv-rotulo[data-st=config] .mv-st,.mv-rotulo[data-st=aguardando] .mv-st{color:#a99a88}
  .mv-nucleo{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);text-align:center;pointer-events:none;text-transform:uppercase;letter-spacing:.22em}
  .mv-nucleo b{display:block;font:700 13px "Chakra Petch","IBM Plex Mono",sans-serif;color:#ffe9cc;text-shadow:0 0 14px rgba(255,140,60,.7)}
  .mv-nucleo span{display:block;margin-top:3px;font-size:9.5px;letter-spacing:.16em;color:#d9a46a}
  .mv-nucleo[data-st=erro] span{color:#ff8a94}.mv-nucleo[data-st=atencao] span{color:#ffd37a}
  @media (max-width:700px){.mv-rotulo{min-width:36px;min-height:32px;padding:3px 7px;gap:0}.mv-nome{font-size:9px;letter-spacing:.03em}.mv-st{font-size:8.5px}}
  @media (prefers-reduced-motion:reduce){.mv-rotulo{transition:none}}`;

  function textura(tipo) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    if (tipo === 'anel') {
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.stroke();
    } else {
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(.6, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    }
    const t = new THREE.CanvasTexture(c); return t;
  }

  const VERT_FLUXO = `
    attribute vec4 aSeed; uniform float uTime, uDir, uSize, uPix; varying float vA; varying float vQ;
    void main(){
      float k = fract(aSeed.w + uTime * 0.045 * aSeed.z);
      float q = uDir > 0. ? 1. - pow(k, 1.6) : 1. - pow(1. - k, 1.6);
      float r = mix(1.35, 10.5, q);
      float a = aSeed.x + uTime * 0.05 - (1. - q) * 1.9 * uDir;
      float ce = cos(aSeed.y);
      vec3 p = vec3(r * ce * cos(a), r * sin(aSeed.y) * 0.6, r * ce * sin(a));
      vA = smoothstep(0., .08, k) * (1. - smoothstep(.88, 1., k)); vQ = q;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_PointSize = uSize * uPix * (0.7 + (1. - q) * 1.1) * (24. / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`;
  const FRAG_FLUXO = `
    uniform vec3 uColor; varying float vA; varying float vQ;
    void main(){ float d = length(gl_PointCoord - .5); float s = smoothstep(.5, .0, d);
      vec3 c = mix(uColor, vec3(1., .88, .66), (1. - vQ) * .9); gl_FragColor = vec4(c, s * s * vA * .95); }`;
  const VERT_PULSO = `
    attribute vec3 color; attribute float size; uniform float uPix; varying vec3 vC;
    void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = size * uPix * (26. / -mv.z); gl_Position = projectionMatrix * mv; }`;
  const FRAG_PULSO = `varying vec3 vC; void main(){ float d = length(gl_PointCoord - .5); float s = smoothstep(.5, .0, d); gl_FragColor = vec4(vC, s * s); }`;

  function montar(opcoes) {
    opcoes = opcoes || {};
    if (!window.THREE || !window.gsap) return null;
    const reduzido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const leve = !!opcoes.leve || innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !leve, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return null; }
    if (!document.getElementById('mv-css')) { const s = document.createElement('style'); s.id = 'mv-css'; s.textContent = CSS; document.head.appendChild(s); }

    const el = document.createElement('div'); el.className = 'mv'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Mapa vivo dos projetos');
    const hud = document.createElement('div'); hud.className = 'mv-hud';
    const nucleoRot = document.createElement('div'); nucleoRot.className = 'mv-nucleo'; nucleoRot.innerHTML = '<b>JARVIS</b><span></span>';
    hud.appendChild(nucleoRot);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, leve ? 1.5 : 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.appendChild(renderer.domElement); el.appendChild(hud);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 120);
    const cam = { x: 0, y: 4, z: 15 }, off = { x: 0, y: 0 };
    const pix = { value: renderer.getPixelRatio() };
    const T_GLOW = textura('glow'), T_ANEL = textura('anel');
    const aditivo = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };

    // ------------------------------------------------------------ núcleo
    const nucleo = new THREE.Group(); nucleo.scale.setScalar(1.3); scene.add(nucleo);
    const corNucleo = new THREE.Color(COR_NUCLEO.ok);
    const glowMat = new THREE.SpriteMaterial(Object.assign({ map: T_GLOW, color: corNucleo, opacity: .8 }, aditivo));
    const glow = new THREE.Sprite(glowMat); glow.scale.setScalar(8.5); nucleo.add(glow);
    const miolo = new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 24), new THREE.MeshBasicMaterial({ color: QUENTE }));
    nucleo.add(miolo);
    const casca = new THREE.Mesh(new THREE.SphereGeometry(1.32, 24, 16), new THREE.MeshBasicMaterial(Object.assign({ color: AMBAR, wireframe: true, opacity: .22 }, aditivo)));
    nucleo.add(casca);
    // malha neural: pontos numa esfera ligados aos vizinhos
    const malha = new THREE.Group(); nucleo.add(malha);
    {
      const N = leve ? 60 : 120, pts = [], R = 1.95;
      for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), a = i * 2.39996; pts.push(new THREE.Vector3(Math.cos(a) * r * R, y * R, Math.sin(a) * r * R)); }
      const seg = [];
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (pts[i].distanceTo(pts[j]) < (leve ? 1.1 : .82)) seg.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
      const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      malha.add(new THREE.LineSegments(gl, new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: .42 }, aditivo))));
      const gp = new THREE.BufferGeometry().setFromPoints(pts);
      malha.add(new THREE.Points(gp, new THREE.PointsMaterial(Object.assign({ color: QUENTE, size: .07, opacity: .95 }, aditivo))));
    }
    // anéis com marcações (o círculo do núcleo)
    const aneis = [];
    [[2.9, 72, .1, .33, 0.25, -.5], [3.35, 120, .07, .22, -.15, .3], [3.9, 48, .16, .4, .1, .15]].forEach(([r, n, c0, c1, tx, vel]) => {
      const g = new THREE.Group(), seg = [];
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), l = i % 6 === 0 ? c1 : c0; seg.push(c * r, 0, s * r, c * (r + l), 0, s * (r + l)); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      g.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: .5 }, aditivo))));
      const circ = []; for (let i = 0; i <= 128; i++) circ.push(new THREE.Vector3(Math.cos(i / 128 * 6.2832) * r, 0, Math.sin(i / 128 * 6.2832) * r));
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circ), new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: .26 }, aditivo))));
      g.rotation.x = tx; g.userData.vel = vel; nucleo.add(g); aneis.push(g);
    });
    const onda = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: T_ANEL, color: QUENTE, opacity: 0 }, aditivo))); nucleo.add(onda);

    // ------------------------------------------------------------ fluxo de partículas entrando e saindo
    const fluxos = [];
    function criarFluxo(qtd, dir, cor, tam) {
      const seed = new Float32Array(qtd * 4), pos = new Float32Array(qtd * 3);
      for (let i = 0; i < qtd; i++) { seed[i * 4] = Math.random() * 6.2832; seed[i * 4 + 1] = (Math.random() - .5) * 1.1; seed[i * 4 + 2] = .6 + Math.random() * .8; seed[i * 4 + 3] = Math.random(); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
      const m = new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_FLUXO, fragmentShader: FRAG_FLUXO,
        uniforms: { uTime: { value: 0 }, uDir: { value: dir }, uSize: { value: tam }, uPix: pix, uColor: { value: new THREE.Color(cor) } } }, aditivo));
      const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); fluxos.push(m);
    }
    criarFluxo(leve ? 450 : 1500, 1, LARANJA, 2.1);
    criarFluxo(leve ? 300 : 900, -1, 0xffc890, 1.8);

    // ------------------------------------------------------------ pulsos (dados reais viajando)
    const MAXP = 56, CAUDA = 5;
    const pPos = new Float32Array(MAXP * CAUDA * 3), pCor = new Float32Array(MAXP * CAUDA * 3), pTam = new Float32Array(MAXP * CAUDA);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pCor, 3)); pg.setAttribute('size', new THREE.BufferAttribute(pTam, 1));
    const pulsosPts = new THREE.Points(pg, new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_PULSO, fragmentShader: FRAG_PULSO, uniforms: { uPix: pix } }, aditivo)));
    pulsosPts.frustumCulled = false; scene.add(pulsosPts);
    const pulsos = []; for (let i = 0; i < MAXP; i++) pulsos.push({ on: false, no: null, dir: 0, u: 0, v: 1, cor: new THREE.Color(), tam: 1 });

    // ------------------------------------------------------------ projetos em órbita
    const orbitas = new THREE.Group(); scene.add(orbitas);
    let nos = [], assinatura = '', selecionado = '';
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), VERMELHO = new THREE.Color(0xff4d5e);
    const seletores = [];

    function posOrbita(n, ang, out) {
      const x = Math.cos(ang) * n.r, z = Math.sin(ang) * n.r;
      const cx = Math.cos(n.tx), sx = Math.sin(n.tx), y1 = -z * sx, z1 = z * cx, cz = Math.cos(n.tz), sz = Math.sin(n.tz);
      return out.set(x * cz - y1 * sz, x * sz + y1 * cz, z1);
    }
    function limparNos() {
      nos.forEach(n => { orbitas.remove(n.grupo, n.link, n.vizinho, n.trilho); [n.grupo, n.link, n.vizinho, n.trilho].forEach(o => o.traverse && o.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); })); n.pos.remove(); });
      nos = [];
    }
    function construirNos(projetos) {
      limparNos();
      const qtd = projetos.length;
      projetos.forEach((p, i) => {
        const n = { id: p.id, i, cliente: !!p.cliente, status: p.status, r: 4.6 + i * .95,
          tx: (i % 2 ? -1 : 1) * (.12 + (i % 3) * .1), tz: (i % 3 - 1) * .1, ang: i / qtd * 6.2832 + .6, vel: (i % 2 ? -1 : 1) * (.055 + (i % 4) * .012),
          esc: { v: 1 }, hov: { v: 0 }, cor: new THREE.Color(COR[p.status] || COR.aguardando), corLink: new THREE.Color(AMBAR), taxa: 6,
          P0: new THREE.Vector3(), P1: new THREE.Vector3(), P2: new THREE.Vector3() };
        const g = new THREE.Group(), tam = n.cliente ? .42 : .3;
        n.malha = new THREE.Mesh(new THREE.OctahedronGeometry(tam), new THREE.MeshBasicMaterial({ color: n.cor, wireframe: true }));
        n.miolo = new THREE.Mesh(new THREE.OctahedronGeometry(tam * .5), new THREE.MeshBasicMaterial({ color: n.cor }));
        n.halo = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: T_GLOW, color: n.cor, opacity: .85 }, aditivo))); n.halo.scale.setScalar(n.cliente ? 2.6 : 1.9);
        g.add(n.malha, n.miolo, n.halo); n.grupo = g; orbitas.add(g);
        // ligação com o núcleo (curva) e com o vizinho
        const lg = new THREE.BufferGeometry(); n.linkPos = new Float32Array(37 * 3); lg.setAttribute('position', new THREE.BufferAttribute(n.linkPos, 3));
        n.link = new THREE.Line(lg, new THREE.LineBasicMaterial(Object.assign({ color: n.corLink, opacity: .62 }, aditivo))); n.link.frustumCulled = false; orbitas.add(n.link);
        const vg = new THREE.BufferGeometry(); n.vizPos = new Float32Array(17 * 3); vg.setAttribute('position', new THREE.BufferAttribute(n.vizPos, 3));
        n.vizinho = new THREE.Line(vg, new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: .24 }, aditivo))); n.vizinho.frustumCulled = false; orbitas.add(n.vizinho);
        const tr = []; for (let k = 0; k <= 96; k++) tr.push(posOrbita(n, k / 96 * 6.2832, new THREE.Vector3()));
        n.trilho = new THREE.Line(new THREE.BufferGeometry().setFromPoints(tr), new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: .07 }, aditivo))); orbitas.add(n.trilho);
        // rótulo (botão de verdade: teclado e leitor de tela)
        const pos = document.createElement('div'); pos.className = 'mv-pos';
        const b = document.createElement('button'); b.type = 'button'; b.className = 'mv-rotulo';
        b.innerHTML = '<span class="mv-nome"></span><span class="mv-st"></span>';
        b.addEventListener('click', () => { if (opcoes.aoSelecionar) opcoes.aoSelecionar(n.id); });
        b.addEventListener('mouseenter', () => gsap.to(n.hov, { v: 1, duration: .25, overwrite: true }));
        b.addEventListener('mouseleave', () => gsap.to(n.hov, { v: 0, duration: .4, overwrite: true }));
        b.addEventListener('focus', () => gsap.to(n.hov, { v: 1, duration: .25, overwrite: true }));
        b.addEventListener('blur', () => gsap.to(n.hov, { v: 0, duration: .4, overwrite: true }));
        pos.appendChild(b); hud.appendChild(pos); n.pos = pos; n.btn = b;
        nos.push(n);
        if (!reduzido) gsap.from(n.esc, { v: 0, duration: 1, delay: .5 + i * .13, ease: 'back.out(1.5)' });
      });
    }
    function atualizarRotulo(n, p) {
      n.btn.dataset.st = p.status;
      n.btn.firstChild.textContent = (p.icone ? p.icone + ' ' : '') + p.nome;
      n.btn.lastChild.textContent = ESTADO_TXT[p.status] || p.status;
      n.btn.setAttribute('aria-label', `${p.nome}: ${ESTADO_TXT[p.status] || p.status}. Abrir detalhes`);
      n.btn.classList.toggle('sel', p.id === selecionado);
      const m = /(\d+)\s*execu/i.exec(p.detalhe || '');
      n.taxa = (p.status === 'pausado' ? .6 : p.status === 'erro' ? 16 : p.status === 'atencao' ? 10 : 6) + (m ? Math.min(14, Number(m[1]) / 10) : 0);
    }

    // ------------------------------------------------------------ pulsos: disparo e chegada
    function disparar(n, dir, cor, vel, tam) {
      const p = pulsos.find(x => !x.on); if (!p || !n) return;
      p.on = true; p.no = n; p.dir = dir; p.u = 0; p.v = vel || (.5 + Math.random() * .25); p.tam = tam || 1; p.cor.set(cor);
    }
    function chegouNucleo(n, cor) {
      if (reduzido) return;
      gsap.fromTo(miolo.scale, { x: 1.2, y: 1.2, z: 1.2 }, { x: 1, y: 1, z: 1, duration: .55, ease: 'power3.out', overwrite: true });
      gsap.fromTo(glowMat, { opacity: 1 }, { opacity: .8, duration: .7, ease: 'power2.out', overwrite: 'auto' });
      if (Math.random() < .6) disparar(n, 1, 0xffe3bd, .6, .85);          // a inteligência responde
    }
    function chegouNo(n) { if (!reduzido) gsap.fromTo(n.esc, { v: 1.45 }, { v: 1, duration: .6, ease: 'power3.out', overwrite: true }); }
    function varredura() {
      if (reduzido) return;
      gsap.fromTo(onda.scale, { x: 2, y: 2 }, { x: 15, y: 15, duration: 1.8, ease: 'power2.out', overwrite: true });
      gsap.fromTo(onda.material, { opacity: .85 }, { opacity: 0, duration: 1.8, ease: 'power2.out', overwrite: true });
      nos.forEach((n, i) => gsap.delayedCall(.15 + i * .14, () => disparar(n, 1, n.cor.getHex(), .75, 1.5)));
    }

    // ------------------------------------------------------------ quadro a quadro
    let t = 0, ultimo = 0, acum = 0, ativo = true, w = 0, h = 0, rodando = false;
    const hov = n => n.hov.v;
    function bezier(n, u, out) {
      const a = 1 - u; return out.set(a * a * n.P0.x + 2 * a * u * n.P1.x + u * u * n.P2.x, a * a * n.P0.y + 2 * a * u * n.P1.y + u * u * n.P2.y, a * a * n.P0.z + 2 * a * u * n.P1.z + u * u * n.P2.z);
    }
    function quadro() {
      const agora = performance.now(), dt = Math.min(.05, (agora - ultimo) / 1000); ultimo = agora;
      if (!ativo || !el.isConnected || !w) return;
      acum += dt; if (leve && !reduzido && acum < 1 / 30) return; const d = acum; acum = 0;
      const vel = reduzido ? 0 : 1; t += d * vel;
      fluxos.forEach(m => { m.uniforms.uTime.value = t; });
      glowMat.color.copy(corNucleo);
      malha.rotation.y += d * .1 * vel; malha.rotation.x = Math.sin(t * .15) * .2;
      aneis.forEach(a => { a.rotation.y += d * a.userData.vel * vel; });
      camera.position.set(cam.x + off.x, cam.y + off.y, cam.z); camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      const meio = [w / 2, h / 2];
      nos.forEach((n, i) => {
        n.ang += d * n.vel * vel;
        posOrbita(n, n.ang, n.P0);
        n.grupo.position.copy(n.P0);
        const esc = n.esc.v * (1 + hov(n) * .35) * (n.id === selecionado ? 1.25 : 1); n.grupo.scale.setScalar(Math.max(.001, esc));
        n.malha.rotation.y += d * .8 * vel; n.malha.rotation.x += d * .5 * vel; n.miolo.rotation.y -= d * vel;
        n.P2.copy(n.P0).normalize().multiplyScalar(1.3);
        tmp.copy(n.P0).add(n.P2).multiplyScalar(.5);
        tmp2.set(n.P0.z, 0, -n.P0.x).normalize().multiplyScalar(1.1);
        n.P1.copy(tmp).add(tmp2); n.P1.y += 1.2 + (i % 2 ? .6 : -.2);
        for (let k = 0; k <= 36; k++) { bezier(n, k / 36, tmp); n.linkPos[k * 3] = tmp.x; n.linkPos[k * 3 + 1] = tmp.y; n.linkPos[k * 3 + 2] = tmp.z; }
        n.link.geometry.attributes.position.needsUpdate = true;
        const viz = nos[(i + 1) % nos.length];
        for (let k = 0; k <= 16; k++) { const u = k / 16; tmp.copy(n.P0).lerp(viz.P0, u); const c = Math.sin(u * Math.PI) * .22; tmp.lerp(tmp2.set(0, 0, 0), c); n.vizPos[k * 3] = tmp.x; n.vizPos[k * 3 + 1] = tmp.y; n.vizPos[k * 3 + 2] = tmp.z; }
        n.vizinho.geometry.attributes.position.needsUpdate = true;
        const sel = n.id === selecionado;
        n.link.material.opacity = .62 + hov(n) * .38 + (sel ? .3 : 0);
        n.link.material.color.copy(n.status === 'erro' ? VERMELHO : n.corLink);
        n.malha.material.color.copy(n.cor); n.miolo.material.color.copy(n.cor); n.halo.material.color.copy(n.cor);
        // pulsos de rotina: a cada nó, na taxa dele (mais atividade = mais pulsos)
        if (!reduzido && Math.random() < n.taxa * d / 60) disparar(n, 0, n.status === 'erro' ? 0xff6a7a : 0xffb15c, .5 + Math.random() * .3, .9);
        // rótulo na tela
        tmp.copy(n.P0).project(camera);
        const visivel = tmp.z < 1, x = (tmp.x * .5 + .5) * w, y = (-tmp.y * .5 + .5) * h;
        const dentro = Math.min(1, Math.max(.3, 1.1 - (tmp.z - .93) * 9));
        const lw = n.pos.offsetWidth || 120, lado = x + 14 + lw > w - 8 ? -(lw + 14) : 14;      // vira para a esquerda perto da borda
        n.pos.style.transform = `translate3d(${Math.max(6, Math.min(w - lw - 6, x + lado)).toFixed(1)}px,${Math.max(6, Math.min(h - 50, y - 18)).toFixed(1)}px,0)`;
        n.pos.style.opacity = visivel ? String(.55 + .45 * dentro) : '0';
        n.pos.style.zIndex = String(Math.round((1 - tmp.z) * 1000));
        n.halo.material.opacity = .65 + Math.sin(t * 2 + i) * .15 + hov(n) * .3;
      });
      // pulsos viajando
      let k = 0;
      pulsos.forEach(p => {
        if (p.on) {
          p.u += p.v * d;
          if (p.u >= 1) { p.on = false; if (p.dir === 0) chegouNucleo(p.no); else chegouNo(p.no); }
        }
        for (let c = 0; c < CAUDA; c++, k++) {
          if (!p.on) { pTam[k] = 0; continue; }
          const base = p.dir === 0 ? p.u : 1 - p.u, atras = c * .035 * (p.dir === 0 ? 1 : -1);
          bezier(p.no, Math.min(1, Math.max(0, base - atras)), tmp);
          const f = 1 - c / CAUDA;
          pPos[k * 3] = tmp.x; pPos[k * 3 + 1] = tmp.y; pPos[k * 3 + 2] = tmp.z;
          pCor[k * 3] = p.cor.r * f; pCor[k * 3 + 1] = p.cor.g * f; pCor[k * 3 + 2] = p.cor.b * f;
          pTam[k] = (c === 0 ? 5.2 : 3.6 * f) * p.tam;
        }
      });
      pg.attributes.position.needsUpdate = pg.attributes.color.needsUpdate = pg.attributes.size.needsUpdate = true;
      renderer.render(scene, camera);
    }
    function ligar() { if (rodando) return; rodando = true; ultimo = performance.now(); gsap.ticker.add(quadro); }
    function desligar() { if (!rodando) return; rodando = false; gsap.ticker.remove(quadro); }

    function redimensionar() {
      const r = el.getBoundingClientRect(); if (r.width < 10 || r.height < 10) { w = 0; return; }
      w = r.width; h = r.height; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      cam.z = Math.min(36, Math.max(15, 12.2 /(Math.tan(20 * Math.PI / 180) * camera.aspect))); cam.y = cam.z * .46;
      if (reduzido) estatico();
    }
    const ro = new ResizeObserver(redimensionar); ro.observe(el);
    const io = new IntersectionObserver(es => { ativo = es[0].isIntersecting && !document.hidden; ativo ? ligar() : desligar(); }); io.observe(el);
    document.addEventListener('visibilitychange', () => { ativo = !document.hidden && el.isConnected; ativo ? ligar() : desligar(); });
    if (!leve && !reduzido) {
      const ox = gsap.quickTo(off, 'x', { duration: 1.4, ease: 'power3.out' }), oy = gsap.quickTo(off, 'y', { duration: 1.4, ease: 'power3.out' });
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); ox(((e.clientX - r.left) / r.width - .5) * -3.2); oy(((e.clientY - r.top) / r.height - .5) * 2); });
      el.addEventListener('pointerleave', () => { ox(0); oy(0); });
    }
    if (!reduzido) gsap.from(cam, { z: cam.z + 9, y: cam.y + 5, duration: 2.4, ease: 'power3.out', immediateRender: false, delay: .05 });

    // ------------------------------------------------------------ interface pública
    function atualizar(projetos, info) {
      info = info || {};
      const ass = projetos.map(p => p.id).join('|');
      if (ass !== assinatura) { assinatura = ass; construirNos(projetos); }
      projetos.forEach((p, i) => {
        const n = nos[i]; if (!n) return;
        if (n.status !== p.status) {
          n.status = p.status; const c = new THREE.Color(COR[p.status] || COR.aguardando);
          gsap.to(n.cor, { r: c.r, g: c.g, b: c.b, duration: .9, ease: 'power2.out' });
          if (!reduzido) { gsap.fromTo(n.esc, { v: 1.7 }, { v: 1, duration: .8, ease: 'power3.out', overwrite: true }); disparar(n, 1, c.getHex(), .8, 1.8); }
        }
        atualizarRotulo(n, p);
      });
      const e = info.estado || 'ok', c = new THREE.Color(COR_NUCLEO[e] || COR_NUCLEO.ok);
      gsap.to(corNucleo, { r: c.r, g: c.g, b: c.b, duration: 1 });
      nucleoRot.dataset.st = e; nucleoRot.lastChild.textContent = info.titulo || '';
      if (reduzido) estatico(); else if (!rodando) ligar();
    }
    function estatico() { acum = 1; quadro(); }                 // movimento reduzido: um quadro parado a cada mudança
    function selecionar(id) { selecionado = id || ''; nos.forEach(n => n.btn.classList.toggle('sel', n.id === selecionado)); if (reduzido) estatico(); }
    function destruir() { desligar(); ro.disconnect(); io.disconnect(); limparNos(); renderer.dispose(); el.remove(); }
    redimensionar();
    return { el, depurar: () => ({ nos, camera, w, h }), atualizar, varredura, selecionar, destruir, pausar: p => { ativo = !p; p ? desligar() : ligar(); } };
  }
  window.MapaVivo = { montar };
})();
