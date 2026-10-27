'use strict';
/**
 * Gera os ícones da marca a partir de scripts/marca/marca.cjs.
 *   PW_CORE=<caminho de node_modules/playwright-core> CHROME=<caminho do chrome.exe> node scripts/marca/gerar-icones.cjs
 * Saída: icons/jarvis.svg, jarvis-cheio.svg, jarvao-logotipo.svg, icon-192/512.png, icon-maskable-512.png,
 * apple-touch-icon.png (180), favicon-32.png e favicon.ico (16+32+48).
 */
const fs = require('node:fs'), path = require('node:path');
const {emblema, logotipo} = require('./marca.cjs');
const raiz = path.resolve(__dirname, '../..'), saida = path.join(raiz, 'icons');
const {chromium} = require(process.env.PW_CORE || 'playwright-core');

fs.writeFileSync(path.join(saida, 'jarvis.svg'), emblema({tile: 'arredondado'}));
fs.writeFileSync(path.join(saida, 'jarvis-cheio.svg'), emblema({tile: 'cheio'}));
fs.writeFileSync(path.join(saida, 'jarvao-logotipo.svg'), logotipo({id: 'lg'}));

const png = [['icon-192.png', 192, 'arredondado', 1], ['icon-512.png', 512, 'arredondado', 1], ['icon-maskable-512.png', 512, 'cheio', .74], ['apple-touch-icon.png', 180, 'cheio', .9], ['favicon-32.png', 32, 'arredondado', 1], ['favicon-16.png', 16, 'arredondado', 1], ['favicon-48.png', 48, 'arredondado', 1]];

(async () => {
  const b = await chromium.launch({executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  const p = await b.newPage({deviceScaleFactor: 1});
  for (const [nome, t, tile, esc] of png) {
    await p.setViewportSize({width: t, height: t});
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${t}px;height:${t}px}</style>${emblema({tile, escala: esc})}`);
    await p.screenshot({path: path.join(saida, nome), omitBackground: tile !== 'cheio', clip: {x: 0, y: 0, width: t, height: t}});
  }
  await b.close();
  // favicon.ico com PNGs embutidos (16, 32, 48)
  const imgs = ['favicon-16.png', 'favicon-32.png', 'favicon-48.png'].map(n => ({n, d: fs.readFileSync(path.join(saida, n)), t: +n.match(/\d+/)[0]}));
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
  let off = 6 + 16 * imgs.length; const dir = [], dados = [];
  for (const i of imgs) { const e = Buffer.alloc(16); e[0] = i.t; e[1] = i.t; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(i.d.length, 8); e.writeUInt32LE(off, 12); off += i.d.length; dir.push(e); dados.push(i.d); }
  fs.writeFileSync(path.join(saida, 'favicon.ico'), Buffer.concat([head, ...dir, ...dados]));
  for (const n of ['favicon-16.png', 'favicon-48.png']) fs.unlinkSync(path.join(saida, n));
  console.log('ícones gerados em', saida);
})();
