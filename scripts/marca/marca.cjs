'use strict';
/**
 * Marca do Jarvão — fonte única do emblema e do logotipo (wordmark).
 * Conceito: um globo geodésico (a rede do núcleo) com o núcleo incandescente no centro e uma órbita com um satélite
 * (os projetos em volta do Jarvão). O logotipo é desenhado letra a letra em traço contínuo; o "O" carrega o núcleo.
 * Uso: `node scripts/marca/gerar-icones.cjs` regenera icons/*.svg e *.png (ver o arquivo).
 */
const GRAD_FIO = [['0', '#fff3df'], ['.45', '#ffb36a'], ['1', '#ff6a1a']];
const stops = a => a.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');

/** Emblema quadrado 512×512. tile: 'arredondado' (favicon/aba), 'cheio' (iOS e ícone adaptável) ou 'nenhum'. escala < 1 = zona segura. */
function emblema({tile = 'arredondado', escala = 1} = {}) {
  const C = 256, rx = 218, ry = 74, rot = -28;
  const fundo = tile === 'nenhum' ? '' : tile === 'cheio' ? '<rect width="512" height="512" fill="url(#fundo)"/>' : '<rect width="512" height="512" rx="116" fill="url(#fundo)"/><rect x="3" y="3" width="506" height="506" rx="113" fill="none" stroke="#ffb36a" stroke-opacity=".22" stroke-width="3"/>';
  const lat = (dy, r) => `<ellipse cx="${C}" cy="${C + dy}" rx="${r}" ry="${Math.round(r * .27)}" />`;
  // pontos (nós) onde meridianos cruzam latitudes
  const nos = [[256, 124], [256, 388], [356, 256], [156, 256], [322, 186], [190, 326], [318, 330], [194, 182], [256, 186], [256, 326]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i < 4 ? 7 : 5}" fill="#fff1dc"/>`).join('');
  const sat = (() => { const t = 28 * Math.PI / 180, x = rx * Math.cos(t), y = ry * Math.sin(t); return `<g transform="translate(${C} ${C}) rotate(${rot})"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="26" fill="url(#halo)"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="#fff"/></g>`; })();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
<radialGradient id="fundo" cx=".5" cy=".42" r=".78"><stop offset="0" stop-color="#2b170b"/><stop offset=".55" stop-color="#130a06"/><stop offset="1" stop-color="#070403"/></radialGradient>
<linearGradient id="fio" x1="0" y1="0" x2="1" y2="1">${stops(GRAD_FIO)}</linearGradient>
<radialGradient id="globo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff9a45" stop-opacity=".55"/><stop offset=".7" stop-color="#ff6a1a" stop-opacity=".16"/><stop offset="1" stop-color="#ff6a1a" stop-opacity=".05"/></radialGradient>
<radialGradient id="nucleo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#ffe3b4"/><stop offset=".62" stop-color="#ff8a3d" stop-opacity=".85"/><stop offset="1" stop-color="#ff5a10" stop-opacity="0"/></radialGradient>
<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#ffb36a" stop-opacity="0"/></radialGradient>
</defs>
${fundo}
<g transform="translate(${C} ${C}) scale(${escala}) translate(${-C} ${-C})">
<circle cx="${C}" cy="${C}" r="216" fill="none" stroke="#ffb36a" stroke-opacity=".3" stroke-width="3" stroke-dasharray="2 13" stroke-linecap="round"/>
<g transform="translate(${C} ${C}) rotate(${rot})"><path d="M${-rx} 0A${rx} ${ry} 0 0 1 ${rx} 0" fill="none" stroke="url(#fio)" stroke-width="9" stroke-linecap="round" stroke-opacity=".55"/></g>
<circle cx="${C}" cy="${C}" r="134" fill="url(#globo)"/>
<g fill="none" stroke="url(#fio)" stroke-width="6" stroke-linecap="round">
<circle cx="${C}" cy="${C}" r="134"/>
<ellipse cx="${C}" cy="${C}" rx="134" ry="38"/>${lat(-72, 113)}${lat(72, 113)}
<ellipse cx="${C}" cy="${C}" rx="50" ry="134"/><ellipse cx="${C}" cy="${C}" rx="100" ry="134" stroke-opacity=".8"/>
<path d="M${C} 122V390" stroke-opacity=".7"/>
</g>
${nos}
<circle cx="${C}" cy="${C}" r="74" fill="url(#nucleo)"/><circle cx="${C}" cy="${C}" r="24" fill="#fff"/>
<g transform="translate(${C} ${C}) rotate(${rot})"><path d="M${rx} 0A${rx} ${ry} 0 0 1 ${-rx} 0" fill="none" stroke="url(#fio)" stroke-width="10" stroke-linecap="round"/></g>
${sat}
</g>
</svg>`;
}

/** Logotipo JARVÃO desenhado em traço (viewBox 304×70): J A R V Ã O; o O tem o núcleo no centro. */
function logotipo({id = 'wm', gradiente = true, cor = '#ffcf9a'} = {}) {
  const L = {
    J: 'M31 16V45a14 14 0 0 1-14 14h-1a12 12 0 0 1-10-5',
    A: 'M4 62 20 16 36 62M10.5 45h19',
    R: 'M7 62V16h14a13 13 0 0 1 0 26H7M21 42l13 20',
    V: 'M4 16 20 62 36 16',
    Ã: 'M4 62 20 16 36 62M10.5 45h19M9 7q5-7 11-3t11-2',
  };
  const x = [0, 52, 104, 156, 208];
  const tr = ['J', 'A', 'R', 'V', 'Ã'].map((c, i) => `<path transform="translate(${x[i]} 0)" d="${L[c]}"/>`).join('');
  const traco = gradiente ? `url(#${id}g)` : cor;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -5 316 75" role="img" aria-label="Jarvão" class="wm-svg">
<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6e6"/><stop offset=".5" stop-color="#ffcf9a"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient>
<radialGradient id="${id}c" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffd9a8"/><stop offset="1" stop-color="#ff7a26"/></radialGradient></defs>
<g fill="none" stroke="${traco}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round">${tr}
<circle cx="283" cy="39" r="22.5"/><circle cx="283" cy="39" r="11" stroke-width="1.6" stroke-opacity=".55"/></g>
<circle cx="283" cy="39" r="5.2" fill="url(#${id}c)"/></svg>`;
}

module.exports = {emblema, logotipo};
