'use strict';
// Identidade preservada; cores herdadas de DesignTokens e cena modular Three.js.
(function () {


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
      <radialGradient id="mkc"><stop offset="0" stop-color="var(--scene-text)"/><stop offset=".5" stop-color="var(--scene-electric)"/><stop offset="1" stop-color="var(--scene-energy)"/></radialGradient>
      <linearGradient id="mka" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--scene-electric)"/><stop offset="1" stop-color="var(--scene-energy)"/></linearGradient></defs>
      <circle cx="32" cy="32" r="30.6" fill="none" stroke="var(--scene-energy)" stroke-opacity=".3" stroke-width=".8"/>
      <path class="mk-t" d="${tk}" fill="none" stroke="var(--scene-energy)" stroke-width=".9" opacity=".75"/>
      <path class="mk-r1" d="${ext}" fill="none" stroke="url(#mka)" stroke-width="3.4"/>
      <path class="mk-r2" d="${inn}" fill="none" stroke="var(--scene-electric)" stroke-width="2.4"/>
      <g class="mk-core"><circle cx="32" cy="32" r="7.2" fill="url(#mkc)"/><circle cx="32" cy="32" r="2.4" fill="var(--scene-text)"/></g></svg>`;
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
    background:linear-gradient(180deg,var(--scene-text) 0%,var(--scene-electric) 48%,var(--scene-energy) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-stroke:.035em color-mix(in srgb, var(--scene-electric) 55%, transparent);
    filter:drop-shadow(0 0 .5em color-mix(in srgb, var(--scene-energy) 55%, transparent)) drop-shadow(0 0 1.4em color-mix(in srgb, var(--scene-energy) 28%, transparent))}
  .pi{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none;vertical-align:-.15em}
  @media(prefers-reduced-motion:reduce){.mk-r1,.mk-r2,.mk-t,.mk-core{animation:none}}`;


  function montar(opcoes) { return CenaJarvis.montar(opcoes); }
  window.MapaVivo = {montar, logo, marca, icone, limpar};
  const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
})();
