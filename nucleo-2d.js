'use strict';
/**
 * Núcleo do Jarvão — tudo é matemática 2D: vértices girados e projetados em 2D (sem Three.js, sem WebGL 3D,
 * sem câmera 3D) e texturas geradas na resolução necessária. Nenhuma sequência de quadros; tudo usa deltaTime.
 */
window.NucleoJarvo = (() => {
  const TAU = Math.PI * 2, PHI = (1 + Math.sqrt(5)) / 2;
  const semente = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  // ------------------------------------------------------------------ geometria (só vértices e arestas)
  /** Icosfera geodésica de frequência `f` (V = 10f²+2), com leve irregularidade orgânica. */
  function icosfera(f, jitter, rnd) {
    const t = PHI, base = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const verts = [], mapa = new Map(), arestas = [], vistas = new Set();
    const idx = (x, y, z) => { const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l; const k = Math.round(x * 5e3) + ',' + Math.round(y * 5e3) + ',' + Math.round(z * 5e3); let i = mapa.get(k); if (i === undefined) { i = verts.length / 3; verts.push(x, y, z); mapa.set(k, i); } return i; };
    const liga = (a, b) => { const k = a < b ? a * 100000 + b : b * 100000 + a; if (!vistas.has(k)) { vistas.add(k); arestas.push(a, b); } };
    for (const [ia, ib, ic] of faces) {
      const A = base[ia], B = base[ib], C = base[ic], g = [];
      for (let i = 0; i <= f; i++) { g[i] = []; for (let j = 0; j <= f - i; j++) g[i][j] = idx(A[0] + (B[0] - A[0]) * i / f + (C[0] - A[0]) * j / f, A[1] + (B[1] - A[1]) * i / f + (C[1] - A[1]) * j / f, A[2] + (B[2] - A[2]) * i / f + (C[2] - A[2]) * j / f); }
      for (let i = 0; i < f; i++) for (let j = 0; j < f - i; j++) { liga(g[i][j], g[i + 1][j]); liga(g[i][j], g[i][j + 1]); liga(g[i + 1][j], g[i][j + 1]); }
    }
    const v = new Float32Array(verts);
    for (let i = 0; i < v.length; i += 3) { const x = v[i] + (rnd() - .5) * jitter, y = v[i + 1] + (rnd() - .5) * jitter, z = v[i + 2] + (rnd() - .5) * jitter, l = Math.hypot(x, y, z); v[i] = x / l; v[i + 1] = y / l; v[i + 2] = z / l; }
    return {v, e: new Uint32Array(arestas)};
  }
  /** Poliedro regular: arestas = pares à menor distância entre vértices. */
  function poliedro(pontos) {
    const v = new Float32Array(pontos.length * 3);
    pontos.forEach((p, i) => { const l = Math.hypot(...p); v[i * 3] = p[0] / l; v[i * 3 + 1] = p[1] / l; v[i * 3 + 2] = p[2] / l; });
    let menor = 9; for (let i = 0; i < pontos.length; i++) for (let j = i + 1; j < pontos.length; j++) menor = Math.min(menor, Math.hypot(v[i * 3] - v[j * 3], v[i * 3 + 1] - v[j * 3 + 1], v[i * 3 + 2] - v[j * 3 + 2]));
    const e = [];
    for (let i = 0; i < pontos.length; i++) for (let j = i + 1; j < pontos.length; j++) if (Math.hypot(v[i * 3] - v[j * 3], v[i * 3 + 1] - v[j * 3 + 1], v[i * 3 + 2] - v[j * 3 + 2]) < menor * 1.02) e.push(i, j);
    return {v, e: new Uint32Array(e)};
  }
  const icosaedro = () => poliedro([[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]]);
  const dodecaedro = () => { const p = [], a = 1 / PHI; for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) p.push([x, y, z]); for (const u of [-1, 1]) for (const w of [-1, 1]) p.push([0, u * a, w * PHI], [u * a, w * PHI, 0], [w * PHI, 0, u * a]); return poliedro(p); };

  // ------------------------------------------------------------------ texturas na resolução necessária
  const tela = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
  function gradiente(n, paradas) {
    const c = tela(n), g = c.getContext('2d'), r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    for (const [o, cor] of paradas) r.addColorStop(o, cor);
    g.fillStyle = r; g.fillRect(0, 0, n, n); return c;
  }
  /** Plasma: centenas de manchas elípticas aditivas (células de convecção) com borda circular suave. */
  function plasma(n, seed) {
    const rnd = semente(seed), c = tela(n), g = c.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 520; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * n * .46, x = n / 2 + Math.cos(a) * d, y = n / 2 + Math.sin(a) * d, r = n * (.025 + rnd() * .1), alongado = .35 + rnd() * .5;
      g.save(); g.translate(x, y); g.rotate(rnd() * TAU); g.scale(1, alongado);
      const q = g.createRadialGradient(0, 0, 0, 0, 0, r), al = .05 + rnd() * .12, gb = 60 + rnd() * 90 | 0;
      q.addColorStop(0, `rgba(255,${gb},${20 + rnd() * 60 | 0},${al})`); q.addColorStop(.6, `rgba(255,${gb * .6 | 0},10,${al * .45})`); q.addColorStop(1, 'rgba(255,80,0,0)');
      g.fillStyle = q; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
    }
    g.globalCompositeOperation = 'destination-in';
    const m = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); m.addColorStop(0, '#fff'); m.addColorStop(.82, '#fff'); m.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = m; g.fillRect(0, 0, n, n); return c;
  }

  function criar(PIXI, opcoes = {}) {
    const tam = opcoes.tam || 2048, R = opcoes.raio || 195, rnd = semente(20241027);
    const {Container, Sprite, Texture, Mesh, MeshGeometry, Graphics, Particle, ParticleContainer} = PIXI;
    const container = new Container(), tex = [];
    const textura = canvas => { const t = Texture.from(canvas); tex.push(t); return t; };
    const sprite = (t, pai, d) => { const s = new Sprite(t); s.anchor.set(.5); s.width = s.height = d; pai.addChild(s); return s; };

    // ---- a) halo/corona: 3 sprites aditivos de raios diferentes + flare
    const tHalo = textura(gradiente(tam, [[0, 'rgba(255,214,150,1)'], [.12, 'rgba(255,170,80,.62)'], [.35, 'rgba(255,110,30,.24)'], [.65, 'rgba(255,80,10,.07)'], [1, 'rgba(255,60,0,0)']]));
    const halos = [R * 2.9, R * 4.1, R * 5.6].map((d, i) => { const s = sprite(tHalo, container, d); s.blendMode = 'add'; s.alpha = [.5, .32, .2][i]; return s; });
    const flare = sprite(tHalo, container, R * 4.6); flare.blendMode = 'add'; flare.scale.y *= .035; flare.alpha = .3;
    const flare2 = sprite(tHalo, container, R * 3.2); flare2.blendMode = 'add'; flare2.scale.x *= .03; flare2.alpha = .16;

    // ---- b) corpo incandescente + turbulência em contra-rotação
    const tCorpo = textura(gradiente(tam, [[0, 'rgba(255,252,236,1)'], [.1, 'rgba(255,244,200,1)'], [.26, 'rgba(255,205,110,.98)'], [.5, 'rgba(255,150,48,.95)'], [.74, 'rgba(226,92,22,.93)'], [.9, 'rgba(120,40,10,.86)'], [.985, 'rgba(60,18,6,.3)'], [1, 'rgba(40,10,4,0)']]));
    const corpo = sprite(tCorpo, container, R * 2);
    const tPlasma = textura(plasma(tam, 99));
    const plasmaA = sprite(tPlasma, container, R * 2), plasmaB = sprite(tPlasma, container, R * 1.9);
    plasmaA.blendMode = 'add'; plasmaA.alpha = .5; plasmaB.blendMode = 'add'; plasmaB.alpha = .4; plasmaB.scale.x *= -1;
    const quente = sprite(tHalo, container, R * 1.3); quente.blendMode = 'add'; quente.alpha = .9;

    // ---- c) rede geodésica (arestas em Mesh 'line-list', buffers reaproveitados)
    const rede = icosfera(opcoes.frequencia || 12, .03, rnd), interno1 = icosaedro(), interno2 = dodecaedro();
    function malha(g, cor, alpha, desloc) {
      const geo = new MeshGeometry({positions: new Float32Array(g.v.length / 3 * 2), indices: new Uint32Array(g.e.length), topology: 'line-list'});
      geo.batchMode = 'no-batch';
      const m = new Mesh({geometry: geo, texture: Texture.WHITE}); m.tint = cor; m.alpha = alpha; m.blendMode = 'add'; container.addChild(m);
      if (desloc) m.position.set(desloc, desloc);
      return {geo, m};
    }
    // camadas: interna → rede (trás) → rede (frente) → rede (frente, deslocada 0,5 px para engrossar)
    const dodeM = malha(interno2, 0xffe3b0, .85), icoM = malha(interno1, 0xffd08a, .95), icoM2 = malha(interno1, 0xffb060, .5, .6);
    const tras = malha(rede, 0xff8c3a, .26), frente = malha(rede, 0xffc98a, .92), frente2 = malha(rede, 0xff9a4a, .5, .55);
    const sombra = [dodeM, icoM, icoM2];
    const projeta = (g, geo, raio, ay, ax, pers, saida) => {
      const v = g.v, n = v.length / 3, p = geo ? geo.positions : null, cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
      for (let i = 0; i < n; i++) {
        const x = v[i * 3], y = v[i * 3 + 1], z = v[i * 3 + 2], x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx, k = raio * (1 + pers * z2);
        saida.z[i] = z2; saida.x[i] = x1 * k; saida.y[i] = y2 * k;
        if (p) { p[i * 2] = x1 * k; p[i * 2 + 1] = y2 * k; }
      }
    };
    const buf = n => ({x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n)});
    const sRede = buf(rede.v.length / 3), sI1 = buf(12), sI2 = buf(20);
    const sobe = geo => { geo.attributes.aPosition.buffer.update(); };
    const sobeIdx = geo => { geo.indexBuffer.update(); };
    // índices fixos: aresta "ausente" vira (a,a), de comprimento zero
    function dividir(g, s, f, t, limite) {
      const E = g.e, iF = f.geo.indices, iT = t.geo.indices;
      for (let i = 0; i < E.length; i += 2) {
        const a = E[i], b = E[i + 1], frente = (s.z[a] + s.z[b]) * .5 > limite;
        iF[i] = a; iF[i + 1] = frente ? b : a; iT[i] = a; iT[i + 1] = frente ? a : b;
      }
    }
    // nós luminosos nos vértices (subconjunto) — um único ParticleContainer reaproveitado
    const tNo = textura(gradiente(64, [[0, 'rgba(255,255,240,1)'], [.25, 'rgba(255,214,140,.9)'], [.6, 'rgba(255,140,50,.28)'], [1, 'rgba(255,100,20,0)']]));
    const nosC = new ParticleContainer({dynamicProperties: {position: true, vertex: true, color: true, rotation: false}});
    const nosIdx = [], nos = [];
    for (let i = 0; i < rede.v.length / 3; i += 1) if (rnd() < (opcoes.nos || 190) / (rede.v.length / 3)) nosIdx.push(i);
    for (const i of nosIdx) { const p = new Particle({texture: tNo, x: 0, y: 0, anchorX: .5, anchorY: .5, scaleX: .1, scaleY: .1, tint: 0xffd9a0}); nosC.addParticle(p); nos.push({p, i, f: rnd() * TAU, v: .6 + rnd() * 1.6}); }
    nosC.blendMode = 'add';
    const nosI = []; // nós do poliedro interno (todos os vértices)
    for (let i = 0; i < 12; i++) { const p = new Particle({texture: tNo, anchorX: .5, anchorY: .5, scaleX: .12, scaleY: .12, tint: 0xfff0d0}); nosC.addParticle(p); nosI.push({p, i}); }

    // ---- e) anel de limbo (Fresnel)
    const tLimbo = textura(gradiente(tam, [[0, 'rgba(255,150,60,0)'], [.72, 'rgba(255,150,60,0)'], [.9, 'rgba(255,170,80,.16)'], [.955, 'rgba(255,170,80,.5)'], [.985, 'rgba(255,214,150,.85)'], [1, 'rgba(255,200,120,0)']]));
    const limbo = sprite(tLimbo, container, R * 2.1); limbo.blendMode = 'add'; limbo.alpha = .55; limbo.tint = 0xffa860;

    // ---- f) anéis orbitais elípticos tracejados + satélites
    const aneis = [{a: R * 1.55, b: R * .58, rot: -.32, dash: 46, v: .18}, {a: R * 1.95, b: R * .74, rot: -.32, dash: 70, v: -.11}, {a: R * 2.42, b: R * .92, rot: -.32, dash: 120, v: .07}];
    const orbitas = new Graphics(); container.addChildAt(orbitas, container.getChildIndex(limbo) + 1);
    aneis.forEach((r, k) => {
      const passos = r.dash; for (let i = 0; i < passos; i++) {
        if (k === 2 && i % 5 > 2) continue; if (k === 0 && i % 7 === 6) continue;
        const a0 = i / passos * TAU, a1 = (i + .62) / passos * TAU;
        for (let s = 0; s <= 5; s++) { const a = a0 + (a1 - a0) * s / 5, x = Math.cos(a) * r.a, y = Math.sin(a) * r.b, c = Math.cos(r.rot), sn = Math.sin(r.rot), px = x * c - y * sn, py = x * sn + y * c; s ? orbitas.lineTo(px, py) : orbitas.moveTo(px, py); }
      }
      orbitas.stroke({color: k === 1 ? 0xffd2a0 : 0xe8913f, width: k === 1 ? 1.4 : 1, alpha: k === 1 ? .55 : .42});
    });
    const satelites = [];
    aneis.forEach((r, k) => { for (let j = 0; j < 2 + (k === 1 ? 1 : 0); j++) { const s = new Particle({texture: tNo, anchorX: .5, anchorY: .5, scaleX: .24, scaleY: .24, tint: 0xfff1d0}); nosC.addParticle(s); satelites.push({s, r, ang: rnd() * TAU, off: j}); } });

    // ---- onda de choque (vetor, escala sem perder nitidez)
    const ondas = [0, 1, 2].map(() => { const g = new Graphics().circle(0, 0, R * 1.02).stroke({color: 0xffc68a, width: 3.5, alpha: 1}); g.blendMode = 'add'; g.visible = false; container.addChild(g); return {g, t: 9}; });
    container.addChild(nosC); // nós e satélites acima de tudo

    // ------------------------------------------------------------------ batimento "tum-tum"
    const bump = (t, a, d) => { if (t < 0) return 0; if (t < a) { const x = t / a; return 1 - (1 - x) ** 3; } const u = (t - a) / d; return u < 1 ? (1 - u) * (1 - u) : 0; };
    const bat = {periodo: .95, T: .95, t: 0, d1: false, d2: false, escala: 1, glow: .3, env: 0, ouvintes: [], ritmo: 'normal', suave: false};
    const sortear = () => bat.T = bat.periodo * (1 + (rnd() * 2 - 1) * .03);
    const emitir = (tipo, f) => { for (const fn of bat.ouvintes) fn(tipo, f); };
    function avancaBatida(dt) {
      bat.t += dt;
      if (bat.t >= bat.T) { bat.t -= bat.T; sortear(); bat.d1 = bat.d2 = false; }
      if (!bat.d1 && bat.t >= 0 && dt >= 0) { bat.d1 = true; const o = ondas.find(w => w.t > .7) || ondas[0]; o.t = 0; emitir('tum', 1); }
      if (!bat.d2 && bat.t >= .2) { bat.d2 = true; emitir('tum2', .6); }
      const e1 = bump(bat.t, .07, .18), e2 = .6 * bump(bat.t - .2, .06, .15), env = Math.max(e1, e2), k = bat.suave ? .4 : 1;
      bat.env = env * k;
      bat.escala = 1 + .07 * env * k;
      bat.glow = Math.min(1.15, .34 + .66 * env * k + .24 * Math.exp(-bat.t / .36));
    }

    // ------------------------------------------------------------------ estado e atualização
    let ay = rnd() * TAU, tempo = 0, qualidadeNos = 1, velocidade = 1;
    const ruido = (t, s) => .5 + .5 * Math.sin(t * s) * Math.sin(t * s * .53 + 1.7);
    function atualizar(dt) {
      dt = Math.min(Math.max(dt, 0), .1); tempo += dt;
      avancaBatida(dt);
      const reduz = bat.suave ? .25 : 1; ay += dt * .16 * reduz * velocidade;
      const ax = .38 + .08 * Math.sin(tempo * .05 * reduz);
      container.scale.set(bat.escala);
      // a) halos
      const g = bat.glow;
      halos[0].alpha = (.34 + .3 * g) * (.9 + .1 * ruido(tempo, .8)); halos[1].alpha = (.2 + .22 * g) * (.85 + .15 * ruido(tempo, .55)); halos[2].alpha = (.1 + .16 * g) * (.8 + .2 * ruido(tempo, .35));
      flare.alpha = .16 + .2 * g; flare2.alpha = .08 + .1 * g;
      // b) corpo: contra-rotação lenta
      plasmaA.rotation = tempo * .035 * reduz; plasmaB.rotation = -tempo * .052 * reduz + 1.2;
      plasmaA.alpha = .45 + .12 * g; plasmaB.alpha = .32 + .1 * g;
      quente.alpha = .55 + .45 * g; limbo.alpha = .4 + .3 * g;
      // c) rede
      projeta(rede, tras.geo, R * 1.5, ay, ax, .07, sRede);
      frente.geo.positions.set(tras.geo.positions); frente2.geo.positions.set(tras.geo.positions);
      dividir(rede, sRede, frente, tras, 0); frente2.geo.indices.set(frente.geo.indices);
      sobe(tras.geo); sobe(frente.geo); sobe(frente2.geo); sobeIdx(tras.geo); sobeIdx(frente.geo); sobeIdx(frente2.geo);
      tras.m.alpha = .2 + .08 * g; frente.m.alpha = .78 + .2 * g; frente2.m.alpha = .35 + .2 * g;
      // d) poliedros internos em contra-rotação
      projeta(interno1, icoM.geo, R * .78, -ay * 1.7 + .5, ax * .6 + .35, .06, sI1);
      icoM2.geo.positions.set(icoM.geo.positions); icoM.geo.indices.set(interno1.e); icoM2.geo.indices.set(interno1.e);
      projeta(interno2, dodeM.geo, R * .53, ay * 2.3 + 1, -ax * .5 + .2, .06, sI2); dodeM.geo.indices.set(interno2.e);
      for (const o of sombra) { sobe(o.geo); sobeIdx(o.geo); }
      icoM.m.alpha = .55 + .45 * g; icoM2.m.alpha = .25 + .3 * g; dodeM.m.alpha = .5 + .4 * g;
      // nós luminosos
      for (const n of nos) {
        const z = sRede.z[n.i], f = z > 0 ? 1 : .32, tw = .75 + .25 * Math.sin(tempo * n.v * 2 + n.f), s = (.07 + .06 * z) * tw * (.8 + .5 * g) * (qualidadeNos < 1 && n.v > 1.4 ? 0 : 1);
        n.p.x = sRede.x[n.i]; n.p.y = sRede.y[n.i]; n.p.alpha = f * tw * (.55 + .45 * g); n.p.scaleX = n.p.scaleY = s;
      }
      for (const n of nosI) { n.p.x = sI1.x[n.i]; n.p.y = sI1.y[n.i]; n.p.alpha = (.35 + .65 * g) * (sI1.z[n.i] > 0 ? 1 : .4); n.p.scaleX = n.p.scaleY = .1 + .05 * g; }
      // f) satélites
      const c = Math.cos(-.32), sn = Math.sin(-.32);
      for (const s of satelites) { const r = s.r; s.ang += dt * r.v * reduz * 2.2; const a = s.ang + s.off * 2.1, x = Math.cos(a) * r.a, y = Math.sin(a) * r.b; s.s.x = x * c - y * sn; s.s.y = x * sn + y * c; s.s.alpha = .55 + .4 * g; }
      // ondas de choque
      for (const o of ondas) { if (o.t > .7) { o.g.visible = false; continue; } o.t += dt; const u = Math.min(1, o.t / .7); o.g.visible = true; o.g.scale.set(1 + .9 * (1 - (1 - u) ** 2)); o.g.alpha = .35 * (1 - u) * (bat.suave ? .5 : 1); }
    }
    atualizar(0);

    return {
      container, atualizar, raio: R, ondas,
      batida: bat,
      aoBater: fn => bat.ouvintes.push(fn),
      /** Ritmo cardíaco: 0,95 s normal; 0,82 s com avisos novos. */
      ritmo(avisos) { bat.periodo = avisos ? .82 : .95; },
      suave(v) { bat.suave = !!v; },
      qualidade(q) { qualidadeNos = q; },
      estado: () => ({escala: bat.escala, glow: bat.glow, fase: bat.t, periodo: bat.T, angulo: ay}),
      destruir() { container.destroy({children: true}); tex.forEach(t => t.destroy(true)); },
    };
  }
  return {criar};
})();
