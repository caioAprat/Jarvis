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
  /** Emblema da marca: cinco barras de pulso e o núcleo aceso (bate no ritmo do coração). O tamanho vem do font-size do pai. Fonte do desenho: scripts/marca/marca.cjs. */
  function logo(extra) {
    return `<svg class="mk ${extra || ''}" viewBox="0 0 64 64" aria-hidden="true"><defs>
      <linearGradient id="mka" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3df"/><stop offset=".5" stop-color="#ffb36a"/><stop offset="1" stop-color="#ff6a1a"/></linearGradient>
      <radialGradient id="mkc"><stop offset="0" stop-color="#ffb36a" stop-opacity=".85"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient></defs>
      <g fill="url(#mka)"><rect class="mk-b" x="11.3" y="37.0" width="5.4" height="14" rx="2.7"/><rect class="mk-b" x="20.3" y="27.0" width="5.4" height="24" rx="2.7"/><rect class="mk-b" x="29.3" y="40.0" width="5.4" height="11" rx="2.7"/><rect class="mk-b" x="38.3" y="21.0" width="5.4" height="30" rx="2.7"/><rect class="mk-b" x="47.3" y="32.0" width="5.4" height="19" rx="2.7"/></g>
      <g class="mk-core"><circle cx="41.0" cy="14.4" r="7.6" fill="url(#mkc)"/><circle cx="41.0" cy="14.4" r="3.4" fill="#fff"/></g></svg>`;
  }
  /** Logotipo JARVÃO desenhado em traço contínuo (o "O" carrega o núcleo). Mesmo desenho de icons/jarvao-logotipo.svg. */
  let wmN = 0;
  function marca() {
    const id = 'wm' + (++wmN);
    return `<svg class="wm-svg" viewBox="-6 -5 336 75" role="img" aria-label="Jarvão"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6e6"/><stop offset=".5" stop-color="#ffcf9a"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient><radialGradient id="${id}c"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffd9a8"/><stop offset="1" stop-color="#ff7a26"/></radialGradient></defs><g fill="none" stroke="url(#${id}g)" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"><path d="M31 16V45a14 14 0 0 1-14 14h-1a12 12 0 0 1-10-5"/><path transform="translate(56 0)" d="M4 62 20 16 36 62M10.5 45h19"/><path transform="translate(112 0)" d="M7 62V16h14a13 13 0 0 1 0 26H7M21 42l13 20"/><path transform="translate(168 0)" d="M4 16 20 62 36 16"/><path transform="translate(224 0)" d="M4 62 20 16 36 62M10.5 45h19M9 7q5-7 11-3t11-2"/><circle cx="303" cy="39" r="22.5"/></g><circle cx="303" cy="39" r="4.6" fill="url(#${id}c)"/></svg>`;
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
  .mk-core{transform-box:fill-box;transform-origin:center;animation:mk-bate 1.6s ease-in-out infinite}
  .mk-b{transform-box:fill-box;transform-origin:50% 100%;animation:mk-barra 1.6s ease-in-out infinite}
  .mk-b:nth-child(2){animation-delay:.06s}.mk-b:nth-child(3){animation-delay:.12s}.mk-b:nth-child(4){animation-delay:.18s}.mk-b:nth-child(5){animation-delay:.24s}
  @keyframes mk-barra{0%,40%,100%{transform:scaleY(1)}10%{transform:scaleY(1.1)}22%{transform:scaleY(.97)}}
  @keyframes mk-bate{0%,100%{transform:scale(1)}7%{transform:scale(1.16)}20%{transform:scale(1.02)}24%{transform:scale(1.1)}38%{transform:scale(1)}}
  .wm-svg{display:block;height:1.5em;width:auto;overflow:visible;filter:drop-shadow(0 0 .35em rgba(255,128,48,.5)) drop-shadow(0 0 1em rgba(255,100,30,.25))}
  .pi{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none;vertical-align:-.15em}
  @media(prefers-reduced-motion:reduce){.mk-core,.mk-b{animation:none}}`;


  function montar(opcoes) { return CenaJarvis.montar(opcoes); }
  window.MapaVivo = {montar, logo, marca, icone, limpar};
  const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
})();
