'use strict';
/**
 * JARVIS · identidade e núcleo vivo.
 *  - Identidade: logotipo (MapaVivo.logo), nome (MapaVivo.marca), ícones dos projetos (MapaVivo.icone) e limpeza de emojis (MapaVivo.limpar).
 *  - Núcleo: a inteligência no centro (plasma, estrutura interna, anéis, malha), projetos em órbita ligados a ele por fluxos de dados.
 *    Three.js (cena, bloom) + GSAP (movimento). Não guarda dados nem chaves.
 *
 *   const mapa = MapaVivo.montar({ fundo: true, aoSelecionar: id => ... });   // fundo: camada fixa de tela cheia (PC); sem: dentro de um espaço (iPhone, leve: true)
 *   document.body.appendChild(mapa.el);
 *   mapa.atualizar(projetos, { estado: 'ok', titulo: 'Tudo certo' });
 *   mapa.varredura();  mapa.modo('palco' | 'fundo');  mapa.rolagem(0..1);
 */
(function () {
  const ESTADO_TXT = { ok: 'no ar', atencao: 'atenção', erro: 'problema', pausado: 'pausado', config: 'configurar', aguardando: 'aguardando' };
  const COR = { ok: 0x7bf0b4, atencao: 0xffc247, erro: 0xff4d5e, pausado: 0x7a6e60, config: 0x9a8c7a, aguardando: 0xc4a06a };
  const AMBAR = 0xff8a3d, LARANJA = 0xff5a1f, QUENTE = 0xffe0b8, BRANCO_QUENTE = 0xfff1dc;
  const TINTA_NUCLEO = { ok: [1, .56, .2], atencao: [1, .74, .18], erro: [1, .3, .24] };

  // ================================================================== identidade
  const EMOJI = /[\p{Extended_Pictographic}‍️⃣]/gu;
  /** Tira emojis de qualquer texto mostrado na tela. */
  function limpar(t) {
    t = String(t == null ? '' : t);
    return /\p{Extended_Pictographic}/u.test(t) ? t.replace(EMOJI, '').replace(/ {2,}/g, ' ').replace(/^ +/, '') : t;
  }
  const rad = d => (d - 90) * Math.PI / 180;
  function arcoSvg(R, a0, a1) {
    const pt = d => [(32 + R * Math.cos(rad(d))).toFixed(2), (32 + R * Math.sin(rad(d))).toFixed(2)], [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    return `M${x0} ${y0}A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  }
  /** Logotipo: emblema com anel de marcações, três arcos externos, dois internos e o núcleo que bate. O tamanho vem do font-size do pai. */
  function logo(extra) {
    const ext = [0, 1, 2].map(i => arcoSvg(24, i * 120 + 8, i * 120 + 98)).join('');
    const inn = [0, 1].map(i => arcoSvg(15.5, i * 180 + 20, i * 180 + 150)).join('');
    let tk = '';
    for (let i = 0; i < 24; i++) { const an = i * 15 * Math.PI / 180, r1 = i % 6 === 0 ? 26.6 : 28.2; tk += `M${(32 + 29.8 * Math.sin(an)).toFixed(2)} ${(32 - 29.8 * Math.cos(an)).toFixed(2)}L${(32 + r1 * Math.sin(an)).toFixed(2)} ${(32 - r1 * Math.cos(an)).toFixed(2)}`; }
    return `<svg class="mk ${extra || ''}" viewBox="0 0 64 64" aria-hidden="true"><defs>
      <radialGradient id="mkc"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffd9a8"/><stop offset="1" stop-color="#ff7a26"/></radialGradient>
      <linearGradient id="mka" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe6c8"/><stop offset="1" stop-color="#ff6a1a"/></linearGradient></defs>
      <circle cx="32" cy="32" r="30.6" fill="none" stroke="#ffb36a" stroke-opacity=".3" stroke-width=".8"/>
      <path class="mk-t" d="${tk}" fill="none" stroke="#ffb36a" stroke-width=".9" opacity=".75"/>
      <path class="mk-r1" d="${ext}" fill="none" stroke="url(#mka)" stroke-width="3.4"/>
      <path class="mk-r2" d="${inn}" fill="none" stroke="#ffcf9a" stroke-width="2.4"/>
      <g class="mk-core"><circle cx="32" cy="32" r="7.2" fill="url(#mkc)"/><circle cx="32" cy="32" r="2.4" fill="#fff"/></g></svg>`;
  }
  /** Nome: JARVÃO, em caixa alta, com degradê quente. */
  function marca() { return '<span class="wm" role="img" aria-label="Jarvão">JARVÃO</span>'; }
  const ICONE_PROJ = {
    gabinete: '<path d="M3 22h18"/><path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="M12 2 3 8h18z"/>',
    planilha: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    assistente: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    painel: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    atrasos: '<path d="m7.5 4.3 9 5.2"/><path d="M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    pedalada: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    cacador: '<circle cx="12" cy="12" r="9"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
    padrao: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/>',
  };
  const icone = id => `<svg class="pi" viewBox="0 0 24 24" aria-hidden="true">${ICONE_PROJ[id] || ICONE_PROJ.padrao}</svg>`;

  const CSS = `
  .mk{width:1em;height:1em;display:inline-block;flex:none;overflow:visible;vertical-align:middle}
  .mk-r1,.mk-r2,.mk-t,.mk-core{transform-origin:32px 32px}
  .mk-r1{animation:mk-giro 24s linear infinite}.mk-r2{animation:mk-giro 15s linear infinite reverse}.mk-t{animation:mk-giro 60s linear infinite}
  .mk-core{animation:mk-bate 2.6s ease-in-out infinite}
  @keyframes mk-giro{to{transform:rotate(360deg)}}
  @keyframes mk-bate{0%,100%{transform:scale(1)}12%{transform:scale(1.16)}24%{transform:scale(1)}38%{transform:scale(1.1)}52%{transform:scale(1)}}
  .wm{display:inline-block;font:400 1em/1.05 "Michroma","Saira",sans-serif;letter-spacing:.17em;margin-right:-.17em;text-transform:uppercase;color:transparent;
    background:linear-gradient(180deg,#fffaf0 0%,#ffdcb0 48%,#ff9a4a 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-stroke:.035em rgba(255,200,140,.55);
    filter:drop-shadow(0 0 .5em rgba(255,128,48,.55)) drop-shadow(0 0 1.4em rgba(255,100,30,.28))}
  .pi{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none;vertical-align:-.15em}
  .mv{position:relative;width:100%;height:100%;overflow:hidden;touch-action:pan-y}
  .mv canvas{display:block;width:100%;height:100%}
  .mv-fundo{position:fixed;inset:0;z-index:0;width:auto;height:auto;touch-action:auto;transition:opacity .5s;opacity:calc(1 - .78 * var(--mv-p,0))}
  .mv-fundo[data-modo=fundo]{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .35s,visibility 0s .35s}
  .mv-fundo[data-modo=fundo] .mv-pos,.mv-fundo[data-modo=fundo] .mv-nucleo{opacity:0!important;pointer-events:none}
  .mv-hud{position:absolute;inset:0;pointer-events:none;overflow:hidden;font-family:"JetBrains Mono",ui-monospace,Consolas,monospace}
  .mv-pos{position:absolute;left:0;top:0;will-change:transform;transition:opacity .25s}
  .mv-rotulo{pointer-events:auto;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:44px;min-height:40px;padding:7px 12px;border-radius:7px;
    background:rgba(12,9,7,.62);color:#f4e7d6;font:500 10.5px/1.25 "JetBrains Mono",ui-monospace,Consolas,monospace;letter-spacing:.07em;text-transform:uppercase;text-align:left;
    box-shadow:0 0 0 1px rgba(255,160,80,.26),0 6px 18px rgba(0,0,0,.45);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);
    transition:box-shadow .2s,background-color .2s,scale .12s cubic-bezier(.2,0,0,1);cursor:pointer}
  .mv-rotulo:active{scale:.96}
  .mv-rotulo:hover,.mv-rotulo.sel{background:rgba(30,18,10,.88);box-shadow:0 0 0 1px rgba(255,170,90,.7),0 0 22px rgba(255,120,40,.28),0 6px 18px rgba(0,0,0,.5)}
  .mv-rotulo:focus-visible{outline:2px solid #ffb060;outline-offset:2px}
  .mv-nome{font-weight:600;font-size:11px;display:flex;align-items:center;gap:7px}
  .mv-ic{display:inline-flex;font-size:14px;color:#ffc58a}
  .mv-st{font-size:9.5px;opacity:.9;display:flex;gap:6px;align-items:center}
  .mv-st::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
  .mv-rotulo[data-st=ok] .mv-st{color:#7bf0b4}.mv-rotulo[data-st=atencao] .mv-st{color:#ffc247}.mv-rotulo[data-st=erro] .mv-st{color:#ff4d5e}
  .mv-rotulo[data-st=erro]{box-shadow:0 0 0 1px rgba(255,77,94,.7),0 0 22px rgba(255,77,94,.25),0 6px 18px rgba(0,0,0,.45)}
  .mv-rotulo[data-st=pausado] .mv-st,.mv-rotulo[data-st=config] .mv-st,.mv-rotulo[data-st=aguardando] .mv-st{color:#a99a88}
  .mv-nucleo{position:absolute;left:50%;bottom:88px;transform:translateX(-50%);text-align:center;pointer-events:none;text-transform:uppercase;transition:opacity .3s}
  .mv-nucleo .wm{font-size:17px}
  .mv-nucleo span.mv-leg{display:block;margin-top:8px;font:500 9.5px "JetBrains Mono",monospace;letter-spacing:.2em;color:#d9a46a}
  .mv-nucleo[data-st=erro] .mv-leg{color:#ff8a94}.mv-nucleo[data-st=atencao] .mv-leg{color:#ffd37a}
  .mv-compacto .mv-rotulo{min-width:40px;min-height:40px;padding:6px 9px;align-items:center;justify-content:center}
  .mv-compacto .mv-rotulo:not(.sel) .mv-tx,.mv-compacto .mv-rotulo:not(.sel) .mv-st{display:none}
  .mv-compacto .mv-ic{font-size:16px}
  .mv-compacto .mv-nucleo span.mv-leg{display:none}.mv-compacto .mv-nucleo{bottom:30px}
  .mv-compacto .mv-rotulo[data-st=erro]:not(.sel){box-shadow:0 0 0 1.5px #ff4d5e,0 0 16px rgba(255,77,94,.5)}
  .mv-compacto .mv-rotulo[data-st=atencao]:not(.sel){box-shadow:0 0 0 1.5px #ffc247,0 0 14px rgba(255,194,71,.35)}
  @media (max-width:700px){.mv-rotulo{min-width:36px;min-height:32px;padding:4px 8px;gap:0}.mv-nome{font-size:9px;letter-spacing:.03em}.mv-st{font-size:8.5px}}
  @media (prefers-reduced-motion:reduce){.mv-rotulo{transition:none}.mk-r1,.mk-r2,.mk-t,.mk-core{animation:none}}`;

  function textura(tipo) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    if (tipo === 'anel') { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.stroke(); }
    else {
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(.6, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  }

  // ================================================================== shaders
  const RUIDO = `
    float h31(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * n3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= .5; } return s; }`;
  const VERT_PLASMA = `
    uniform float uTime, uBulge; uniform vec3 uM; varying vec3 vP, vVN, vV;
    void main(){ vec3 n = normalize(normal); float b = pow(max(dot(n, uM), 0.), 5.) * uBulge;
      vec3 p = position + n * (b * .42 + sin(uTime * 1.3 + position.y * 3.) * .02);
      vP = position; vVN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(p, 1.); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
  const FRAG_PLASMA = RUIDO + `
    uniform float uTime; uniform vec3 uM, uTint; varying vec3 vP, vVN, vV;
    void main(){ vec3 N = normalize(vVN); float fres = pow(1. - abs(dot(N, normalize(vV))), 2.3);
      vec3 q = vP * 1.7; float t = uTime * .33;
      float f = fbm(q + vec3(t, -t * .6, t * .4)); float g = fbm(q * 1.8 - vec3(t * .8, t, -t * .5) + f * 1.6);
      float cel = smoothstep(.42, .5, g) - smoothstep(.5, .58, g) * .0;                       // veios de energia
      float heat = smoothstep(.3, .9, g * 1.25 + f * .3);
      vec3 col = mix(vec3(.28, .05, .01), uTint * .85, heat); col = mix(col, vec3(1., .88, .66), smoothstep(.78, 1., heat) * .8);
      col += vec3(1., .7, .4) * cel * .45;
      float cur = pow(max(dot(normalize(vP), uM), 0.), 14.); col += vec3(1., .86, .62) * cur * .55;
      col += uTint * fres * 1.05;
      float a = clamp(.14 + .62 * fres + heat * .2 + cur * .3, 0., 1.);
      gl_FragColor = vec4(col * a, a); }`;
  const VERT_FLUXO = `
    attribute vec4 aSeed; uniform float uTime, uDir, uSize, uPix, uR0, uR1, uPush, uRad; uniform vec3 uMouse; varying float vA; varying float vQ; varying float vH;
    void main(){
      float k = fract(aSeed.w + uTime * 0.045 * aSeed.z);
      float q = uDir > 0. ? 1. - pow(k, 1.6) : 1. - pow(1. - k, 1.6);
      float r = mix(uR0, uR1, q);
      float a = aSeed.x + uTime * 0.05 - (1. - q) * 1.9 * uDir;
      float ce = cos(aSeed.y);
      vec3 p = vec3(r * ce * cos(a), r * sin(aSeed.y) * 0.6, r * ce * sin(a));
      vec2 dm = p.xz - uMouse.xz; float dd = length(dm);
      float push = smoothstep(uRad, 0., dd) * uPush;
      p.xz += dm / (dd + .001) * push * uRad * .075; p.y += push * uRad * .03 * sin(uTime * 3. + aSeed.x * 6.);
      vH = push;
      vA = smoothstep(0., .08, k) * (1. - smoothstep(.88, 1., k)); vQ = q;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_PointSize = uSize * uPix * (0.7 + (1. - q) * 1.1 + push * .45) * (24. / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`;
  const FRAG_FLUXO = `
    uniform vec3 uColor; varying float vA; varying float vQ; varying float vH;
    void main(){ float d = length(gl_PointCoord - .5); float s = smoothstep(.5, .0, d);
      vec3 c = mix(uColor, vec3(1., .88, .66), clamp((1. - vQ) * .9 + vH, 0., 1.)); gl_FragColor = vec4(c, s * s * vA * (.95 + vH)); }`;
  const VERT_PULSO = `
    attribute vec3 color; attribute float size; uniform float uPix; varying vec3 vC;
    void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = size * uPix * (26. / -mv.z); gl_Position = projectionMatrix * mv; }`;
  const FRAG_PULSO = `varying vec3 vC; void main(){ float d = length(gl_PointCoord - .5); float s = smoothstep(.5, .0, d); gl_FragColor = vec4(vC, s * s); }`;
  const VERT_CASCA = `
    attribute vec4 aSeed; uniform float uTime, uPix, uSize; varying float vA;
    void main(){ float t = uTime * (.1 + aSeed.z * .12) + aSeed.w * 6.2832;
      float c = cos(aSeed.y), r = (1.45 + aSeed.z * .75) + sin(uTime * (.6 + aSeed.z) + aSeed.x * 4.) * .1;
      float a = aSeed.x + t; vec3 p = vec3(r * c * cos(a), r * sin(aSeed.y), r * c * sin(a));
      vA = .35 + .65 * (.5 + .5 * sin(uTime * 2.2 + aSeed.w * 30.));
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = uSize * uPix * (.6 + aSeed.z) * (22. / -mv.z); gl_Position = projectionMatrix * mv; }`;
  const FRAG_CASCA = `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float s = smoothstep(.5, .0, d); gl_FragColor = vec4(1., .78, .5, s * s * vA); }`;
  const VERT_ESTRELA = `
    attribute vec4 aSeed; uniform float uTime, uPix; varying float vA;
    void main(){ vA = .25 + .75 * pow(.5 + .5 * sin(uTime * (.4 + aSeed.z) + aSeed.w * 40.), 3.);
      vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = (.8 + aSeed.z * 1.8) * uPix * (60. / -mv.z); gl_Position = projectionMatrix * mv; }`;
  const FRAG_ESTRELA = `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float s = smoothstep(.5, .0, d); gl_FragColor = vec4(1., .86, .7, s * s * vA * .8); }`;

  // ================================================================== montagem
  function montar(o) {
    o = o || {};
    if (!window.THREE || !window.gsap) return null;
    const reduzido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FUNDO = !!o.fundo;
    const baixo = !!o.leve || innerWidth < 700;
    const area = innerWidth * innerHeight, grande = area > 3.2e6;            // tela estendida / muito grande: bem menos carga
    const q = o.leve ? .11 : baixo ? .16 : Math.min(grande ? .55 : 1, (navigator.hardwareConcurrency || 8) < 6 ? .55 : 1);
    const ESC = o.leve ? 1.35 : baixo ? 1.7 : 2.6;
    const R_BASE = o.leve ? 4 : baixo ? 7.2 : 11.8, R_PASSO = o.leve ? .8 : baixo ? .8 : .95;
    const usaBloom = FUNDO && !baixo && q >= .8 && !!(THREE.EffectComposer && THREE.UnrealBloomPass && THREE.RenderPass);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !baixo, alpha: !FUNDO, powerPreference: 'high-performance' }); }
    catch (e) { return null; }
    if (!document.getElementById('mv-css')) { const s = document.createElement('style'); s.id = 'mv-css'; s.textContent = CSS; document.head.appendChild(s); }
    if (FUNDO) renderer.setClearColor(0x080706, 1);

    const el = document.createElement('div'); el.className = 'mv' + (o.leve ? ' mv-compacto' : '') + (FUNDO ? ' mv-fundo' : ''); el.dataset.modo = 'palco';
    el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Mapa vivo dos projetos');
    const hud = document.createElement('div'); hud.className = 'mv-hud';
    const nucleoRot = document.createElement('div'); nucleoRot.className = 'mv-nucleo'; nucleoRot.innerHTML = marca() + '<span class="mv-leg"></span>';
    hud.appendChild(nucleoRot);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, grande ? 1 : (FUNDO || baixo) ? 1.25 : 1.5));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.appendChild(renderer.domElement); el.appendChild(hud);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 400);
    const cam = { x: 0, y: 8, z: 26 }, off = { x: 0, y: 0 }, chute = { v: 0 };
    const pix = { value: renderer.getPixelRatio() };
    const T_GLOW = textura('glow'), T_ANEL = textura('anel');
    const aditivo = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
    let comp = null, bloom = null;
    if (usaBloom) {
      comp = new THREE.EffectComposer(renderer); comp.addPass(new THREE.RenderPass(scene, camera));
      bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), .5, .55, .32); bloom.renderToScreen = true; comp.addPass(bloom);
    }

    // ------------------------------------------------------------ cursor (o núcleo reage)
    const ptr = { x: 0, y: 0, dentro: false, mx: 0, my: 0, presenca: { v: 0 }, hoverNucleo: { v: 0 }, vel: 0 };
    const ray = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), planoCam = new THREE.Plane(), mundo = new THREE.Vector3(), mundoCam = new THREE.Vector3();
    const mDir = new THREE.Vector3(0, 0, 1), mDirAlvo = new THREE.Vector3(0, 0, 1);
    const giro = { v: 1 };                                             // velocidade extra dos anéis quando o cursor está no núcleo
    const inclina = { x: 0, y: 0 };

    // ------------------------------------------------------------ núcleo
    const tilt = new THREE.Group(); scene.add(tilt);
    const nucleo = new THREE.Group(); nucleo.scale.setScalar(ESC); tilt.add(nucleo);
    const tinta = new THREE.Color(1, .56, .2), tintaVetor = new THREE.Vector3(1, .56, .2);
    const glowMat = new THREE.SpriteMaterial(Object.assign({ map: T_GLOW, color: new THREE.Color(1, .55, .2), opacity: .4 }, aditivo));
    const glow = new THREE.Sprite(glowMat); glow.scale.setScalar(7.5); nucleo.add(glow);
    const plasmaMat = new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_PLASMA, fragmentShader: FRAG_PLASMA,
      uniforms: { uTime: { value: 0 }, uBulge: { value: 0 }, uM: { value: mDir }, uTint: { value: tintaVetor } } }, aditivo));
    const plasma = new THREE.Mesh(new THREE.SphereGeometry(1.05, o.leve ? 32 : 72, o.leve ? 24 : 52), plasmaMat); plasma.renderOrder = 5; nucleo.add(plasma);
    // interior: giroscópio, poliedros e raios
    const interior = new THREE.Group(); nucleo.add(interior);
    const semente = new THREE.Mesh(new THREE.IcosahedronGeometry(.24, 1), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); interior.add(semente);
    const semGlow = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: T_GLOW, color: 0xffe0b0, opacity: .95 }, aditivo))); semGlow.scale.setScalar(1.25); interior.add(semGlow);
    const poliA = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 1), new THREE.MeshBasicMaterial(Object.assign({ color: AMBAR, wireframe: true, opacity: .55 }, aditivo))); interior.add(poliA);
    const poliB = new THREE.Mesh(new THREE.DodecahedronGeometry(.52, 0), new THREE.MeshBasicMaterial(Object.assign({ color: 0xffe0b8, wireframe: true, opacity: .7 }, aditivo))); interior.add(poliB);
    const poliC = new THREE.Mesh(new THREE.OctahedronGeometry(.95, 0), new THREE.MeshBasicMaterial(Object.assign({ color: LARANJA, wireframe: true, opacity: .35 }, aditivo))); interior.add(poliC);
    const gdir = [], gAneis = [];
    [[.6, .5, 0], [.76, 0, 1.0], [.92, 1.2, .5]].forEach(([r, rx, ry], i) => {
      const pts = []; for (let k = 0; k <= 96; k++) pts.push(new THREE.Vector3(Math.cos(k / 96 * 6.2832) * r, 0, Math.sin(k / 96 * 6.2832) * r));
      const g = new THREE.Group();
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial(Object.assign({ color: i === 1 ? 0xffe0b8 : AMBAR, opacity: .8 }, aditivo))));
      const bola = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: T_GLOW, color: 0xfff0d8, opacity: 1 }, aditivo))); bola.scale.setScalar(.38); g.add(bola);
      g.rotation.set(rx, 0, ry); interior.add(g); gAneis.push({ g, bola, r, v: (i % 2 ? -1 : 1) * (.9 + i * .45), a: i * 2 });
    });
    {
      const seg = [], N = o.leve ? 40 : 90;
      for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), a = i * 2.39996; seg.push(0, 0, 0, Math.cos(a) * r * .98, y * .98, Math.sin(a) * r * .98); }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      interior.userData.raios = new THREE.LineSegments(rg, new THREE.LineBasicMaterial(Object.assign({ color: 0xffb070, opacity: .16 }, aditivo))); interior.add(interior.userData.raios);
    }
    // casca: esfera de linhas + malha neural + partículas
    const casca = new THREE.Mesh(new THREE.SphereGeometry(1.34, 28, 18), new THREE.MeshBasicMaterial(Object.assign({ color: AMBAR, wireframe: true, opacity: .2 }, aditivo))); nucleo.add(casca);
    const malha = new THREE.Group(); nucleo.add(malha);
    {
      const N = o.leve ? 70 : 150, pts = [], R = 1.95;
      for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), a = i * 2.39996; pts.push(new THREE.Vector3(Math.cos(a) * r * R, y * R, Math.sin(a) * r * R)); }
      const seg = [];
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (pts[i].distanceTo(pts[j]) < (o.leve ? 1.05 : .78)) seg.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
      const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      malha.add(new THREE.LineSegments(gl, new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: .42 }, aditivo))));
      malha.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial(Object.assign({ color: QUENTE, size: .075, opacity: .95 }, aditivo))));
    }
    const cascaUni = { uTime: { value: 0 }, uPix: pix, uSize: { value: 2.2 } };
    {
      const n = Math.max(100, Math.round(800 * q)), seed = new Float32Array(n * 4), pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { seed[i * 4] = Math.random() * 6.2832; seed[i * 4 + 1] = Math.asin(Math.random() * 2 - 1); seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = Math.random(); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
      const pt = new THREE.Points(g, new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_CASCA, fragmentShader: FRAG_CASCA, uniforms: cascaUni }, aditivo))); pt.frustumCulled = false; nucleo.add(pt);
    }
    // anéis com marcações e arcos de painel
    const aneis = [];
    [[2.9, 72, .1, .33, .25, -.5], [3.35, 120, .07, .22, -.15, .3], [3.9, 48, .16, .4, .1, .15], [4.5, 90, .06, .2, .35, -.18]].forEach(([r, n, c0, c1, tx, vel]) => {
      const g = new THREE.Group(), seg = [];
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), l = i % 6 === 0 ? c1 : c0; seg.push(c * r, 0, s * r, c * (r + l), 0, s * (r + l)); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      g.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: .5 }, aditivo))));
      const circ = []; for (let i = 0; i <= 160; i++) circ.push(new THREE.Vector3(Math.cos(i / 160 * 6.2832) * r, 0, Math.sin(i / 160 * 6.2832) * r));
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circ), new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: .26 }, aditivo))));
      g.rotation.x = tx; g.userData.vel = vel; nucleo.add(g); aneis.push(g);
    });
    const arcos = [];
    if (!o.leve) [[3.1, .05, 2.2], [3.62, .035, 1.4], [4.2, .06, 2.9], [5.0, .03, 1.1]].forEach(([r, w, len], i) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r - w, r + w, 96, 1, 0, len), new THREE.MeshBasicMaterial(Object.assign({ color: i % 2 ? 0xffe0b8 : AMBAR, opacity: .55, side: THREE.DoubleSide }, aditivo)));
      m.rotation.x = -Math.PI / 2 + (i - 1.5) * .08; nucleo.add(m); arcos.push({ m, v: (i % 2 ? -1 : 1) * (.25 + i * .12) });
    });
    const sat = [];
    if (!o.leve) for (let i = 0; i < 9; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: T_GLOW, color: i % 3 ? 0xffc890 : 0xffffff, opacity: .95 }, aditivo))); s.scale.setScalar(.34); nucleo.add(s);
      sat.push({ s, r: [2.9, 3.35, 3.9, 4.5][i % 4], a: i * 1.3, v: (i % 2 ? -1 : 1) * (.25 + (i % 4) * .08), tx: [.25, -.15, .1, .35][i % 4] });
    }
    const onda = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: T_ANEL, color: QUENTE, opacity: 0 }, aditivo))); nucleo.add(onda);

    // ------------------------------------------------------------ fluxos de partículas, poeira e estrelas
    const fluxos = [], fluxoObjs = [];
    const uMouse = { value: new THREE.Vector3(999, 0, 999) }, uPush = { value: 0 };
    function criarFluxo(qtd, dir, cor, tam) {
      const seed = new Float32Array(qtd * 4), pos = new Float32Array(qtd * 3);
      for (let i = 0; i < qtd; i++) { seed[i * 4] = Math.random() * 6.2832; seed[i * 4 + 1] = (Math.random() - .5) * 1.1; seed[i * 4 + 2] = .6 + Math.random() * .8; seed[i * 4 + 3] = Math.random(); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
      const m = new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_FLUXO, fragmentShader: FRAG_FLUXO,
        uniforms: { uTime: { value: 0 }, uDir: { value: dir }, uSize: { value: tam }, uPix: pix, uColor: { value: new THREE.Color(cor) },
                    uR0: { value: 1.35 * ESC }, uR1: { value: (o.leve ? 10.5 : baixo ? 12 : 21) }, uPush: uPush, uRad: { value: o.leve ? 2.6 : 5 }, uMouse } }, aditivo));
      const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); fluxos.push(m); fluxoObjs.push(p);
    }
    criarFluxo(Math.max(150, Math.round(2000 * q)), 1, LARANJA, 2.3 * (FUNDO && !baixo ? 1.5 : 1));
    criarFluxo(Math.max(90, Math.round(1100 * q)), -1, 0xffc890, 2 * (FUNDO && !baixo ? 1.5 : 1));
    const estrelasUni = { uTime: { value: 0 }, uPix: pix };
    if (FUNDO) {
      const n = Math.round(1000 * q), pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        const r = 60 + Math.random() * 120, a = Math.random() * 6.2832, e = Math.asin(Math.random() * 2 - 1);
        pos[i * 3] = r * Math.cos(e) * Math.cos(a); pos[i * 3 + 1] = r * Math.sin(e); pos[i * 3 + 2] = r * Math.cos(e) * Math.sin(a);
        seed[i * 4] = Math.random(); seed[i * 4 + 1] = Math.random(); seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = Math.random();
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
      const est = new THREE.Points(g, new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_ESTRELA, fragmentShader: FRAG_ESTRELA, uniforms: estrelasUni }, aditivo))); est.frustumCulled = false; scene.add(est);
      scene.userData.estrelas = est;
    }

    // ------------------------------------------------------------ pulsos (dados reais) e rastro do cursor
    const MAXP = 64, CAUDA = 5;
    const pPos = new Float32Array(MAXP * CAUDA * 3), pCor = new Float32Array(MAXP * CAUDA * 3), pTam = new Float32Array(MAXP * CAUDA);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pCor, 3)); pg.setAttribute('size', new THREE.BufferAttribute(pTam, 1));
    const pulsosPts = new THREE.Points(pg, new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_PULSO, fragmentShader: FRAG_PULSO, uniforms: { uPix: pix } }, aditivo)));
    pulsosPts.frustumCulled = false; scene.add(pulsosPts);
    const pulsos = []; for (let i = 0; i < MAXP; i++) pulsos.push({ on: false, no: null, dir: 0, u: 0, v: 1, cor: new THREE.Color(), tam: 1 });
    const MAXR = o.leve ? 0 : 160;
    const rPos = new Float32Array(MAXR * 3), rCor = new Float32Array(MAXR * 3), rTam = new Float32Array(MAXR), rVida = new Float32Array(MAXR), rVel = new Float32Array(MAXR * 3);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rPos, 3)); rg.setAttribute('color', new THREE.BufferAttribute(rCor, 3)); rg.setAttribute('size', new THREE.BufferAttribute(rTam, 1));
    if (MAXR) { const rp = new THREE.Points(rg, new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_PULSO, fragmentShader: FRAG_PULSO, uniforms: { uPix: pix } }, aditivo))); rp.frustumCulled = false; scene.add(rp); }
    let rProx = 0;
    function faisca(p, n, vel) {
      for (let i = 0; i < n; i++) {
        const k = rProx++ % MAXR; rVida[k] = 1;
        rPos[k * 3] = p.x; rPos[k * 3 + 1] = p.y; rPos[k * 3 + 2] = p.z;
        rVel[k * 3] = (Math.random() - .5) * vel; rVel[k * 3 + 1] = (Math.random() - .5) * vel; rVel[k * 3 + 2] = (Math.random() - .5) * vel;
      }
    }

    // ------------------------------------------------------------ projetos em órbita
    const orbitas = new THREE.Group(); scene.add(orbitas);
    let nos = [], assinatura = '', selecionado = '', hoverNo = null;
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), VERMELHO = new THREE.Color(0xff4d5e);
    // fluxo contínuo de dados em cada ligação
    const NS = Math.max(14, Math.round(45 * q)), MAXS = 12 * NS;
    const sPos = new Float32Array(MAXS * 3), sCor = new Float32Array(MAXS * 3), sTam = new Float32Array(MAXS);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sCor, 3)); sg.setAttribute('size', new THREE.BufferAttribute(sTam, 1));
    const fluxoLigacao = new THREE.Points(sg, new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT_PULSO, fragmentShader: FRAG_PULSO, uniforms: { uPix: pix } }, aditivo)));
    fluxoLigacao.frustumCulled = false; scene.add(fluxoLigacao);

    function posOrbita(n, ang, out) {
      const x = Math.cos(ang) * n.r, z = Math.sin(ang) * n.r;
      const cx = Math.cos(n.tx), sx = Math.sin(n.tx), y1 = -z * sx, z1 = z * cx, cz = Math.cos(n.tz), sz = Math.sin(n.tz);
      return out.set(x * cz - y1 * sz, x * sz + y1 * cz, z1);
    }
    function limparNos() {
      nos.forEach(n => { orbitas.remove(n.grupo, n.link, n.vizinho, n.trilho); [n.grupo, n.link, n.vizinho, n.trilho].forEach(x => x.traverse && x.traverse(y => { if (y.geometry) y.geometry.dispose(); if (y.material) y.material.dispose(); })); n.pos.remove(); });
      nos = [];
    }
    function construirNos(projetos) {
      limparNos();
      const qtd = projetos.length;
      projetos.forEach((p, i) => {
        const n = { id: p.id, i, cliente: !!p.cliente, status: p.status, r: R_BASE + i * R_PASSO,
          tx: (i % 2 ? -1 : 1) * (.12 + (i % 3) * .1), tz: (i % 3 - 1) * .1, ang: i / qtd * 6.2832 + .6, vel: (i % 2 ? -1 : 1) * (.055 + (i % 4) * .012) * (o.leve ? 1 : .8),
          esc: { v: 1 }, hov: { v: 0 }, cor: new THREE.Color(COR[p.status] || COR.aguardando), corLink: new THREE.Color(AMBAR), taxa: 6,
          P0: new THREE.Vector3(), P1: new THREE.Vector3(), P2: new THREE.Vector3() };
        const g = new THREE.Group(), tam = (n.cliente ? .42 : .3) * (o.leve ? 1 : 1.5);
        n.malha = new THREE.Mesh(new THREE.OctahedronGeometry(tam), new THREE.MeshBasicMaterial({ color: n.cor, wireframe: true }));
        n.miolo = new THREE.Mesh(new THREE.OctahedronGeometry(tam * .5), new THREE.MeshBasicMaterial({ color: n.cor }));
        n.halo = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: T_GLOW, color: n.cor, opacity: .85 }, aditivo))); n.halo.scale.setScalar((n.cliente ? 2.6 : 1.9) * (o.leve ? 1 : 1.5));
        n.alvo = new THREE.Mesh(new THREE.SphereGeometry(tam * 2.2, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); n.alvo.userData.no = n;
        g.add(n.malha, n.miolo, n.halo, n.alvo); n.grupo = g; orbitas.add(g);
        const lg = new THREE.BufferGeometry(); n.linkPos = new Float32Array(37 * 3); lg.setAttribute('position', new THREE.BufferAttribute(n.linkPos, 3));
        n.link = new THREE.Line(lg, new THREE.LineBasicMaterial(Object.assign({ color: n.corLink, opacity: .62 }, aditivo))); n.link.frustumCulled = false; orbitas.add(n.link);
        const vg = new THREE.BufferGeometry(); n.vizPos = new Float32Array(17 * 3); vg.setAttribute('position', new THREE.BufferAttribute(n.vizPos, 3));
        n.vizinho = new THREE.Line(vg, new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: .24 }, aditivo))); n.vizinho.frustumCulled = false; orbitas.add(n.vizinho);
        const tr = []; for (let k = 0; k <= 96; k++) tr.push(posOrbita(n, k / 96 * 6.2832, new THREE.Vector3()));
        n.trilho = new THREE.Line(new THREE.BufferGeometry().setFromPoints(tr), new THREE.LineBasicMaterial(Object.assign({ color: AMBAR, opacity: .07 }, aditivo))); orbitas.add(n.trilho);
        n.fase = []; for (let k = 0; k < NS; k++) n.fase.push({ u: Math.random(), v: .12 + Math.random() * .22, dir: k % 2 ? 1 : -1 });
        const pos = document.createElement('div'); pos.className = 'mv-pos';
        const b = document.createElement('button'); b.type = 'button'; b.className = 'mv-rotulo';
        b.innerHTML = '<span class="mv-nome"><span class="mv-ic"></span><span class="mv-tx"></span></span><span class="mv-st"></span>';
        b.addEventListener('click', () => { if (o.aoSelecionar) o.aoSelecionar(n.id); });
        const subir = () => gsap.to(n.hov, { v: 1, duration: .25, overwrite: true }), descer = () => gsap.to(n.hov, { v: 0, duration: .4, overwrite: true });
        b.addEventListener('mouseenter', subir); b.addEventListener('mouseleave', descer); b.addEventListener('focus', subir); b.addEventListener('blur', descer);
        pos.appendChild(b); hud.appendChild(pos); n.pos = pos; n.btn = b;
        nos.push(n);
        if (!reduzido) gsap.from(n.esc, { v: 0, duration: 1, delay: .5 + i * .13, ease: 'back.out(1.5)' });
      });
    }
    function atualizarRotulo(n, p) {
      n.btn.dataset.st = p.status;
      n.btn.firstChild.firstChild.innerHTML = icone(p.id); n.btn.firstChild.lastChild.textContent = limpar(p.nome);
      n.btn.lastChild.textContent = ESTADO_TXT[p.status] || p.status;
      n.btn.setAttribute('aria-label', `${limpar(p.nome)}: ${ESTADO_TXT[p.status] || p.status}. ${o.dica || 'Abrir detalhes'}`);
      n.btn.classList.toggle('sel', p.id === selecionado);
      const m = /(\d+)\s*execu/i.exec(p.detalhe || '');
      n.taxa = (p.status === 'pausado' ? .6 : p.status === 'erro' ? 16 : p.status === 'atencao' ? 10 : 6) + (m ? Math.min(14, Number(m[1]) / 10) : 0);
    }

    // ------------------------------------------------------------ pulsos: disparo e chegada
    function disparar(n, dir, cor, vel, tam) {
      const p = pulsos.find(x => !x.on); if (!p || !n) return;
      p.on = true; p.no = n; p.dir = dir; p.u = 0; p.v = vel || (.5 + Math.random() * .25); p.tam = tam || 1; p.cor.set(cor);
    }
    function chegouNucleo(n) {
      if (reduzido) return;
      gsap.fromTo(plasma.scale, { x: 1.14, y: 1.14, z: 1.14 }, { x: 1, y: 1, z: 1, duration: .6, ease: 'power3.out', overwrite: true });
      gsap.fromTo(glowMat, { opacity: .8 }, { opacity: .4, duration: .8, ease: 'power2.out', overwrite: 'auto' });
      if (bloom) gsap.fromTo(bloom, { strength: .85 }, { strength: .5, duration: .8, ease: 'power2.out', overwrite: 'auto' });
      if (MAXR) faisca(tmp.set(0, 0, 0).applyMatrix4(nucleo.matrixWorld), 5, 3.2);
      if (Math.random() < .6) disparar(n, 1, 0xffe3bd, .6, .85);
    }
    function chegouNo(n) { if (!reduzido) gsap.fromTo(n.esc, { v: 1.45 }, { v: 1, duration: .6, ease: 'power3.out', overwrite: true }); }
    function varredura() {
      if (reduzido) return;
      gsap.fromTo(onda.scale, { x: 2, y: 2 }, { x: 22, y: 22, duration: 2, ease: 'power2.out', overwrite: true });
      gsap.fromTo(onda.material, { opacity: .85 }, { opacity: 0, duration: 2, ease: 'power2.out', overwrite: true });
      nos.forEach((n, i) => gsap.delayedCall(.15 + i * .14, () => disparar(n, 1, n.cor.getHex(), .75, 1.5)));
    }

    // ------------------------------------------------------------ quadro a quadro
    let t = 0, ultimo = 0, acum = 0, ativo = true, w = 0, h = 0, rodando = false, lentos = 0, quadros = 0, nivel = 0, limite30 = false;
    const hov = n => n.hov.v;
    const qMundo = new THREE.Quaternion();
    function bezier(n, u, out) {
      const a = 1 - u; return out.set(a * a * n.P0.x + 2 * a * u * n.P1.x + u * u * n.P2.x, a * a * n.P0.y + 2 * a * u * n.P1.y + u * u * n.P2.y, a * a * n.P0.z + 2 * a * u * n.P1.z + u * u * n.P2.z);
    }
    function pontoMouse() {            // raio do cursor: ponto no plano do chão (fluxos) e no plano de frente para a câmera (núcleo/rastro)
      ray.setFromCamera({ x: ptr.mx, y: ptr.my }, camera);
      if (!ray.ray.intersectPlane(plano, mundo)) mundo.set(999, 0, 999);
      camera.getWorldDirection(tmp); planoCam.setFromNormalAndCoplanarPoint(tmp, tmp2.set(0, 0, 0));
      if (!ray.ray.intersectPlane(planoCam, mundoCam)) mundoCam.set(0, 0, 0);
    }
    function quadro() {
      const agora = performance.now(), dt = Math.min(.05, (agora - ultimo) / 1000); ultimo = agora;
      if (!ativo || !el.isConnected || !w) return;
      acum += dt; if ((baixo || limite30) && !reduzido && acum < 1 / 30) return; const d = acum; acum = 0;
      // se a máquina não dá conta, abre mão do que custa mais, em etapas: bloom, resolução, metade das partículas, 30 quadros/s
      if (!reduzido && ++quadros > 20) {
        if (d > .03) lentos++; else lentos = Math.max(0, lentos - 1);
        if (lentos > 36) {
          lentos = 0; nivel++;
          if (nivel === 1 && comp) comp = null;
          else if (nivel <= 2) { renderer.setPixelRatio(1); pix.value = 1; renderer.setSize(w, h, false); }
          else if (nivel === 3) fluxoObjs.forEach(f => f.geometry.setDrawRange(0, Math.floor(f.geometry.attributes.position.count * .4)));
          else limite30 = true;
        }
      }
      const vel = reduzido ? 0 : 1; t += d * vel;
      const s = giro.v;
      fluxos.forEach(m => { m.uniforms.uTime.value = t; });
      plasmaMat.uniforms.uTime.value = t; cascaUni.uTime.value = t; estrelasUni.uTime.value = t;
      if (scene.userData.estrelas) scene.userData.estrelas.rotation.y += d * .004 * vel;
      glowMat.color.setRGB(tinta.r, tinta.g, tinta.b);
      // cursor: o núcleo olha para ele, abaulado e inclinado
      if (ptr.dentro || ptr.presenca.v > .01) {
        pontoMouse(); uMouse.value.copy(mundo);
        const alcance = ESC * 2.4; tmp.copy(mundoCam).clampLength(0, alcance).multiplyScalar(1 / (ESC * 1.5)); tmp2.copy(camera.position).normalize();
        mDirAlvo.copy(tmp2).add(tmp); nucleo.getWorldQuaternion(qMundo); mDirAlvo.normalize().applyQuaternion(qMundo.invert());
        mDir.lerp(mDirAlvo, 1 - Math.exp(-d * 7)).normalize();
      }
      uPush.value = ptr.presenca.v * (FUNDO ? 1 : .6);
      plasmaMat.uniforms.uBulge.value = ptr.presenca.v * (.45 + ptr.hoverNucleo.v * .75);
      tilt.rotation.y = inclina.y; tilt.rotation.x = inclina.x;
      nucleo.scale.setScalar(ESC * (1 + ptr.hoverNucleo.v * .07));
      malha.rotation.y += d * .1 * vel * s; malha.rotation.x = Math.sin(t * .15) * .2;
      casca.rotation.y -= d * .05 * vel; casca.rotation.z += d * .03 * vel;
      aneis.forEach(a => { a.rotation.y += d * a.userData.vel * vel * s; });
      arcos.forEach(a => { a.m.rotation.z += d * a.v * vel * s; });
      sat.forEach(x => { x.a += d * x.v * vel * s; const cx = Math.cos(x.tx), sx = Math.sin(x.tx), px = Math.cos(x.a) * x.r, pz = Math.sin(x.a) * x.r; x.s.position.set(px, -pz * sx, pz * cx); x.s.material.opacity = .6 + .4 * Math.sin(t * 3 + x.a * 5); });
      poliA.rotation.x += d * .5 * vel * s; poliA.rotation.y += d * .35 * vel * s; poliB.rotation.y -= d * .8 * vel * s; poliB.rotation.z += d * .4 * vel * s; poliC.rotation.x -= d * .22 * vel; poliC.rotation.z += d * .3 * vel * s;
      interior.userData.raios.material.opacity = .12 + .1 * Math.sin(t * 2.2) + ptr.presenca.v * .1;
      semente.rotation.y += d * 1.4 * vel; semente.scale.setScalar(1 + Math.sin(t * 3) * .1 + ptr.hoverNucleo.v * .25); semGlow.material.opacity = .8 + Math.sin(t * 2.4) * .15;
      gAneis.forEach(x => { x.a += d * x.v * vel * s; x.bola.position.set(Math.cos(x.a) * x.r, 0, Math.sin(x.a) * x.r); x.g.rotation.y += d * .15 * vel * x.v; });
      camera.position.set(cam.x + off.x, cam.y + off.y, cam.z - chute.v * 1.6); camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      nos.forEach((n, i) => {
        n.ang += d * n.vel * vel;
        posOrbita(n, n.ang, n.P0);
        n.grupo.position.copy(n.P0);
        const esc = n.esc.v * (1 + hov(n) * .35) * (n.id === selecionado ? 1.25 : 1); n.grupo.scale.setScalar(Math.max(.001, esc));
        n.malha.rotation.y += d * .8 * vel; n.malha.rotation.x += d * .5 * vel; n.miolo.rotation.y -= d * vel;
        n.P2.copy(n.P0).normalize().multiplyScalar(1.3 * ESC);
        tmp.copy(n.P0).add(n.P2).multiplyScalar(.5);
        tmp2.set(n.P0.z, 0, -n.P0.x).normalize().multiplyScalar(1.1 * ESC * .8);
        n.P1.copy(tmp).add(tmp2); n.P1.y += (1.2 + (i % 2 ? .6 : -.2)) * ESC * .8;
        for (let k = 0; k <= 36; k++) { bezier(n, k / 36, tmp); n.linkPos[k * 3] = tmp.x; n.linkPos[k * 3 + 1] = tmp.y; n.linkPos[k * 3 + 2] = tmp.z; }
        n.link.geometry.attributes.position.needsUpdate = true;
        const viz = nos[(i + 1) % nos.length];
        for (let k = 0; k <= 16; k++) { const u = k / 16; tmp.copy(n.P0).lerp(viz.P0, u); const c = Math.sin(u * Math.PI) * .22; tmp.lerp(tmp2.set(0, 0, 0), c); n.vizPos[k * 3] = tmp.x; n.vizPos[k * 3 + 1] = tmp.y; n.vizPos[k * 3 + 2] = tmp.z; }
        n.vizinho.geometry.attributes.position.needsUpdate = true;
        const sel = n.id === selecionado;
        n.link.material.opacity = .62 + hov(n) * .38 + (sel ? .3 : 0);
        n.link.material.color.copy(n.status === 'erro' ? VERMELHO : n.corLink);
        n.malha.material.color.copy(n.cor); n.miolo.material.color.copy(n.cor); n.halo.material.color.copy(n.cor);
        // fluxo contínuo na ligação: entra (âmbar) e sai (branco quente); mais rápido com mais atividade
        const ritmo = (.6 + Math.min(2.2, n.taxa / 8)) * (1 + hov(n) * 1.2);
        for (let k = 0; k < NS; k++) {
          const f = n.fase[k], idx = i * NS + k; f.u += f.v * ritmo * d * vel; if (f.u > 1) f.u -= 1;
          bezier(n, f.dir > 0 ? f.u : 1 - f.u, tmp);
          sPos[idx * 3] = tmp.x; sPos[idx * 3 + 1] = tmp.y; sPos[idx * 3 + 2] = tmp.z;
          const e = Math.sin(f.u * Math.PI), c = f.dir > 0 ? [1, .55, .22] : [1, .88, .7];
          sCor[idx * 3] = c[0] * e; sCor[idx * 3 + 1] = c[1] * e; sCor[idx * 3 + 2] = c[2] * e; sTam[idx] = (1.5 + hov(n) * 1.5) * (o.leve ? 1 : 1.5);
        }
        if (!reduzido && Math.random() < n.taxa * d / 60) disparar(n, 0, n.status === 'erro' ? 0xff6a7a : 0xffb15c, .5 + Math.random() * .3, .9);
        tmp.copy(n.P0).project(camera);
        const visivel = tmp.z < 1, x = (tmp.x * .5 + .5) * w, y = (-tmp.y * .5 + .5) * h;
        const dentro = Math.min(1, Math.max(.3, 1.1 - (tmp.z - .93) * 9));
        const topoL = FUNDO ? Math.round(Math.min(320, h * .33)) : 6, botL = FUNDO ? 130 : 50;      // no PC, os rótulos não entram sob os números do topo nem sob a dock
        const lw = n.pos.offsetWidth || 120, lado = x + 14 + lw > w - 8 ? -(lw + 14) : 14;
        n.pos.style.transform = `translate3d(${Math.max(6, Math.min(w - lw - 6, x + lado)).toFixed(1)}px,${Math.max(topoL, Math.min(h - botL, y - 18)).toFixed(1)}px,0)`;
        n.pos.style.opacity = visivel ? String((.55 + .45 * dentro) * (FUNDO ? Math.max(0, 1 - (Number(el.style.getPropertyValue('--mv-p')) || 0) * 1.5) : 1)) : '0';
        n.pos.style.zIndex = String(Math.round((1 - tmp.z) * 1000));
        n.halo.material.opacity = .65 + Math.sin(t * 2 + i) * .15 + hov(n) * .3;
      });
      sg.attributes.position.needsUpdate = sg.attributes.color.needsUpdate = sg.attributes.size.needsUpdate = true;
      // pulsos viajando
      let k = 0;
      pulsos.forEach(p => {
        if (p.on) { p.u += p.v * d; if (p.u >= 1) { p.on = false; if (p.dir === 0) chegouNucleo(p.no); else chegouNo(p.no); } }
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
      // rastro do cursor: faíscas que ficam para trás e se dissolvem
      if (MAXR) {
        if (ptr.dentro && ptr.vel > .004) { const n = Math.min(4, 1 + Math.round(ptr.vel * 60)); faisca(tmp.copy(mundoCam).addScaledVector(camera.getWorldDirection(tmp2), (Math.random() - .5) * 3), n, 1.6 * (1 + ptr.vel * 20)); }
        ptr.vel *= .86;
        for (let j = 0; j < MAXR; j++) {
          if (rVida[j] <= 0) { rTam[j] = 0; continue; }
          rVida[j] -= d * 1.1;
          rPos[j * 3] += rVel[j * 3] * d; rPos[j * 3 + 1] += rVel[j * 3 + 1] * d; rPos[j * 3 + 2] += rVel[j * 3 + 2] * d;
          rVel[j * 3] *= .96; rVel[j * 3 + 1] *= .96; rVel[j * 3 + 2] *= .96;
          const v = Math.max(0, rVida[j]);
          rCor[j * 3] = v; rCor[j * 3 + 1] = v * .72; rCor[j * 3 + 2] = v * .4; rTam[j] = 4.4 * v;
        }
        rg.attributes.position.needsUpdate = rg.attributes.color.needsUpdate = rg.attributes.size.needsUpdate = true;
      }
      if (comp) comp.render(); else renderer.render(scene, camera);
    }
    function ligar() { if (rodando) return; rodando = true; ultimo = performance.now(); gsap.ticker.add(quadro); }
    function desligar() { if (!rodando) return; rodando = false; gsap.ticker.remove(quadro); }

    function redimensionar() {
      const r = el.getBoundingClientRect(); if (r.width < 10 || r.height < 10) { w = 0; return; }
      w = r.width; h = r.height; renderer.setSize(w, h, false); if (comp) { comp.setPixelRatio(renderer.getPixelRatio()); comp.setSize(w, h); }
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const tg = Math.tan(20 * Math.PI / 180);
      cam.z = o.leve ? Math.min(36, Math.max(15, 9.4 / (tg * camera.aspect))) : Math.max(baixo ? 20 : 24, (baixo ? 12 : 18.5) / (tg * camera.aspect), (baixo ? 0 : 8.8) / tg);
      cam.y = cam.z * (o.leve ? .4 : .34);
      if (reduzido) estatico();
    }
    const ro = new ResizeObserver(redimensionar); ro.observe(el);
    let visivel = true, parado = false, pausado = false;
    const revisar = () => { ativo = visivel && !parado && !pausado && !document.hidden && el.isConnected; ativo ? ligar() : desligar(); };
    const io = new IntersectionObserver(es => { visivel = es[0].isIntersecting; revisar(); }); io.observe(el);
    document.addEventListener('visibilitychange', revisar);

    // ------------------------------------------------------------ interação: o cursor mexe no núcleo, nos fluxos e nos nós
    const ox = gsap.quickTo(off, 'x', { duration: 1.4, ease: 'power3.out' }), oy = gsap.quickTo(off, 'y', { duration: 1.4, ease: 'power3.out' });
    const ix = gsap.quickTo(inclina, 'x', { duration: 1.1, ease: 'power3.out' }), iy = gsap.quickTo(inclina, 'y', { duration: 1.1, ease: 'power3.out' });
    const alvoNo = e => {
      ray.setFromCamera({ x: ptr.mx, y: ptr.my }, camera);
      const hit = ray.intersectObjects(nos.map(n => n.alvo), false)[0]; return hit ? hit.object.userData.no : null;
    };
    const noEl = e => e.target instanceof Node && (e.target === el || el.contains(e.target));
    function mover(e) {
      if (parado || (baixo && !FUNDO)) return;
      const r = el.getBoundingClientRect(); if (!r.width) return;
      const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
      ptr.vel = Math.min(.05, Math.hypot(nx * 2 - 1 - ptr.mx, -(ny * 2 - 1) - ptr.my) * .5 + ptr.vel * .3);
      ptr.mx = nx * 2 - 1; ptr.my = -(ny * 2 - 1);
      const dentro = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;
      if (dentro !== ptr.dentro) { ptr.dentro = dentro; gsap.to(ptr.presenca, { v: dentro ? 1 : 0, duration: .7, overwrite: true }); if (!dentro) { ox(0); oy(0); ix(0); iy(0); } }
      if (!dentro) return;
      ox(-ptr.mx * (FUNDO ? 3.4 : 2.4)); oy(-ptr.my * 1.8); iy(ptr.mx * .7); ix(-ptr.my * .45);
      // o cursor está sobre o núcleo?
      tmp.set(0, 0, 0).project(camera); const rr = (Math.tan(20 * Math.PI / 180) > 0) ? (ESC * 1.6) / (cam.z * Math.tan(20 * Math.PI / 180)) : .2;
      const perto = Math.hypot((ptr.mx - tmp.x) * camera.aspect, ptr.my - tmp.y) < rr;
      if (perto !== (ptr.hoverNucleo.alvo || false)) { ptr.hoverNucleo.alvo = perto; gsap.to(ptr.hoverNucleo, { v: perto ? 1 : 0, duration: .6, ease: 'power3.out', overwrite: true }); gsap.to(giro, { v: perto ? 3.2 : 1, duration: .9, ease: 'power2.out', overwrite: true }); if (bloom) gsap.to(bloom, { strength: perto ? .75 : .5, duration: .6, overwrite: 'auto' }); }
      if (noEl(e)) {
        const n = alvoNo(e);
        if (n !== hoverNo) { if (hoverNo) gsap.to(hoverNo.hov, { v: 0, duration: .4, overwrite: true }); hoverNo = n; if (n) gsap.to(n.hov, { v: 1, duration: .25, overwrite: true }); el.style.cursor = n ? 'pointer' : ''; }
      } else if (hoverNo) { gsap.to(hoverNo.hov, { v: 0, duration: .4, overwrite: true }); hoverNo = null; el.style.cursor = ''; }
    }
    function clicar(e) {
      if (parado || !noEl(e) || e.target.closest('button')) return;
      ptr.mx = (e.clientX / innerWidth) * 2 - 1; ptr.my = -(e.clientY / innerHeight) * 2 + 1;
      const n = alvoNo(e);
      if (n) { if (o.aoSelecionar) o.aoSelecionar(n.id); return; }
    }
    if (FUNDO) { window.addEventListener('pointermove', mover, { passive: true }); window.addEventListener('pointerdown', clicar); document.documentElement.addEventListener('pointerleave', () => { ptr.dentro = false; gsap.to(ptr.presenca, { v: 0, duration: .7, overwrite: true }); }); }
    else if (!baixo) { el.addEventListener('pointermove', mover, { passive: true }); el.addEventListener('pointerleave', () => { ptr.dentro = false; gsap.to(ptr.presenca, { v: 0, duration: .7, overwrite: true }); ox(0); oy(0); ix(0); iy(0); }); el.addEventListener('pointerdown', clicar); }
    if (!reduzido) gsap.from(cam, { z: cam.z + 14, y: cam.y + 6, duration: 2.6, ease: 'power3.out', immediateRender: false, delay: .05 });

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
      const e = info.estado || 'ok', tt = TINTA_NUCLEO[e] || TINTA_NUCLEO.ok;
      gsap.to(tinta, { r: tt[0], g: tt[1], b: tt[2], duration: 1, onUpdate: () => tintaVetor.set(tinta.r, tinta.g, tinta.b) });
      nucleoRot.dataset.st = e; nucleoRot.lastChild.textContent = info.titulo || '';
      if (reduzido) estatico(); else revisar();
    }
    function estatico() { acum = 1; quadro(); }
    function selecionar(id) { selecionado = id || ''; nos.forEach(n => n.btn.classList.toggle('sel', n.id === selecionado)); if (reduzido) estatico(); }
    function modo(m) { el.dataset.modo = m; parado = m === 'fundo'; if (!parado) { revisar(); if (reduzido) setTimeout(estatico, 60); } else revisar(); }
    function rolagem(p) { p = Math.max(0, Math.min(1, p)); el.style.setProperty('--mv-p', p.toFixed(3)); el.style.pointerEvents = p > .5 || el.dataset.modo === 'fundo' ? 'none' : ''; }
    function destruir() { desligar(); ro.disconnect(); io.disconnect(); limparNos(); renderer.dispose(); el.remove(); }
    redimensionar();
    return { el, depurar: () => ({ nos, camera, w, h, comp: !!comp, rodando, ativo, parado }), atualizar, varredura, selecionar, destruir, modo, rolagem, pausar: p => { pausado = !!p; revisar(); } };
  }
  window.MapaVivo = { montar, logo, marca, icone, limpar };
})();
