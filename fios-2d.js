'use strict';
/**
 * Sistema vascular: o Jarvão é o coração e cada projeto um órgão. Um vaso principal por projeto (tubo largo no núcleo,
 * afinando até o planeta, com bulbos nas pontas), ramos, sub-ramos e capilares (3 níveis) e vasos que ligam projetos vizinhos.
 * Splines Catmull-Rom recalculadas a cada quadro a partir da posição ATUAL dos planetas, com balanço de baixa amplitude;
 * um Mesh de triângulos por projeto (buffers reaproveitados, sem alocar por quadro). A cada primeiro "tum" uma onda de
 * dilatação percorre os vasos do núcleo para fora. Também guarda o pool de pacotes que viajam pelos vasos.
 */
window.FiosJarvo = (() => {
  const TAU = Math.PI * 2, TRILHA = 6, MAX = 160;
  const semente = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const COR = {ok: 0x79e9b4, atencao: 0xffc16c, erro: 0xff5e74, aguardando: 0xe9b66e, config: 0xc2ab8c, pausado: 0x776b61};
  const LARGURA_GEO = 2.6;                       // largura geométrica = espessura do miolo × isto (o resto é halo)
  const CONF = {raiz: 8, ponta: 1.8, bulboRaiz: 1.35, bulboPlaneta: 1.5, onda: {duracao: 1.2, amp: .6, sigma: 48}};
  const canvas = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
  const suaviza = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

  /** Textura do vaso: x = perfil através do tubo (miolo claro + halo), y = ao longo (laranja do núcleo → cor do status, pontas mais escuras). */
  function texturaVaso(PIXI, cor) {
    const W = 64, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), im = g.createImageData(W, H), r1 = (cor >> 16) & 255, g1 = (cor >> 8) & 255, b1 = cor & 255;
    for (let y = 0; y < H; y++) {
      const u = y / (H - 1), mix = suaviza(.12, .9, u), duto = .55 + .45 * suaviza(0, .06, u) * suaviza(0, .09, 1 - u);
      const rr = 255 + (r1 - 255) * mix, gg = 150 + (g1 - 150) * mix, bb = 70 + (b1 - 70) * mix;
      for (let x = 0; x < W; x++) {
        const d = Math.abs(x / (W - 1) - .5) * 2, miolo = Math.exp(-(d / .3) * (d / .3)), halo = Math.exp(-(d / .8) * (d / .8)) * .5, borda = 1 - d * d * d;
        const a = Math.min(1, (miolo + halo * .6) * borda) * duto, w = miolo * .38, i = (y * W + x) * 4;
        im.data[i] = rr + (255 - rr) * w; im.data[i + 1] = gg + (255 - gg) * w; im.data[i + 2] = bb + (255 - bb) * w; im.data[i + 3] = a * 255;
      }
    }
    g.putImageData(im, 0, 0);
    return PIXI.Texture.from(c);
  }

  function criar(PIXI, o) {
    const {Container, Mesh, MeshGeometry, Texture, ParticleContainer, Particle} = PIXI, mundo = o.mundo, nucleo = o.nucleo, R = nucleo.raio, rnd = semente(8675309);
    const camada = new Container(), texturas = [];
    mundo.addChild(camada);
    const tex = c => { const t = Texture.from(c); texturas.push(t); return t; };
    const texStatus = {}; for (const k of Object.keys(COR)) { texStatus[k] = texturaVaso(PIXI, COR[k]); texturas.push(texStatus[k]); }
    // ---- pacotes (pool): bloco brilhante + rastro
    const cb = canvas(64), gb = cb.getContext('2d');
    gb.translate(32, 32); const halo = gb.createRadialGradient(0, 0, 0, 0, 0, 30); halo.addColorStop(0, 'rgba(255,255,255,.9)'); halo.addColorStop(.35, 'rgba(255,255,255,.28)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    gb.fillStyle = halo; gb.fillRect(-32, -32, 64, 64); gb.fillStyle = '#fff'; gb.beginPath(); gb.moveTo(0, -13); gb.lineTo(9, 0); gb.lineTo(0, 13); gb.lineTo(-9, 0); gb.closePath(); gb.fill();
    const cp = canvas(32), gp = cp.getContext('2d'), rp = gp.createRadialGradient(16, 16, 0, 16, 16, 16); rp.addColorStop(0, 'rgba(255,255,255,1)'); rp.addColorStop(.4, 'rgba(255,255,255,.4)'); rp.addColorStop(1, 'rgba(255,255,255,0)'); gp.fillStyle = rp; gp.fillRect(0, 0, 32, 32);
    const trilhoC = new ParticleContainer({dynamicProperties: {position: true, vertex: true, color: true, rotation: false}}), cabecaC = new ParticleContainer({dynamicProperties: {position: true, vertex: true, color: true, rotation: true}});
    trilhoC.blendMode = 'add'; cabecaC.blendMode = 'add';
    const tTri = tex(cp), tCab = tex(cb);
    const pacotes = [];
    for (let i = 0; i < MAX; i++) {
      const cab = new Particle({texture: tCab, anchorX: .5, anchorY: .5, alpha: 0, scaleX: .1, scaleY: .1}); cabecaC.addParticle(cab);
      const tr = []; for (let j = 0; j < TRILHA; j++) { const p = new Particle({texture: tTri, anchorX: .5, anchorY: .5, alpha: 0, scaleX: .1, scaleY: .1}); trilhoC.addParticle(p); tr.push(p); }
      pacotes.push({ativo: false, atraso: 0, u: 0, v: 1, dir: 1, fio: null, g: null, tam: 1, cor: 0xffffff, cab, tr, grande: false});
    }
    // micro-partículas viajando junto aos vasos
    const NM = Math.round(80 * (o.densidade || 1)), microC = new ParticleContainer({dynamicProperties: {position: true, vertex: true, color: true, rotation: false}}); microC.blendMode = 'add';
    const micro = []; for (let i = 0; i < NM; i++) { const p = new Particle({texture: tTri, anchorX: .5, anchorY: .5, alpha: 0, scaleX: .1, scaleY: .1}); microC.addParticle(p); micro.push({p, g: null, f: null, u: 2, v: .1, dir: 1, a: .5, tam: .08}); }
    let lref = 300, grupos = [], links = [], densidade = o.densidade || 1, suave = false, qualidade = 1, vivos = 0, tempo = 0, tumT = 9, custo = 0;

    // ------------------------------------------------------------------ vasos
    function novoPath(nivel, K, N, w0, w1, extra) {
      return Object.assign({nivel, K, N, w0, w1, pai: null, t: 0, ang: 0, comp: 0, curv: 0, fase: 0, amp: 3, vs: 0, ve: 1, ativo: true, dist0: 0, len: 0,
        cx: new Float32Array(K), cy: new Float32Array(K), sx: new Float32Array(N), sy: new Float32Array(N), cum: new Float32Array(N), w: new Float32Array(N), off: 0}, extra);
    }
    /** Catmull-Rom uniforme: N amostras sobre K pontos de controle; acumula comprimento. */
    function amostra(p) {
      const {K, N, cx, cy, sx, sy, cum} = p; let acc = 0;
      for (let s = 0; s < N; s++) {
        const t = s / (N - 1) * (K - 1), i = Math.min(K - 2, t | 0), f = t - i, i0 = Math.max(0, i - 1), i2 = i + 1, i3 = Math.min(K - 1, i + 2), f2 = f * f, f3 = f2 * f;
        const a0 = -.5 * f3 + f2 - .5 * f, a1 = 1.5 * f3 - 2.5 * f2 + 1, a2 = -1.5 * f3 + 2 * f2 + .5 * f, a3 = .5 * f3 - .5 * f2;
        sx[s] = a0 * cx[i0] + a1 * cx[i] + a2 * cx[i2] + a3 * cx[i3]; sy[s] = a0 * cy[i0] + a1 * cy[i] + a2 * cy[i2] + a3 * cy[i3];
        if (s) acc += Math.hypot(sx[s] - sx[s - 1], sy[s] - sy[s - 1]); cum[s] = acc;
      }
      p.len = acc;
    }
    const pontoEm = (p, u, out) => { const f = Math.max(0, Math.min(.9999, u)) * (p.N - 1), i = f | 0, k = f - i; out.x = p.sx[i] + (p.sx[i + 1] - p.sx[i]) * k; out.y = p.sy[i] + (p.sy[i + 1] - p.sy[i]) * k; out.tx = p.sx[i + 1] - p.sx[i]; out.ty = p.sy[i + 1] - p.sy[i]; };
    const tmp = {x: 0, y: 0, tx: 1, ty: 0};

    function montarGrupo(pr, i, n) {
      const st = pr.status, pausado = st === 'pausado', paths = [], ang0 = -Math.PI / 2 + i * TAU / Math.max(1, n);
      const principal = novoPath(0, 6, 44, pausado ? 2.6 : CONF.raiz, pausado ? .9 : CONF.ponta, {curv: (rnd() * .16 + .05) * (rnd() < .5 ? -1 : 1), fase: rnd() * TAU, amp: pausado ? 2 : 5, raizOff: (rnd() - .5) * .5, fimOff: (rnd() - .5) * 14, comp: 1});
      paths.push(principal);
      const nB = pausado ? 1 : st === 'aguardando' ? 2 : 3 + (rnd() < .6 ? 1 : 0), usados = [];
      for (let b = 0; b < nB; b++) {
        let t; do { t = .18 + rnd() * .62; } while (usados.some(u => Math.abs(u - t) < .1)); usados.push(t);
        const l1 = novoPath(1, 5, 28, 0, .8, {pai: principal, t, ang: (b % 2 ? 1 : -1) * (.5 + rnd() * .6), comp: .2 + rnd() * .22, curv: (rnd() * .4 - .2), fase: rnd() * TAU, amp: 4, vs: .12 + t * .55, ve: Math.min(1, .5 + t * .5)});
        paths.push(l1);
        if (pausado) continue;
        const nS = 2;
        for (let s = 0; s < nS; s++) {
          const l2 = novoPath(2, 4, 20, 0, .7, {pai: l1, t: .28 + rnd() * .5, ang: (s % 2 ? 1 : -1) * (.55 + rnd() * .65), comp: .3 + rnd() * .3, curv: rnd() * .5 - .25, fase: rnd() * TAU, amp: 3, vs: l1.vs + .1, ve: 1});
          paths.push(l2);
          const nC = 1 + (rnd() < .5 ? 1 : 0);
          for (let c = 0; c < nC; c++) paths.push(novoPath(3, 3, 14, 0, .3, {pai: l2, t: .3 + rnd() * .5, ang: (c % 2 ? 1 : -1) * (.5 + rnd() * .8), comp: .28 + rnd() * .3, curv: rnd() * .6 - .3, fase: rnd() * TAU, amp: 2.2, vs: l2.vs + .1, ve: 1}));
        }
      }
      // geometria única do projeto
      let nv = 0; for (const p of paths) { p.off = nv; nv += p.N * 2; }
      const pos = new Float32Array(nv * 2), uv = new Float32Array(nv * 2), idx = new Uint32Array(paths.reduce((a, p) => a + (p.N - 1) * 6, 0)); let ii = 0;
      for (const p of paths) for (let k = 0; k < p.N; k++) {
        const v = p.vs + (p.ve - p.vs) * k / (p.N - 1), a = (p.off + k * 2) * 2; uv[a] = 0; uv[a + 1] = v; uv[a + 2] = 1; uv[a + 3] = v;
        if (k < p.N - 1) { const b = p.off + k * 2; idx[ii++] = b; idx[ii++] = b + 1; idx[ii++] = b + 2; idx[ii++] = b + 1; idx[ii++] = b + 3; idx[ii++] = b + 2; }
      }
      const geo = new MeshGeometry({positions: pos, uvs: uv, indices: idx}); geo.batchMode = 'no-batch';
      const mesh = new Mesh({geometry: geo, texture: texStatus[st] || texStatus.config}); mesh.blendMode = 'add'; camada.addChild(mesh);
      return {pr, i, ang0, paths, principal, mesh, geo, pos, forca: .45, flash: 0, cor: COR[st] ?? COR.config};
    }
    function limpaGrupo(g) { g.mesh.destroy(); }

    function montar(projetos) {
      for (const g of grupos) limpaGrupo(g); for (const l of links) l.mesh.destroy();
      grupos = []; links = [];
      for (const p of pacotes) { p.ativo = false; p.cab.alpha = 0; for (const t of p.tr) t.alpha = 0; }
      projetos.forEach((pr, i) => grupos.push(montarGrupo(pr, i, projetos.length)));
      // vasos que ligam projetos vizinhos (um corpo só)
      if (grupos.length > 1) for (let i = 0; i < grupos.length; i++) {
        const a = grupos[i], b = grupos[(i + 1) % grupos.length]; if (grupos.length === 2 && i === 1) break;
        const p = novoPath(1, 5, 30, 1.7, 1.7, {curv: .16 + rnd() * .12, fase: rnd() * TAU, amp: 3, vs: .35, ve: .8, ta: .66 + rnd() * .12, tb: .66 + rnd() * .12, ga: a, gb: b});
        const nv = p.N * 2, pos = new Float32Array(nv * 2), uv = new Float32Array(nv * 2), idx = new Uint32Array((p.N - 1) * 6); let ii = 0;
        for (let k = 0; k < p.N; k++) { const v = .35 + .45 * k / (p.N - 1), q = k * 4; uv[q] = 0; uv[q + 1] = v; uv[q + 2] = 1; uv[q + 3] = v; if (k < p.N - 1) { const bb = k * 2; idx[ii++] = bb; idx[ii++] = bb + 1; idx[ii++] = bb + 2; idx[ii++] = bb + 1; idx[ii++] = bb + 3; idx[ii++] = bb + 2; } }
        const geo = new MeshGeometry({positions: pos, uvs: uv, indices: idx}); geo.batchMode = 'no-batch';
        const mesh = new Mesh({geometry: geo, texture: texStatus.aguardando}); mesh.blendMode = 'add'; camada.addChild(mesh);
        links.push({p, mesh, geo, pos});
      }
      camada.addChild(microC); camada.addChild(trilhoC); camada.addChild(cabecaC); for (const m of micro) m.u = 2;
    }

    // largura ao longo do vaso (afunilamento + bulbos) com a onda de dilatação do coração
    function larguras(p, g, frente, dilata) {
      const {N, w, cum} = p, pausado = g && g.pr.status === 'pausado';
      for (let k = 0; k < N; k++) {
        const u = k / (N - 1);
        let base;
        if (p.nivel === 0) base = (p.w0 + (p.w1 - p.w0) * Math.pow(u, .8)) * (1 + (CONF.bulboRaiz - 1) * (1 - suaviza(0, .09, u))) * (1 + (CONF.bulboPlaneta - 1) * suaviza(.9, 1, u));
        else base = (p.w0 + (p.w1 - p.w0) * Math.pow(u, .9)) * (p.nivel === 1 && !p.pai ? 1 : 1);
        if (dilata && !pausado) { const x = (cum[k] + p.dist0 - frente) / CONF.onda.sigma; base *= 1 + CONF.onda.amp * dilata * Math.exp(-.5 * x * x); }
        w[k] = base;
      }
    }
    function escreve(p, pos) {
      const {N, sx, sy, w} = p;
      for (let k = 0; k < N; k++) {
        const a = k ? k - 1 : 0, b = k < N - 1 ? k + 1 : k; let tx = sx[b] - sx[a], ty = sy[b] - sy[a]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const h = w[k] * LARGURA_GEO * .5, nx = -ty * h, ny = tx * h, q = (p.off + k * 2) * 2;
        pos[q] = sx[k] + nx; pos[q + 1] = sy[k] + ny; pos[q + 2] = sx[k] - nx; pos[q + 3] = sy[k] - ny;
      }
    }

    // ------------------------------------------------------------------ pacotes (emissão provisória; a Etapa D substitui)
    function agendar(g, f, dir, cor, grande, atraso, vel) {
      const p = pacotes.find(x => !x.ativo); if (!p) return;
      p.ativo = true; p.atraso = atraso; p.u = dir > 0 ? 0 : 1; p.dir = dir; p.fio = f; p.g = g; p.cor = cor; p.grande = grande; p.v = vel * (suave ? .4 : 1);
      p.tam = grande ? 2.2 : .8 + rnd() * .5; p.cab.tint = cor; for (const t of p.tr) t.tint = cor;
    }
    nucleo.aoBater((tipo, f) => {
      if (tipo === 'tum') tumT = 0;
      if (suave && tipo === 'tum2') return;
      for (const g of grupos) {
        const st = g.pr.status; if (st === 'pausado') continue;
        const atraso = .03 + rnd() * .09;
        if (st === 'ok') { if (tipo === 'tum') agendar(g, g.principal, 1, 0xffcf8a, false, atraso, .85 + rnd() * .25); }
        else if (st === 'aguardando') { if (tipo === 'tum' && rnd() < .35) agendar(g, g.principal, 1, 0xe9b66e, false, atraso, .42); }
        else if (rnd() < (tipo === 'tum' ? 1 : .5)) agendar(g, g.principal, 1, st === 'erro' ? 0xff6a7c : 0xffc16c, false, atraso, 1.15);
      }
    });

    function microAtualiza(dt) {
      if (!grupos.length) return;
      const lim = Math.round(micro.length * qualidade);
      for (let i = 0; i < micro.length; i++) {
        const m = micro[i];
        if (i >= lim) { m.p.alpha = 0; continue; }
        m.u += m.dir * m.v * dt * (suave ? .4 : 1);
        if (m.u > 1 || m.u < 0) {
          const g = grupos[(rnd() * grupos.length) | 0]; if (g.pr.status === 'pausado' && rnd() < .8) { m.u = 2; m.p.alpha = 0; continue; }
          m.g = g; m.f = g.paths[(rnd() * g.paths.length) | 0]; m.dir = rnd() < .5 ? 1 : -1; m.u = m.dir > 0 ? 0 : 1; m.v = .07 + rnd() * .15; m.a = .35 + rnd() * .5; m.tam = .05 + rnd() * .07; m.p.tint = rnd() < .5 ? 0xffb070 : m.g.cor;
        }
        pontoEm(m.f, m.u, tmp); m.p.x = tmp.x + Math.sin(tempo * 3 + i) * 1.2; m.p.y = tmp.y + Math.cos(tempo * 2.4 + i) * 1.2;
        m.p.scaleX = m.p.scaleY = m.tam; m.p.alpha = m.a * Math.min(1, m.u * 6, (1 - m.u) * 6);
      }
    }

    // ------------------------------------------------------------------ quadro
    function atualizar(dt, nos, forcas, aoChegar) {
      const t0 = performance.now(); tempo += dt; tumT += dt;
      const nuc = nucleo.estado ? nucleo.estado() : null, env = nucleo.batida ? nucleo.batida.env : 0;
      let lmax = 0;
      const frente = tumT * (lref / CONF.onda.duracao), dilata = tumT < CONF.onda.duracao + .6 && !suave ? 1 : suave ? .25 * Math.max(0, 1 - tumT / CONF.onda.duracao) : 0;
      const rn = R * 1.34 * .98;
      for (const g of grupos) {
        const no = nos[g.i]; if (!no) continue;
        const pz = g.pr.status === 'pausado'; g.forca = forcas ? forcas[g.i] : .45; g.flash = Math.max(0, g.flash - dt * 2.5);
        for (const p of g.paths) {
          if (p.nivel === 0) {
            const dx = no.x, dy = no.y, dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist, nx = -uy, ny = ux, a = Math.atan2(dy, dx) + p.raizOff;
            const rx = Math.cos(a) * rn, ry = Math.sin(a) * rn, ex = no.x - ux * 40 + nx * p.fimOff * .3, ey = no.y - uy * 40 + ny * p.fimOff * .3, d2 = Math.hypot(ex - rx, ey - ry);
            const K = p.K;
            for (let k = 0; k < K; k++) {
              const f = k / (K - 1), bow = p.curv * d2 * Math.sin(Math.PI * f) + (k > 0 && k < K - 1 ? Math.sin(tempo * .7 + p.fase + k * 1.9) * p.amp + Math.sin(tempo * 1.3 + k * 2.7 + p.fase) * p.amp * .4 : 0);
              p.cx[k] = rx + (ex - rx) * f + nx * bow; p.cy[k] = ry + (ey - ry) * f + ny * bow;
            }
            p.dist0 = 0;
          } else {
            pontoEm(p.pai, p.t, tmp);
            const tl = Math.hypot(tmp.tx, tmp.ty) || 1, ang = Math.atan2(tmp.ty, tmp.tx) + p.ang, dx = Math.cos(ang), dy = Math.sin(ang), L = p.pai.len * p.comp, px = -dy, py = dx, K = p.K;
            p.dist0 = p.pai.dist0 + p.pai.len * p.t;
            for (let k = 0; k < K; k++) {
              const f = k / (K - 1), bow = p.curv * L * Math.sin(Math.PI * f) + (k > 0 ? Math.sin(tempo * .9 + p.fase + k * 2.1) * p.amp : 0);
              p.cx[k] = tmp.x + dx * L * f + px * bow; p.cy[k] = tmp.y + dy * L * f + py * bow;
            }
            if (p.nivel === 1) p.w0 = Math.max(.9, p.pai.w[Math.max(0, Math.min(p.pai.N - 1, Math.round(p.t * (p.pai.N - 1))))] * .5);
            else p.w0 = Math.max(.6, p.pai.w0 * .55);
            p.ativo = !(p.nivel === 3 && qualidade < 1);
          }
          if (!p.ativo) { for (let k = 0; k < p.N; k++) p.w[k] = 0; if (p.nivel) { amostra(p); escreve(p, g.pos); } continue; }
          amostra(p); larguras(p, g, frente, dilata); escreve(p, g.pos); lmax = Math.max(lmax, p.dist0 + p.len);
        }
        g.geo.attributes.aPosition.buffer.update();
        g.mesh.alpha = Math.min(1, (pz ? .35 : .55) + g.forca * .5 + env * .12);
      }
      // vasos entre vizinhos
      for (const l of links) {
        const A = l.p.ga.principal, B = l.p.gb.principal, p = l.p; if (!A.sx) continue;
        pontoEm(A, p.ta, tmp); const ax = tmp.x, ay = tmp.y; pontoEm(B, p.tb, tmp); const bx = tmp.x, by = tmp.y;
        const mx = (ax + bx) / 2, my = (ay + by) / 2, ml = Math.hypot(mx, my) || 1, ox = mx / ml, oy = my / ml, ch = Math.hypot(bx - ax, by - ay);
        for (let k = 0; k < p.K; k++) { const f = k / (p.K - 1), bow = p.curv * ch * Math.sin(Math.PI * f) + (k > 0 && k < p.K - 1 ? Math.sin(tempo * .8 + p.fase + k) * p.amp : 0); p.cx[k] = ax + (bx - ax) * f + ox * bow; p.cy[k] = ay + (by - ay) * f + oy * bow; }
        amostra(p); const parar = l.p.ga.pr.status === 'pausado' || l.p.gb.pr.status === 'pausado';
        for (let k = 0; k < p.N; k++) p.w[k] = (parar ? 1 : 1.7) * (.7 + .3 * Math.sin(Math.PI * k / (p.N - 1)));
        escreve(p, l.pos); l.geo.attributes.aPosition.buffer.update();
        l.mesh.alpha = parar ? .22 : .5 + .3 * Math.max(l.p.ga.forca, l.p.gb.forca);
      }
      microAtualiza(dt);
      // pacotes
      vivos = 0; const nTri = qualidade < 1 ? 3 : TRILHA;
      for (const p of pacotes) {
        if (!p.ativo) continue;
        if (p.atraso > 0) { p.atraso -= dt; continue; }
        vivos++; p.u += p.dir * p.v * dt * (p.grande ? .75 : 1);
        const fio = p.fio;
        if (p.u >= 1 || p.u <= 0) {
          if (p.dir > 0) {
            p.g.flash = 1; aoChegar?.(p.g.i, p.grande);
            if (!p.grande && p.g.pr.status === 'ok' && rnd() < .55) agendar(p.g, p.g.principal, -1, 0x79e9b4, false, .05 + rnd() * .15, .8 + rnd() * .3);
          }
          p.ativo = false; p.cab.alpha = 0; for (const t of p.tr) t.alpha = 0; continue;
        }
        pontoEm(fio, p.u, tmp); const x = tmp.x, y = tmp.y, ang = Math.atan2(tmp.ty, tmp.tx);
        const fade = Math.min(1, p.u * 8, (1 - p.u) * 8);
        p.cab.x = x; p.cab.y = y; p.cab.rotation = ang; p.cab.scaleX = p.cab.scaleY = .2 * p.tam; p.cab.alpha = fade * .95;
        for (let j = 0; j < TRILHA; j++) {
          const t = p.tr[j]; if (j >= nTri) { t.alpha = 0; continue; }
          const uu = p.u - p.dir * (j + 1) * .02; if (uu < 0 || uu > 1) { t.alpha = 0; continue; }
          pontoEm(fio, uu, tmp); t.x = tmp.x; t.y = tmp.y; const k = 1 - (j + 1) / (TRILHA + 1); t.scaleX = t.scaleY = (.42 * k + .06) * p.tam; t.alpha = fade * .8 * k;
        }
      }
      if (lmax > 0) lref = lmax;   // a onda leva ~1,2 s para chegar ao fim do ramo mais longo
      custo = performance.now() - t0;
    }
    function evento(id, tipo) {
      const g = grupos.find(x => x.pr.id === id); if (!g) return;
      const cor = tipo === 'pedido' ? 0x8fcfff : 0xffe56e;
      agendar(g, g.principal, -1, cor, true, 0, .7); agendar(g, g.principal, -1, cor, true, .25, .7);
    }
    const contagem = () => grupos.map(g => ({id: g.pr.id, principais: g.paths.filter(p => p.nivel === 0).length, ramos: g.paths.filter(p => p.nivel === 1).length, subramos: g.paths.filter(p => p.nivel === 2).length, capilares: g.paths.filter(p => p.nivel === 3).length}));
    const espessuras = () => grupos.map(g => { const p = g.principal; return {id: g.pr.id, raiz: +p.w[0].toFixed(2), ponta: +p.w[p.N - 1].toFixed(2), raizBase: p.w0, pontaBase: p.w1, aos90: +p.w[Math.round(.88 * (p.N - 1))].toFixed(2)}; });
    return {principal: i => grupos[i] && grupos[i].principal, tumDesde: () => tumT, montar, atualizar, evento, flash: i => grupos[i]?.flash || 0, vivos: () => vivos, grupos: () => grupos.length, fios: () => grupos.reduce((a, g) => a + g.paths.length, 0) + links.length,
      contagem, espessuras, custo: () => custo, links: () => links.length,
      amostra: () => pacotes.filter(p => p.ativo && p.atraso <= 0).slice(0, 3).map(p => ({u: p.u, x: p.cab.x, y: p.cab.y, a: p.cab.alpha})),
      suave(v) { suave = !!v; }, qualidade(q) { qualidade = q; }, densidade(d) { densidade = d; }, camada,
      destruir() { camada.destroy({children: true}); texturas.forEach(t => t.destroy(true)); }};
  }
  return {criar};
})();
