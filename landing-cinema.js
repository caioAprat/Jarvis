'use strict';
/**
 * JARVÃO · landing — câmera do núcleo (usado pelo roteiro de 10 cenas em landing-roteiro.js).
 *
 * Função pura: dado um progresso 0→1 do roteiro inteiro, devolve/aplica distância, altura,
 * FOV, giro, congelamento e distorção da cena (MapaVivo.cinema/congelar/passe). Quem decide
 * QUANDO cada cena acontece é landing-roteiro.js; aqui só mora COMO a câmera se move.
 *
 * Tabela progresso → câmera / FOV / efeito (chaves da cena 4 "Travessia" até a 9 "Fecho";
 * nas cenas 0-3 a câmera fica no plano geral, ver landing-roteiro.js)
 *
 *  progr. | dist. (× cam.z) | altura (× dist.) | FOV | giro  | efeito
 *  -------|-----------------|-------------------|-----|-------|---------------------------------------
 *  0.00   | 1.00  plano geral        | .34     | 40° | 0.00  | cenas 0-3: saudação, métricas, projetos
 *  0.38   | 0.78  travessia começa   | .28     | 39° | 0.05  | zoom rápido (Sgrappa) começa
 *  0.48   | 0.46  CONGELA (virada)   | .24     | 36° | 0.08  | peças param no ar; distorção sobe
 *  0.53   | 0.46  parado             | .24     | 36° | 0.15  | distorção no máximo (só a câmera gira)
 *  0.58   | 0.46  descongela         | .24     | 36° | 0.22  | distorção zerada; anatomia começa
 *  0.88   | 0.42  reagrupando        | .18     | 32° | 0.24  | fecho: núcleo volta a se juntar
 *  1.00   | 0.50  plano geral final  | .20     | 33° | 0.26  | dock/Buscar/Conferir tudo em destaque
 *
 * Não guarda dados nem chaves. Sem build: carregado por <script> em index.html.
 */
(function () {
  //            p     dist  alt   fov  giro  gelo  dist(orção)
  const CHAVES = [
    { p: 0,    d: 1,    a: .34, f: 40, o: 0,   g: 0, x: 0 },
    { p: .38,  d: .78,  a: .28, f: 39, o: .05, g: 0, x: 0 },
    { p: .48,  d: .46,  a: .24, f: 36, o: .08, g: 1, x: 0 },
    { p: .53,  d: .46,  a: .24, f: 36, o: .15, g: 1, x: 1 },
    { p: .58,  d: .46,  a: .24, f: 36, o: .22, g: 1, x: 0 },
    { p: .88,  d: .42,  a: .18, f: 32, o: .24, g: 0, x: 0 },
    { p: 1,    d: .50,  a: .20, f: 33, o: .26, g: 0, x: 0 },
  ];

  /** Distorção + aberração cromática quente (técnica Igloo). O azul nunca passa do verde: sem franja fria nem arco-íris. */
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

  function interp(p, K) {
    K = K || CHAVES;
    let i = 1; while (i < K.length - 1 && K[i].p < p) i++;
    const A = K[i - 1], B = K[i], u = B.p === A.p ? 0 : Math.max(0, Math.min(1, (p - A.p) / (B.p - A.p)));
    const m = (k) => A[k] + (B[k] - A[k]) * u;
    const n = (k) => (A[k] || 0) + ((B[k] || 0) - (A[k] || 0)) * u;
    return { d: m('d'), a: m('a'), f: m('f'), o: m('o'), g: m('g'), x: m('x'), cx: n('cx'), cy: n('cy'), cz: n('cz') };
  }

  /** `mapa`: instância de MapaVivo.montar(). `reduzido`: prefers-reduced-motion (câmera fixa na cena 0). `chaves`: tabela própria (opcional). */
  function criar(mapa, reduzido, chaves) {
    let K = chaves || CHAVES;
    // 390 px: a tela é alta e estreita, então a cena já nasce longe (cam.z do mapa-vivo). Aproxima tudo.
    const fator = innerWidth < 700 ? .62 : 1;
    let passe = null;
    if (mapa && mapa.passe && !reduzido) passe = mapa.passe(DISTORCAO);

    function aplicar(p) {
      const v = interp(reduzido ? 0 : p, K);
      if (!mapa) return;
      mapa.cinema({ dist: v.d * fator, alt: v.a, fov: v.f, orbita: v.o });
      mapa.congelar(v.g);
      if (passe) passe.uniforms.uForca.value = v.x;
    }
    aplicar(0);
    return { aplicar, passe: () => passe, trocar: (k) => { K = k || CHAVES; }, chaves: () => K, interp: (p) => interp(p, K), fator };
  }

  window.LandingCinema = { criar, CHAVES, interp };
})();
