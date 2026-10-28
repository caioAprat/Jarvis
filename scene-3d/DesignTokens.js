import earthURL from '../assets/earth/blue-marble-2048.jpg';

/** Única origem das cores da cena, dos shaders, dos ícones e da interface. */
export const TOKENS = Object.freeze({
  palette: Object.freeze({
    background: '#050b12', surface: '#101c27', surfaceRaised: '#192a37',
    text: '#edf3ef', muted: '#97acb5', energy: '#ffbb71',
    electric: '#fff1cb', neon: '#83d9df', ocean: '#25546b',
    shadow: '#02060a', border: '#526777', document: '#edf3ef',
    planetCold: '#527687', planetWarm: '#9d8062', planetNeutral: '#697d7c'
  }),
  status: Object.freeze({ok:'#8cd6b1',atencao:'#edc184',erro:'#ee8c9a',aguardando:'#edc184',config:'#97acb5',pausado:'#697d7c'}),
  textures: Object.freeze({earth: earthURL}),
  bloom: Object.freeze({strength:.62, radius:.4, threshold:1.1}),
  layout: Object.freeze({heroRadius:1.55, nodeRadius:.29, clearance:.18}),
  traffic: Object.freeze({perActiveProject:4, size:.22, duration:6.4})
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
