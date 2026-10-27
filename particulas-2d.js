'use strict';
/** Partículas do núcleo e dos planetas: brasas em arco, micro-partículas e detritos orbitais (pools reaproveitados). */
window.ParticulasJarvo = (() => {
  const TAU = Math.PI * 2;
  const semente = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const COR = {ok: 0x79e9b4, atencao: 0xffc16c, erro: 0xff5e74, aguardando: 0xe9b66e, config: 0xc2ab8c, pausado: 0x776b61};
  // paleta das brasas: branco-quente → amarelo → laranja → vermelho escuro
  const PALETA = (() => { const stops = [[255, 244, 200], [255, 200, 110], [255, 122, 34], [150, 40, 14]], out = new Uint32Array(32); for (let i = 0; i < 32; i++) { const t = i / 31 * 3, k = Math.min(2, t | 0), f = t - k, a = stops[k], b = stops[k + 1]; out[i] = ((a[0] + (b[0] - a[0]) * f) << 16) | ((a[1] + (b[1] - a[1]) * f) << 8) | (a[2] + (b[2] - a[2]) * f | 0); } return out; })();

  function criar(PIXI, o) {
    const {Container, Texture, ParticleContainer, Particle} = PIXI, R = o.nucleo.raio, rnd = semente(424242);
    let densidade = o.densidade || 1, qualidade = 1, suave = false;
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const g = cv.getContext('2d'), rg = g.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(.35, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
    const tex = Texture.from(cv);
    const dinamico = {dynamicProperties: {position: true, vertex: true, color: true, rotation: false}};

    // ---- brasas: nascem na borda do núcleo e sobem em arco, esfriando
    const NB = Math.round(300 * densidade), brasasC = new ParticleContainer(dinamico); brasasC.blendMode = 'add';
    const brasas = []; for (let i = 0; i < NB; i++) { const p = new Particle({texture: tex, anchorX: .5, anchorY: .5, alpha: 0, scaleX: .1, scaleY: .1}); brasasC.addParticle(p); brasas.push({p, vivo: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, dur: 1, sw: 0, tam: .1}); }
    o.nucleo.container.addChild(brasasC);
    function nasce(b) {
      const a = -Math.PI / 2 + (rnd() - .5) * 2.4, r = R * (1.02 + rnd() * .3), v = 38 + rnd() * 90;
      b.x = Math.cos(a) * r; b.y = Math.sin(a) * r; b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v - 10; b.t = 0; b.dur = 1.5 + rnd() * 1.8; b.sw = (rnd() < .5 ? -1 : 1) * (18 + rnd() * 40); b.tam = .05 + rnd() * .13; b.vivo = true;
    }
    o.nucleo.aoBater((tipo, f) => { if (suave) return; let n = tipo === 'tum' ? 9 : 4; for (const b of brasas) { if (n <= 0) break; if (!b.vivo) { nasce(b); n--; } } });

    // ---- detritos orbitando cada planeta
    const detC = new ParticleContainer(dinamico); detC.blendMode = 'add'; o.mundo.addChild(detC);
    let detritos = [], micro = 0;
    function montar(projetos) {
      for (const d of detritos) detC.removeParticle(d.p);
      detritos = [];
      projetos.forEach((pr, i) => {
        const n = pr.status === 'pausado' ? 5 : 16, cor = COR[pr.status] ?? COR.config;
        for (let k = 0; k < n; k++) { const p = new Particle({texture: tex, anchorX: .5, anchorY: .5, alpha: .6, scaleX: .06, scaleY: .06, tint: k % 3 ? cor : 0xffc890}); detC.addParticle(p); detritos.push({p, i, r: 40 + rnd() * 34, a: rnd() * TAU, w: (rnd() < .5 ? -1 : 1) * (.35 + rnd() * 1), q: .45 + rnd() * .5, tilt: rnd() * TAU, tam: .04 + rnd() * .08, f: rnd() * TAU}); }
      });
    }

    let tempo = 0, acumula = 0;
    function atualizar(dt, nos) {
      tempo += dt;
      // brasas
      acumula += dt * (suave ? 0 : 14 * qualidade); let novas = acumula | 0; acumula -= novas;
      const lim = Math.round(NB * qualidade);
      let ativas = 0;
      for (let i = 0; i < brasas.length; i++) {
        const b = brasas[i];
        if (!b.vivo) { if (novas > 0 && i < lim) { nasce(b); novas--; } else continue; }
        b.t += dt; const u = b.t / b.dur;
        if (u >= 1) { b.vivo = false; b.p.alpha = 0; continue; }
        // arco: aceleração perpendicular à velocidade + arrasto
        const sp = Math.hypot(b.vx, b.vy) || 1, ax = -b.vy / sp * b.sw, ay = b.vx / sp * b.sw;
        b.vx += ax * dt - b.vx * .35 * dt; b.vy += ay * dt - b.vy * .35 * dt - 6 * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; ativas++;
        const p = b.p; p.x = b.x; p.y = b.y; p.alpha = Math.sin(Math.PI * Math.min(1, u * 1.15)) * .95; p.scaleX = p.scaleY = b.tam * (1 - u * .6); p.tint = PALETA[(u * 31) | 0];
      }
      // detritos orbitais
      for (const d of detritos) {
        const no = nos[d.i]; if (!no) continue;
        d.a += d.w * dt * (suave ? .3 : 1);
        const x = Math.cos(d.a) * d.r, y = Math.sin(d.a) * d.r * d.q, c = Math.cos(d.tilt), s = Math.sin(d.tilt), p = d.p;
        p.x = no.x + x * c - y * s; p.y = no.y + x * s + y * c; p.alpha = .35 + .5 * (.5 + .5 * Math.sin(tempo * 1.6 + d.f)); p.scaleX = p.scaleY = d.tam * (.85 + .3 * Math.sin(d.a * 2));
      }
      return ativas;
    }
    return {montar, atualizar, suave: v => suave = !!v, qualidade: q => qualidade = q, contagem: () => ({brasas: brasas.filter(b => b.vivo).length, detritos: detritos.length}),
      destruir() { brasasC.destroy({children: true}); detC.destroy({children: true}); tex.destroy(true); }};
  }
  return {criar};
})();
