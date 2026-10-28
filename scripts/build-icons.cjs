// Rasterização do SVG autoral; fundo alfa preservado em todos os tamanhos.
const fs=require('node:fs'),sharp=require('sharp');
const {palette}=require('../scene-3d/design-tokens.json');
const slices=[[-19,12],[-10,22],[0,26],[10,22],[19,12]].map(([y,r])=>`<ellipse cx="32" cy="${32+y}" rx="${r}" ry="5.1" fill="url(#jarvao)"/>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="jarvao" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.energy}"/><stop offset=".5" stop-color="${palette.pink}"/><stop offset="1" stop-color="${palette.violet}"/></linearGradient></defs><g transform="rotate(-24 32 32)">${slices}</g></svg>\n`;
fs.writeFileSync('icons/jarvis.svg',svg);
Promise.all([['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]].map(([name,size])=>sharp(Buffer.from(svg)).resize(size,size).png().toFile('icons/'+name))).catch(error=>{console.error(error);process.exitCode=1;});
