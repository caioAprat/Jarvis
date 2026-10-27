'use strict';
/**
 * Fios do núcleo aos projetos e pacotes de dados. Tudo calculado em 2D a cada quadro a partir da posição ATUAL dos
 * planetas; linhas em Mesh 'line-list' com buffers reaproveitados e pacotes em pool (sem alocar por quadro).
 */
window.FiosJarvo = (() => {
  const TAU = Math.PI * 2, SEG = 28, TRILHA = 6, MAX = 160;
  const semente = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const COR = {ok: 0x79e9b4, atencao: 0xffc16c, erro: 0xff5e74, aguardando: 0xe9b66e, config: 0xc2ab8c, pausado: 0x776b61};
  const FIOS = {ok: 5, atencao: 5, erro: 5, aguardando: 3, config: 3, pausado: 2};
  const canvas = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };

  function criar(PIXI, o) {
    const {Container, Mesh, MeshGeometry, Texture, ParticleContainer, Particle} = PIXI, mundo = o.mundo, nucleo = o.nucleo, R = nucleo.raio, rnd = semente(8675309);
    const camada = new Container(), texturas = [];
    mundo.addChild(camada);
    const tex = c => { const t = Texture.from(c); texturas.push(t); return t; };
    // textura do bloco (losango brilhante) e do rastro (ponto suave)
    const cb = canvas(64), gb = cb.getContext('2d');
    gb.translate(32, 32); const halo = gb.createRadialGradient(0, 0, 0, 0, 0, 30); halo.addColorStop(0, 'rgba(255,255,255,.9)'); halo.addColorStop(.35, 'rgba(255,255,255,.28)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    gb.fillStyle = halo; gb.fillRect(-32, -32, 64, 64); gb.fillStyle = '#fff'; gb.beginPath(); gb.moveTo(0, -13); gb.lineTo(9, 0); gb.lineTo(0, 13); gb.lineTo(-9, 0); gb.closePath(); gb.fill();
    const cp = canvas(32), gp = cp.getContext('2d'), rp = gp.createRadialGradient(16, 16, 0, 16, 16, 16); rp.addColorStop(0, 'rgba(255,255,255,1)'); rp.addColorStop(.4, 'rgba(255,255,255,.4)'); rp.addColorStop(1, 'rgba(255,255,255,0)'); gp.fillStyle = rp; gp.fillRect(0, 0, 32, 32);
    const trilhoC = new ParticleContainer({dynamicProperties: {position: true, vertex: true, color: true, rotation: false}}), cabecaC = new ParticleContainer({dynamicProperties: {position: true, vertex: true, color: true, rotation: true}});
    trilhoC.blendMode = 'add'; cabecaC.blendMode = 'add';
    const tTri = tex(cp), tCab = tex(cb);
    const trilhos = [], pacotes = [];
    for (let i = 0; i < MAX; i++) {
      const cab = new Particle({texture: tCab, anchorX: .5, anchorY: .5, alpha: 0, scaleX: .1, scaleY: .1}); cabecaC.addParticle(cab);
      const tr = []; for (let j = 0; j < TRILHA; j++) { const p = new Particle({texture: tTri, anchorX: .5, anchorY: .5, alpha: 0, scaleX: .1, scaleY: .1}); trilhoC.addParticle(p); tr.push(p); }
      pacotes.push({ativo: false, atraso: 0, u: 0, v: 1, dir: 1, fio: null, g: null, tam: 1, cor: 0xffffff, cab, tr, grande: false});
    }
    let grupos = [], secundarios = null, densidade = o.densidade || 1, suave = false, qualidade = 1, vivos = 0;

    function malha(nFios, seg, cor, alpha) {
      const nv = nFios * (seg + 1), idx = new Uint32Array(nFios * seg * 2);
      for (let f = 0; f < nFios; f++) for (let s = 0; s < seg; s++) { const k = (f * seg + s) * 2; idx[k] = f * (seg + 1) + s; idx[k + 1] = f * (seg + 1) + s + 1; }
      const geo = new MeshGeometry({positions: new Float32Array(nv * 2), indices: idx, topology: 'line-list'}); geo.batchMode = 'no-batch';
      const m = new Mesh({geometry: geo, texture: Texture.WHITE}); m.tint = cor; m.alpha = alpha; m.blendMode = 'add'; camada.addChild(m); return {geo, m, nFios, seg};
    }
    function pontaMalha(nFios, seg, de, cor, alpha) {
      const idx = new Uint32Array(nFios * (seg - de) * 2); let k = 0;
      for (let f = 0; f < nFios; f++) for (let s = de; s < seg; s++) { idx[k++] = f * (seg + 1) + s; idx[k++] = f * (seg + 1) + s + 1; }
      const nv = nFios * (seg + 1), geo = new MeshGeometry({positions: new Float32Array(nv * 2), indices: idx, topology: 'line-list'}); geo.batchMode = 'no-batch';
      const m = new Mesh({geometry: geo, texture: Texture.WHITE}); m.tint = cor; m.alpha = alpha; m.blendMode = 'add'; camada.addChild(m); return {geo, m};
    }

    /** (re)cria os feixes: um por projeto, 2 a 5 fios cada, mais fios secundários entre vizinhos. */
    function montar(projetos) {
      for (const g of grupos) { g.base.m.destroy(); g.ponta.m.destroy(); g.base2.destroy(); g.ponta2.destroy(); }
      secundarios?.m.destroy(); grupos = []; secundarios = null;
      for (const p of pacotes) { p.ativo = false; p.cab.alpha = 0; for (const t of p.tr) t.alpha = 0; }
      projetos.forEach((pr, i) => {
        const n = Math.max(2, Math.round((FIOS[pr.status] ?? 3) * (densidade < 1 ? .6 : 1)));
        const fios = [];
        for (let k = 0; k < n; k++) fios.push({curv: (rnd() * .1 + .05 + k * .03) * (k % 2 ? 1 : -1), spread: (k - (n - 1) / 2) * .075 + (rnd() - .5) * .03, off: (k - (n - 1) / 2) * 7 + (rnd() - .5) * 4, x: new Float32Array(4), y: new Float32Array(4)});
        const cor = COR[pr.status] ?? COR.config;
        const base = malha(n, SEG, 0xff9a45, pr.status === 'pausado' ? .1 : .38), ponta = pontaMalha(n, SEG, Math.round(SEG * .5), cor, pr.status === 'pausado' ? .12 : .85);
        // segunda cópia deslocada 0,7 px: engrossa o fio sem custo de geometria
        const base2 = new Mesh({geometry: base.geo, texture: Texture.WHITE}), ponta2 = new Mesh({geometry: ponta.geo, texture: Texture.WHITE});
        for (const [m, c] of [[base2, 0xff9a45], [ponta2, cor]]) { m.tint = c; m.blendMode = 'add'; m.position.set(.7, .5); camada.addChild(m); }
        grupos.push({pr, i, fios, base, ponta, base2, ponta2, cor, fluxo: 0, forca: .45, flash: 0});
      });
      camada.addChild(trilhoC); camada.addChild(cabecaC);
      if (projetos.length > 1) {
        secundarios = malha(projetos.length * 2, 24, 0xd88a4a, .2);
        secundarios.curvas = []; for (let i = 0; i < projetos.length * 2; i++) secundarios.curvas.push({a: i >> 1, b: ((i >> 1) + 1) % projetos.length, curv: (i & 1 ? 1 : -1) * (.18 + rnd() * .1)});
      }
    }
    const cubica = (f, t, eixo) => { const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t, v = eixo ? f.y : f.x; return a * v[0] + b * v[1] + c * v[2] + d * v[3]; };

    function agendar(g, f, dir, cor, grande, atraso, vel) {
      const p = pacotes.find(x => !x.ativo); if (!p) return;
      p.ativo = true; p.atraso = atraso; p.u = dir > 0 ? 0 : 1; p.dir = dir; p.fio = f; p.g = g; p.cor = cor; p.grande = grande; p.v = vel * (suave ? .4 : 1);
      p.tam = grande ? 2.2 : .8 + rnd() * .5; p.cab.tint = cor; for (const t of p.tr) t.tint = cor;
    }
    // Cada batimento emite pacotes em cada fio, escalonados 30–120 ms.
    nucleo.aoBater((tipo, f) => {
      if (suave && tipo === 'tum2') return;
      for (const g of grupos) {
        const st = g.pr.status; if (st === 'pausado') continue;
        const intens = tipo === 'tum' ? 1 : .5;
        g.fios.forEach((fio, k) => {
          const atraso = .03 + rnd() * .09;
          if (st === 'ok') { if (tipo === 'tum' || (k % 2 === 0 && qualidade >= 1)) agendar(g, fio, 1, 0xffcf8a, false, atraso, .85 + rnd() * .25); }
          else if (st === 'aguardando') { if (tipo === 'tum' && rnd() < .35) agendar(g, fio, 1, 0xe9b66e, false, atraso, .42); }
          else { if (rnd() < intens) agendar(g, fio, 1, st === 'erro' ? 0xff6a7c : 0xffc16c, false, atraso, 1.15); }
        });
      }
    });

    let tempo = 0;
    function atualizar(dt, nos, forcas, aoChegar) {
      tempo += dt;
      const cx = 0, cy = 0, rn = R * 1.36;
      for (const g of grupos) {
        const no = nos[g.i]; if (!no) continue;
        const dx = no.x - cx, dy = no.y - cy, ang = Math.atan2(dy, dx), dist = Math.hypot(dx, dy);
        g.forca = forcas ? forcas[g.i] : .45;
        g.flash = Math.max(0, g.flash - dt * 2.5);
        const pz = g.pr.status === 'pausado';
        g.base.m.alpha = Math.min(1, (pz ? .08 : .3) + g.forca * .6); g.ponta.m.alpha = Math.min(1, (pz ? .12 : .45) + g.forca * .9);
        g.base2.alpha = g.base.m.alpha * .6; g.ponta2.alpha = g.ponta.m.alpha * .6;
        const pa = g.base.geo.positions, pb = g.ponta.geo.positions;
        g.fios.forEach((fio, k) => {
          const a = ang + fio.spread, nx = -Math.sin(ang), ny = Math.cos(ang);
          fio.x[0] = cx + Math.cos(a) * rn; fio.y[0] = cy + Math.sin(a) * rn;
          fio.x[3] = no.x + nx * fio.off; fio.y[3] = no.y + ny * fio.off;
          const c1 = dist * fio.curv, c2 = dist * fio.curv * .55;
          fio.x[1] = fio.x[0] + (fio.x[3] - fio.x[0]) * .33 + nx * c1; fio.y[1] = fio.y[0] + (fio.y[3] - fio.y[0]) * .33 + ny * c1;
          fio.x[2] = fio.x[0] + (fio.x[3] - fio.x[0]) * .68 + nx * c2; fio.y[2] = fio.y[0] + (fio.y[3] - fio.y[0]) * .68 + ny * c2;
          const base = k * (SEG + 1) * 2;
          for (let s = 0; s <= SEG; s++) { const t = s / SEG; pa[base + s * 2] = cubica(fio, t, 0); pa[base + s * 2 + 1] = cubica(fio, t, 1); }
        });
        pb.set(pa); g.base.geo.attributes.aPosition.buffer.update(); g.ponta.geo.attributes.aPosition.buffer.update();
      }
      if (secundarios) {
        const pos = secundarios.geo.positions;
        secundarios.curvas.forEach((c, j) => {
          const A = nos[c.a], B = nos[c.b]; if (!A || !B) return;
          const dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l * l * c.curv, ny = dx / l * l * c.curv, base = j * 25 * 2;
          for (let s = 0; s <= 24; s++) { const t = s / 24, u = 1 - t, k = 2 * u * t; pos[base + s * 2] = u * u * A.x + k * (A.x + dx * .5 + nx) + t * t * B.x; pos[base + s * 2 + 1] = u * u * A.y + k * (A.y + dy * .5 + ny) + t * t * B.y; }
        });
        secundarios.geo.attributes.aPosition.buffer.update();
        secundarios.m.alpha = .12 + .12 * (forcas ? Math.max(...forcas) : .4);
      }
      // pacotes
      vivos = 0; const nTri = qualidade < 1 ? 3 : TRILHA;
      for (const p of pacotes) {
        if (!p.ativo) continue;
        if (p.atraso > 0) { p.atraso -= dt; continue; }
        vivos++; p.u += p.dir * p.v * dt * (p.grande ? .75 : 1);
        const fio = p.fio;
        if (p.u >= 1 || p.u <= 0) {
          if (p.dir > 0 && !p.grande) {
            // chegou ao planeta: flash e, se está no ar, um pacote de volta por outro fio
            p.g.flash = 1; aoChegar?.(p.g.i, p.grande);
            if (p.g.pr.status === 'ok' && rnd() < .55) { const f2 = p.g.fios[(rnd() * p.g.fios.length) | 0]; agendar(p.g, f2, -1, 0x79e9b4, false, .05 + rnd() * .15, .8 + rnd() * .3); }
          } else if (p.dir > 0) { p.g.flash = 1; aoChegar?.(p.g.i, true); }
          p.ativo = false; p.cab.alpha = 0; for (const t of p.tr) t.alpha = 0; continue;
        }
        const x = cubica(fio, p.u, 0), y = cubica(fio, p.u, 1), x2 = cubica(fio, Math.min(1, p.u + .01), 0), y2 = cubica(fio, Math.min(1, p.u + .01), 1);
        const fade = Math.min(1, p.u * 8, (1 - p.u) * 8);
        p.cab.x = x; p.cab.y = y; p.cab.rotation = Math.atan2(y2 - y, x2 - x) * p.dir + Math.PI / 4 * 0; p.cab.scaleX = p.cab.scaleY = .2 * p.tam; p.cab.alpha = fade * .95;
        for (let j = 0; j < TRILHA; j++) {
          const t = p.tr[j]; if (j >= nTri) { t.alpha = 0; continue; }
          const uu = p.u - p.dir * (j + 1) * .02; if (uu < 0 || uu > 1) { t.alpha = 0; continue; }
          t.x = cubica(fio, uu, 0); t.y = cubica(fio, uu, 1); const k = 1 - (j + 1) / (TRILHA + 1); t.scaleX = t.scaleY = (.42 * k + .06) * p.tam; t.alpha = fade * .8 * k;
        }
      }
    }
    // Evento real (aviso, pedido): pacotes maiores e de outra cor, do projeto para o núcleo.
    function evento(id, tipo) {
      const g = grupos.find(x => x.pr.id === id); if (!g) return;
      const cor = tipo === 'pedido' ? 0x8fcfff : 0xffe56e;
      g.fios.forEach((f, k) => { if (k < 3) agendar(g, f, -1, cor, true, k * .12, .7); });
    }
    return {amostra: () => pacotes.filter(p => p.ativo && p.atraso <= 0).slice(0, 3).map(p => ({u: p.u, x: p.cab.x, y: p.cab.y, a: p.cab.alpha, sx: p.cab.scaleX, t: p.tr[0].x, ta: p.tr[0].alpha})), montar, atualizar, evento, flash: i => grupos[i]?.flash || 0, vivos: () => vivos, grupos: () => grupos.length, fios: () => grupos.reduce((a, g) => a + g.fios.length, 0) + (secundarios ? secundarios.nFios : 0),
      suave(v) { suave = !!v; }, qualidade(q) { qualidade = q; }, densidade(d) { densidade = d; }, camada,
      destruir() { camada.destroy({children: true}); texturas.forEach(t => t.destroy(true)); }};
  }
  return {criar};
})();
