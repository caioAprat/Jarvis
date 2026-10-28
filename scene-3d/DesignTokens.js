import earthURL from '../assets/earth/blue-marble-2048.jpg';

import dictionary from './design-tokens.json';

/** Mesmo dicionário gera CSS estático, uniforms GLSL e ícones SVG. */
export const TOKENS=Object.freeze({
  ...Object.fromEntries(Object.entries(dictionary).map(([key,value])=>[key,Object.freeze(value)])),
  textures:Object.freeze({earth:earthURL})
});

export function installDesignTokens() {
  const style = document.documentElement.style;
  for (const [name, color] of Object.entries(TOKENS.palette)) {
    style.setProperty('--scene-'+name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),color);
  }
  for (const [name,color] of Object.entries(TOKENS.status)) style.setProperty('--status-'+name,color);
  const aliases={bg:'background',card:'surface',card2:'surfaceRaised',tx:'text',mu:'muted',di:'muted',pri:'energy'};
  for (const [name,token] of Object.entries(aliases)) style.setProperty('--'+name,TOKENS.palette[token]);
  for (const [name,status] of Object.entries({ok:'ok',er:'erro',av:'atencao'})) {
    style.setProperty('--'+name,TOKENS.status[status]);
    style.setProperty('--'+name+'2',`color-mix(in srgb, ${TOKENS.status[status]} 13%, transparent)`);
  }
  style.setProperty('--pri2','color-mix(in srgb, var(--scene-energy) 14%, transparent)');
  style.setProperty('--linha','color-mix(in srgb, var(--scene-border) 30%, transparent)');
  window.JarvisDesignTokens=TOKENS;
}
