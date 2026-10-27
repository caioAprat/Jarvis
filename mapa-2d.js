'use strict';
// Identidade preservada; cenário de sprites controlado por um único relógio.
(function () {
  const ESTADO_TXT = { ok: 'no ar', atencao: 'atenção', erro: 'problema', pausado: 'pausado', config: 'configurar', aguardando: 'aguardando' };
  const COR = { ok: 0x7bf0b4, atencao: 0xffc247, erro: 0xff4d5e, pausado: 0x7a6e60, config: 0x9a8c7a, aguardando: 0xc4a06a };
  const AMBAR = 0xff8a3d, LARANJA = 0xff5a1f, QUENTE = 0xffe0b8, BRANCO_QUENTE = 0xfff1dc;


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
  /** Emblema da marca (globo geodésico + núcleo que bate + órbita com satélite). O tamanho vem do font-size do pai. Fonte do desenho: scripts/marca/marca.cjs. */
  function logo(extra) {
    return `<svg class="mk ${extra || ''}" viewBox="0 0 64 64" aria-hidden="true"><defs>
      <radialGradient id="mkc"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#ffe3b4"/><stop offset="1" stop-color="#ff7a26"/></radialGradient>
      <radialGradient id="mkg"><stop offset="0" stop-color="#ff9a45" stop-opacity=".5"/><stop offset="1" stop-color="#ff6a1a" stop-opacity=".05"/></radialGradient>
      <linearGradient id="mka" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3df"/><stop offset=".45" stop-color="#ffb36a"/><stop offset="1" stop-color="#ff6a1a"/></linearGradient></defs>
      <circle cx="32" cy="32" r="29.6" fill="none" stroke="#ffb36a" stroke-opacity=".32" stroke-width=".5" stroke-dasharray=".3 1.9" stroke-linecap="round"/>
      <g transform="translate(32 32) rotate(-28)"><path d="M-27.3 0A27.3 9.3 0 0 1 27.3 0" fill="none" stroke="url(#mka)" stroke-width="1.1" stroke-linecap="round" stroke-opacity=".55"/></g>
      <circle cx="32" cy="32" r="16.8" fill="url(#mkg)"/>
      <g fill="none" stroke="url(#mka)" stroke-width=".85" stroke-linecap="round"><circle cx="32" cy="32" r="16.8"/><ellipse cx="32" cy="32" rx="16.8" ry="4.8"/><ellipse cx="32" cy="23" rx="14" ry="3.8"/><ellipse cx="32" cy="41" rx="14" ry="3.8"/><ellipse cx="32" cy="32" rx="6.3" ry="16.8"/><ellipse cx="32" cy="32" rx="12.5" ry="16.8" stroke-opacity=".8"/><path d="M32 15.4V48.6" stroke-opacity=".7"/></g>
      <g class="mk-core"><circle cx="32" cy="32" r="9.2" fill="url(#mkc)" fill-opacity=".85"/><circle cx="32" cy="32" r="3" fill="#fff"/></g>
      <g transform="translate(32 32) rotate(-28)"><path d="M27.3 0A27.3 9.3 0 0 1 -27.3 0" fill="none" stroke="url(#mka)" stroke-width="1.3" stroke-linecap="round"/><circle class="mk-sat" r="1.9" fill="#fff"/></g></svg>`;
  }
  /** Logotipo JARVÃO desenhado em traço contínuo (o "O" carrega o núcleo). Mesmo desenho de icons/jarvao-logotipo.svg. */
  let wmN = 0;
  function marca() {
    const id = 'wm' + (++wmN);
    return `<svg class="wm-svg" viewBox="-6 -5 316 75" role="img" aria-label="Jarvão"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6e6"/><stop offset=".5" stop-color="#ffcf9a"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient><radialGradient id="${id}c"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffd9a8"/><stop offset="1" stop-color="#ff7a26"/></radialGradient></defs><g fill="none" stroke="url(#${id}g)" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M31 16V45a14 14 0 0 1-14 14h-1a12 12 0 0 1-10-5"/><path transform="translate(52 0)" d="M4 62 20 16 36 62M10.5 45h19"/><path transform="translate(104 0)" d="M7 62V16h14a13 13 0 0 1 0 26H7M21 42l13 20"/><path transform="translate(156 0)" d="M4 16 20 62 36 16"/><path transform="translate(208 0)" d="M4 62 20 16 36 62M10.5 45h19M9 7q5-7 11-3t11-2"/><circle cx="283" cy="39" r="22.5"/><circle cx="283" cy="39" r="11" stroke-width="1.6" stroke-opacity=".55"/></g><circle cx="283" cy="39" r="5.2" fill="url(#${id}c)"/></svg>`;
  }
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
  .mk-core{transform-origin:32px 32px;animation:mk-bate 1.6s ease-in-out infinite}
  .mk-sat{offset-path:path("M-27.3 0a27.3 9.3 0 1 0 54.6 0a27.3 9.3 0 1 0 -54.6 0");offset-rotate:0deg;animation:mk-sat 11s linear infinite}
  @keyframes mk-sat{to{offset-distance:100%}}
  @keyframes mk-bate{0%,100%{transform:scale(1)}7%{transform:scale(1.16)}20%{transform:scale(1.02)}24%{transform:scale(1.1)}38%{transform:scale(1)}}
  .wm-svg{display:block;height:1.5em;width:auto;overflow:visible;filter:drop-shadow(0 0 .35em rgba(255,128,48,.5)) drop-shadow(0 0 1em rgba(255,100,30,.25))}
  .pi{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none;vertical-align:-.15em}
  @media(prefers-reduced-motion:reduce){.mk-core,.mk-sat{animation:none}}`;


  function montar(opcoes) { return CenaJarvis.montar(opcoes); }
  window.MapaVivo = {montar, logo, marca, icone, limpar};
  const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
})();
