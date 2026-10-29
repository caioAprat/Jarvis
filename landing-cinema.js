'use strict';
/**
 * JARVÃO · landing, Seção 1 — a rolagem conduz a câmera.
 *
 * Um único progresso 0→1 (ScrollTrigger com scrub sobre o hero) alimenta:
 *   - a câmera da cena (distância, altura, FOV, giro) por MapaVivo.cinema
 *   - as peças congeladas no ar (MapaVivo.congelar)
 *   - a distorção com aberração cromática quente (ShaderPass por MapaVivo.passe)
 *   - as camadas da página, por variáveis CSS --p (progresso) e --pb (bloco final)
 *
 * Tabela progresso → câmera / FOV / efeito  (CHAVES, abaixo; interpolação linear)
 *
 *  progr. | dist. (× cam.z) | altura (× dist.) | FOV | giro  | efeito
 *  -------|-----------------|------------------|-----|-------|---------------------------------------
 *  0.00   | 1.00  plano geral       | .34     | 40° | 0.00  | cena nítida, 7 projetos com rótulo
 *  0.15   | 0.92  aproximando       | .33     | 40° | 0.02  | camadas se descolam (parallax)
 *  0.35   | 0.78  perto dos planetas| .28     | 39° | 0.05  | rótulos já sumiram, planetas grandes
 *  0.45   | 0.66  CONGELA           | .24     | 36° | 0.08  | peças param no ar, entre as órbitas
 *  0.53   | 0.66  parado            | .24     | 36° | 0.15  | distorção no máximo (só a câmera gira)
 *  0.62   | 0.66  descongela        | .24     | 36° | 0.22  | distorção zerada, métricas nítidas
 *  0.75   | 0.42  atravessa a órbita| .14     | 31° | 0.24  | planetas passam pela câmera
 *  1.00   | 0.20  perto do núcleo   | .06     | 27° | 0.26  | plasma domina, véu e métricas à frente
 *
 * Não guarda dados nem chaves. Sem build: carregado por <script> em landing.html.
 */
(function () {
  //            p     dist  alt   fov  giro  gelo  dist(orção)
  const CHAVES = [
    { p: 0,    d: 1,    a: .34, f: 40, o: 0,   g: 0, x: 0 },
    { p: .15,  d: .92,  a: .33, f: 40, o: .02, g: 0, x: 0 },
    { p: .35,  d: .78,  a: .28, f: 39, o: .05, g: 0, x: 0 },
    { p: .45,  d: .66,  a: .24, f: 36, o: .08, g: 1, x: 0 },
    { p: .53,  d: .66,  a: .24, f: 36, o: .15, g: 1, x: 1 },
    { p: .62,  d: .66,  a: .24, f: 36, o: .22, g: 1, x: 0 },
    { p: .75,  d: .60,  a: .20, f: 33, o: .24, g: 0, x: 0 },
    { p: 1,    d: .46,  a: .16, f: 31, o: .26, g: 0, x: 0 },
  ];

  /** Distorção + aberração cromática quente. O azul nunca passa do verde: sem franja fria nem arco-íris. */
  const DISTORCAO = {
    uniforms: { tDiffuse: { value: null }, uForca: { value: 0 } },
    vertexShader: [
      'varying vec2 vUv;',
      'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float uForca; varying vec2 vUv;',
      'void main() {',
      '  vec2 c = vUv - 0.5; float r = length(c);',
      '  vec2 dir = r > 0.0001 ? c / r : vec2(0.0);',
      '  vec2 uv = c * (1.0 + uForca * (0.075 * r * r - 0.014)) + 0.5;',
      '  float a = uForca * 0.002 * (0.35 + r);',          // ~2,3 px no máximo a 1366 px
      '  vec3 base = texture2D(tDiffuse, uv).rgb;',
      '  float cr = texture2D(tDiffuse, uv + dir * a).r;',
      '  float cb = texture2D(tDiffuse, uv - dir * a * 0.6).b;',
      '  vec3 quente = vec3(cr, base.g, min(cb, base.g * 1.05 + 0.02));',
      '  gl_FragColor = vec4(mix(base, quente, clamp(uForca, 0.0, 1.0)), 1.0);',
      '}',
    ].join('\n'),
  };

  function interp(p) {
    let i = 1; while (i < CHAVES.length - 1 && CHAVES[i].p < p) i++;
    const A = CHAVES[i - 1], B = CHAVES[i], u = B.p === A.p ? 0 : Math.max(0, Math.min(1, (p - A.p) / (B.p - A.p)));
    const m = (k) => A[k] + (B[k] - A[k]) * u;
    return { d: m('d'), a: m('a'), f: m('f'), o: m('o'), g: m('g'), x: m('x') };
  }

  function montar(op) {
    const mapa = op.mapa, raiz = document.documentElement;
    // 390 px: a tela é alta e estreita, então a cena já nasce longe (cam.z do mapa-vivo). Aproxima tudo.
    const fator = innerWidth < 700 ? .62 : 1;
    const fim = (v) => raiz.style.setProperty('--pb', v.toFixed(3));
    const põe = (v) => raiz.style.setProperty('--p', v.toFixed(4));

    // bloco final (véu, métricas, caixa de vidro): entra de 0,60 a 0,95
    const banda = (p) => Math.max(0, Math.min(1, (p - .6) / .35));

    function aplicar(p) {
      const v = interp(p);
      põe(p); fim(banda(p));
      raiz.style.setProperty('--lp', p.toFixed(3));
      if (mapa) {
        mapa.cinema({ dist: v.d * fator, alt: v.a, fov: v.f, orbita: v.o });
        mapa.congelar(v.g);
        if (passe) passe.uniforms.uForca.value = v.x;
        if (mapa.el) {
          mapa.el.toggleAttribute('data-lp-alto', p > .3);
          // no fim, a cena recua um pouco (o mesmo --mv-p da rolagem) para as métricas ficarem nítidas sobre o véu
          mapa.el.style.setProperty('--mv-p', (Math.max(0, Math.min(1, (p - .72) / .28)) * .46).toFixed(3));
        }
      }
    }

    let passe = null;

    if (op.reduzido) {                       // estado estático legível: nada de câmera animada, distorção ou pin
      põe(0); fim(1); raiz.style.setProperty('--lp', '0');
      if (mapa) { mapa.cinema({ dist: fator, alt: .34, fov: 40, orbita: 0 }); mapa.congelar(0); }
      return { aplicar: () => {}, progresso: () => 0 };
    }

    if (mapa && mapa.passe) passe = mapa.passe(DISTORCAO);

    // suavização própria: a rolagem define o alvo, um laço leve persegue (scrub macio sem engasgo)
    const alvo = { p: 0 }, atual = { p: 0 };
    let girando = false;
    function laço() {
      const d = alvo.p - atual.p;
      atual.p += d * .14;
      if (Math.abs(d) < .0004) { atual.p = alvo.p; girando = false; aplicar(atual.p); return; }
      aplicar(atual.p); requestAnimationFrame(laço);
    }
    const acordar = () => { if (!girando) { girando = true; requestAnimationFrame(laço); } };

    if (window.ScrollTrigger && window.gsap) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.create({
        trigger: op.hero, start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: (self) => { alvo.p = self.progress; acordar(); },
        onRefresh: (self) => { alvo.p = self.progress; acordar(); },
      });
    } else {                                 // sem ScrollTrigger: conta na mão
      const medir = () => {
        const r = op.hero.getBoundingClientRect(), total = op.hero.offsetHeight - innerHeight;
        alvo.p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0; acordar();
      };
      addEventListener('scroll', medir, { passive: true }); addEventListener('resize', medir); medir();
    }
    aplicar(0);
    return { aplicar, progresso: () => atual.p, chaves: CHAVES, interp, passe: () => passe, fator };
  }

  window.LandingCinema = { montar, CHAVES, interp };
})();
