'use strict';
/**
 * Marca do Jarvão — fonte única do emblema e do logotipo (wordmark).
 * Conceito: um globo geodésico (a rede do núcleo) com o núcleo incandescente no centro e uma órbita com um satélite
 * (os projetos em volta do Jarvão). O logotipo é desenhado letra a letra em traço contínuo; o "O" carrega o núcleo.
 * Uso: `node scripts/marca/gerar-icones.cjs` regenera icons/*.svg e *.png (ver o arquivo).
 */
const GRAD_FIO = [['0', '#fff3df'], ['.45', '#ffb36a'], ['1', '#ff6a1a']];
const stops = a => a.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');

/** Emblema quadrado 512×512 — minimalista: cinco barras de pulso (os sistemas / o batimento) e o núcleo aceso sobre a mais alta.
 *  tile: 'arredondado' (favicon/aba), 'cheio' (iOS e ícone adaptável) ou 'nenhum'. escala < 1 = zona segura. */
function emblema({tile = 'arredondado', escala = 1} = {}) {
  const fundo = tile === 'nenhum' ? '' : tile === 'cheio' ? '<rect width="512" height="512" fill="url(#fundo)"/>' : '<rect width="512" height="512" rx="116" fill="url(#fundo)"/><rect x="3" y="3" width="506" height="506" rx="113" fill="none" stroke="#ffb36a" stroke-opacity=".2" stroke-width="3"/>';
  const alt = [128, 214, 100, 262, 168], larg = 44, gap = 30, base = 430, x0 = (512 - (5 * larg + 4 * gap)) / 2;
  const barras = alt.map((h, i) => `<rect x="${x0 + i * (larg + gap)}" y="${base - h}" width="${larg}" height="${h}" rx="22"/>`).join('');
  const cx = x0 + 3 * (larg + gap) + larg / 2, cy = base - alt[3] - 58;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
<radialGradient id="fundo" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#241209"/><stop offset=".6" stop-color="#110906"/><stop offset="1" stop-color="#070403"/></radialGradient>
<linearGradient id="fio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3df"/><stop offset=".5" stop-color="#ffb36a"/><stop offset="1" stop-color="#ff6a1a"/></linearGradient>
<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb36a" stop-opacity=".85"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient>
</defs>
${fundo}
<g transform="translate(256 256) scale(${escala}) translate(-256 -256)">
<g fill="url(#fio)">${barras}</g>
<circle cx="${cx}" cy="${cy}" r="62" fill="url(#halo)"/><circle cx="${cx}" cy="${cy}" r="27" fill="#fff"/>
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
  const x = [0, 56, 112, 168, 224];
  const tr = ['J', 'A', 'R', 'V', 'Ã'].map((c, i) => `<path transform="translate(${x[i]} 0)" d="${L[c]}"/>`).join('');
  const traco = gradiente ? `url(#${id}g)` : cor;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -5 336 75" role="img" aria-label="Jarvão" class="wm-svg">
<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6e6"/><stop offset=".5" stop-color="#ffcf9a"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient>
<radialGradient id="${id}c" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffd9a8"/><stop offset="1" stop-color="#ff7a26"/></radialGradient></defs>
<g fill="none" stroke="${traco}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round">${tr}
<circle cx="303" cy="39" r="22.5"/></g>
<circle cx="303" cy="39" r="4.6" fill="url(#${id}c)"/></svg>`;
}

module.exports = {emblema, logotipo};
