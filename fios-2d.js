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
    // ---- arquivos (glifos nítidos em atlas de 6 tipos), brilho/rastro (pontos suaves) e fagulhas da dissolução
    const CELULA = 96, TIPOS = ['planilha', 'documento', 'imagem', 'pdf', 'dados', 'recibo'];
    const COR_TIPO = {planilha: 0x9bf0c0, documento: 0xffe2b8, imagem: 0xffc27a, pdf: 0xff9a86, dados: 0xa6d6ff, recibo: 0xffd98a};
    // tipo de arquivo que combina com cada projeto
    const TIPOS_PROJ = {planilha: ['planilha', 'planilha', 'dados', 'documento'], assistente: ['recibo', 'recibo', 'pdf', 'dados'], gabinete: ['documento', 'documento', 'pdf', 'imagem'], painel: ['dados', 'recibo', 'imagem'], pedalada: ['imagem', 'documento', 'recibo'], atrasos: ['planilha', 'dados', 'documento'], cacador: ['dados', 'documento', 'pdf'], jarvis: ['dados', 'documento']};
    const atlas = canvas(CELULA); atlas.width = CELULA * TIPOS.length;
    (() => {
      const g = atlas.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.fillStyle = '#fff';
      TIPOS.forEach((t, i) => {
        g.save(); g.translate(i * CELULA + CELULA / 2, CELULA / 2); g.lineWidth = 5;
        // folha com a dobra no canto (base de todos, menos o recibo)
        const folha = () => { g.beginPath(); g.moveTo(-24, -34); g.lineTo(10, -34); g.lineTo(24, -20); g.lineTo(24, 34); g.lineTo(-24, 34); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(10, -34); g.lineTo(10, -20); g.lineTo(24, -20); g.stroke(); };
        if (t === 'recibo') { g.beginPath(); g.moveTo(-22, -34); g.lineTo(22, -34); g.lineTo(22, 34); for (let k = 0; k < 5; k++) { g.lineTo(22 - (k + .5) * 8.8, 26); g.lineTo(22 - (k + 1) * 8.8, 34); } g.lineTo(-22, 34); g.closePath(); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(-12, -20); g.lineTo(12, -20); g.moveTo(-12, -8); g.lineTo(12, -8); g.moveTo(-12, 4); g.lineTo(2, 4); g.stroke(); g.fillRect(2, 11, 10, 7); }
        else {
          folha(); g.lineWidth = 4;
          if (t === 'planilha') { g.beginPath(); g.moveTo(-14, -6); g.lineTo(14, -6); g.moveTo(-14, 8); g.lineTo(14, 8); g.moveTo(-14, 22); g.lineTo(14, 22); g.moveTo(0, -6); g.lineTo(0, 28); g.stroke(); }
          else if (t === 'documento') { g.beginPath(); g.moveTo(-14, -4); g.lineTo(14, -4); g.moveTo(-14, 8); g.lineTo(14, 8); g.moveTo(-14, 20); g.lineTo(4, 20); g.stroke(); }
          else if (t === 'imagem') { g.beginPath(); g.moveTo(-16, 26); g.lineTo(-5, 8); g.lineTo(3, 18); g.lineTo(9, 10); g.lineTo(16, 26); g.stroke(); g.beginPath(); g.arc(-6, -4, 5, 0, 7); g.fill(); }
          else if (t === 'pdf') { g.font = '800 17px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 1; g.fillText('PDF', 0, 14); g.beginPath(); g.moveTo(-14, -6); g.lineTo(14, -6); g.lineWidth = 4; g.stroke(); }
          else if (t === 'dados') { g.font = '800 26px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('{ }', 0, 10); }
        }
        g.restore();
      });
    })();
    const sAtlas = tex(atlas);
    const quadros = TIPOS.map((t, i) => { const q = new Texture({source: sAtlas.source, frame: new PIXI.Rectangle(i * CELULA, 0, CELULA, CELULA)}); texturas.push(q); return q; });
    const cp = canvas(32), gp = cp.getContext('2d'), rp = gp.createRadialGradient(16, 16, 0, 16, 16, 16); rp.addColorStop(0, 'rgba(255,255,255,1)'); rp.addColorStop(.4, 'rgba(255,255,255,.4)'); rp.addColorStop(1, 'rgba(255,255,255,0)'); gp.fillStyle = rp; gp.fillRect(0, 0, 32, 32);
    const tTri = tex(cp);
    const dinam = {dynamicProperties: {position: true, vertex: true, color: true, rotation: true}};
    // um ParticleContainer por tipo (mesma textura base por container): glifos 4 por tipo; brilho+rastro e fagulhas num só de pontos
    const glifosC = quadros.map(q => { const c = new ParticleContainer(dinam); c.blendMode = 'add'; c.tipoTex = q; return c; });
    const MAXA = 24, TRL = 3, NF = 48;
    glifosC.forEach(c => { for (let i = 0; i < MAXA; i++) c.addParticle(new Particle({texture: c.tipoTex, anchorX: .5, anchorY: .5, alpha: 0, scaleX: .1, scaleY: .1})); });
    const brilhoC = new ParticleContainer(dinam); brilhoC.blendMode = 'add';
    const arquivos = [];
    for (let i = 0; i < MAXA; i++) {
      const gl = new Particle({texture: tTri, anchorX: .5, anchorY: .5, alpha: 0, scaleX: .1, scaleY: .1}); brilhoC.addParticle(gl);
      const tr = []; for (let j = 0; j < TRL; j++) { const t = new Particle({texture: tTri, anchorX: .5, anchorY: .5, alpha: 0, scaleX: .1, scaleY: .1}); brilhoC.addParticle(t); tr.push(t); }
      arquivos.push({ativo: false, atraso: 0, s: 0, dir: 1, rota: null, g: null, tipo: 0, tam: 1, v0: 100, fase: 0, incl: 0, parada: -1, paradaDur: 0, parando: 0, morre: 0, grande: false, cor: 0xffffff, gl, tr, gp: null});
    }
    const fagulhas = []; for (let i = 0; i < NF; i++) { const p = new Particle({texture: tTri, anchorX: .5, anchorY: .5, alpha: 0, scaleX: .1, scaleY: .1}); brilhoC.addParticle(p); fagulhas.push({p, x: 0, y: 0, vx: 0, vy: 0, t: 1, dur: .5}); }
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
        const nS = densidade < 1 ? 1 : 2;
        for (let s = 0; s < nS; s++) {
          const l2 = novoPath(2, 4, 20, 0, .7, {pai: l1, t: .28 + rnd() * .5, ang: (s % 2 ? 1 : -1) * (.55 + rnd() * .65), comp: .3 + rnd() * .3, curv: rnd() * .5 - .25, fase: rnd() * TAU, amp: 3, vs: l1.vs + .1, ve: 1});
          paths.push(l2);
          const nC = densidade < 1 ? 0 : 1 + (rnd() < .5 ? 1 : 0);
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
      for (const f of arquivos) { f.ativo = false; f.gl.alpha = 0; for (const t of f.tr) t.alpha = 0; if (f.gp) { f.gp.alpha = 0; f.gp.__uso = false; f.gp = null; } }
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
      camada.addChild(microC); camada.addChild(brilhoC); for (const c of glifosC) camada.addChild(c); for (const m of micro) m.u = 2;
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

    // ------------------------------------------------------------------ arquivos nas veias (processo estocástico por veia)
    const exp = media => -Math.log(1 - rnd()) * media, LOG = [];
    const gaussiano = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    const TAXA = {ok: [.22, .55], atencao: [.3, .5], erro: [.5, .8], aguardando: [.07, .13], config: [.08, .14], pausado: [0, 0]};
    const VEL = {ok: [80, 135], atencao: [95, 130], erro: [140, 190], aguardando: [32, 52], config: [40, 60], pausado: [0, 0]};
    nucleo.aoBater((tipo, f) => { if (tipo === 'tum') tumT = 0; });   // o coração só modula (dilatação, +10% de fluxo); não dispara nada
    function rotaAleatoria(g) {
      const m = g.principal, ramos = g.paths.filter(p => p.nivel === 1 && p.pai === m);
      if (ramos.length && rnd() < .4) { const r = ramos[(rnd() * ramos.length) | 0]; return {a: m, ta: r.t, b: r}; }
      return {a: m, ta: 1, b: null};
    }
    const compRota = r => r.b ? r.a.len * r.ta + r.b.len : r.a.len;
    function lancar(g, dir, opc = {}) {
      const f = arquivos.find(x => !x.ativo); if (!f || (qualidade < 1 && arquivos.filter(x => x.ativo).length >= 14)) return null;
      const st = g.pr.status, grande = opc.grande ?? (rnd() < .06 && !suave), pool = TIPOS_PROJ[g.pr.id] || ['documento', 'dados', 'imagem'];
      f.ativo = true; f.g = g; f.dir = dir; f.rota = rotaAleatoria(g); f.grande = grande; f.atraso = opc.atraso || 0;
      f.tipo = opc.tipo ?? TIPOS.indexOf(rnd() < .8 ? pool[(rnd() * pool.length) | 0] : TIPOS[(rnd() * TIPOS.length) | 0]);
      const vr = VEL[st] || VEL.config; f.v0 = (vr[0] + rnd() * (vr[1] - vr[0])) * (grande ? .55 : 1) * (suave ? .35 : 1);
      f.tam = (grande ? 24 : 13 + rnd() * 5) * (opc.tam || 1); f.incl = (rnd() - .5) * .9; f.fase = rnd() * TAU; f.morre = 0;
      f.cor = opc.cor ?? COR_TIPO[TIPOS[f.tipo]];
      const L = compRota(f.rota); f.s = dir > 0 ? 0 : L;
      f.parada = rnd() < .3 && !suave ? L * (.2 + rnd() * .6) : -1; f.paradaDur = .25 + rnd() * .6; f.parando = 0;
      LOG.push({t: tempo, id: g.pr.id, tipo: TIPOS[f.tipo]}); if (LOG.length > 4000) LOG.shift();
      return f;
    }
    function emite(g) {
      const st = g.pr.status; if (st === 'pausado') return;
      const sentido = st === 'ok' || st === 'erro' ? (rnd() < .6 ? 1 : -1) : 1;
      const n = rnd() < .14 && !suave ? 2 + ((rnd() * 3) | 0) : 1;     // rajadas ocasionais de 2–4
      for (let k = 0; k < n; k++) lancar(g, sentido, {atraso: k * (.07 + rnd() * .13)});
    }
    function posRota(f, s, out) {
      const r = f.rota, Lm = r.b ? r.a.len * r.ta : r.a.len;
      if (!r.b || s <= Lm) pontoEm(r.a, Math.min(1, s / Math.max(1, r.a.len)), out);
      else pontoEm(r.b, Math.min(1, (s - Lm) / Math.max(1, r.b.len)), out);
    }
    function arquivosAtualiza(dt, aoChegar, env) {
      // emissão: intervalos exponenciais com taxa própria por veia (o coração acelera ~10% durante a dilatação)
      for (const g of grupos) {
        if (g.pr.status === 'pausado') continue;
        if (g.proxEmit === undefined) { const [a, b] = TAXA[g.pr.status] || TAXA.config; g.taxa = (a + rnd() * (b - a)) * (suave ? .3 : 1) * (qualidade < 1 ? .7 : 1); g.proxEmit = tempo + exp(1 / g.taxa) * rnd(); }
        if (tempo >= g.proxEmit) { emite(g); g.proxEmit = tempo + exp(1 / (g.taxa * (1 + .1 * env))); }
      }
      vivos = 0;
      for (const f of arquivos) {
        if (!f.ativo) { f.gl.alpha = 0; continue; }
        if (f.atraso > 0) { f.atraso -= dt; continue; }
        vivos++;
        const gp = glifosC[f.tipo];
        if (f.morre > 0) {                                           // dissolve em partículas ao chegar
          f.morre -= dt; const u = Math.max(0, f.morre / .28);
          if (f.morre <= 0) { f.ativo = false; if (f.gp) { f.gp.alpha = 0; f.gp = null; } f.gl.alpha = 0; for (const t of f.tr) t.alpha = 0; continue; }
          f.gp.alpha = u; f.gp.scaleX = f.gp.scaleY = f.tam / CELULA * (1 + (1 - u) * .8); f.gl.alpha = u * .6; continue;
        }
        if (!f.gp) { f.gp = glifosC[f.tipo].particleChildren.find(p => !p.__uso); if (!f.gp) { f.ativo = false; continue; } f.gp.__uso = true; f.gp.tint = f.cor; }
        const L = compRota(f.rota);
        let v = f.v0 * (1 + .5 * Math.sin(tempo * (1.1 + f.fase * .2) + f.fase) + .25 * Math.sin(tempo * 2.7 + f.fase * 2)) * (1 + .1 * env);
        v = Math.max(f.v0 * .2, v);
        if (f.parada >= 0 && f.parando < f.paradaDur && (f.dir > 0 ? f.s >= f.parada : f.s <= f.parada)) { f.parando += dt; v = 0; }
        f.s += f.dir * v * dt;
        if ((f.dir > 0 && f.s >= L) || (f.dir < 0 && f.s <= 0)) {
          if (f.dir > 0) { f.g.flash = 1; aoChegar?.(f.g.i, f.grande); for (let k = 0; k < 6; k++) { const fg = fagulhas.find(x => x.t >= x.dur); if (!fg) break; posRota(f, L, tmp); fg.x = tmp.x; fg.y = tmp.y; const a = rnd() * TAU, sp = 18 + rnd() * 34; fg.vx = Math.cos(a) * sp; fg.vy = Math.sin(a) * sp; fg.t = 0; fg.dur = .45 + rnd() * .35; fg.p.tint = f.cor; } }
          f.morre = .28; continue;
        }
        posRota(f, f.s, tmp); const x = tmp.x, y = tmp.y, ang = Math.atan2(tmp.ty, tmp.tx) * f.dir;
        const u = f.s / L, fade = Math.min(1, u * 10, (1 - u) * 10), esc = f.tam / CELULA;
        f.gp.x = x; f.gp.y = y; f.gp.rotation = f.incl + Math.sin(tempo * 1.7 + f.fase) * .12; f.gp.scaleX = f.gp.scaleY = esc; f.gp.alpha = Math.max(.001, fade) * .95;
        f.gl.x = x; f.gl.y = y; f.gl.scaleX = f.gl.scaleY = f.tam * .09; f.gl.tint = f.cor; f.gl.alpha = fade * (.45 + .2 * env);
        for (let j = 0; j < TRL; j++) { const t = f.tr[j], ss = f.s - f.dir * (j + 1) * (7 + f.tam * .35); if (ss < 0 || ss > L) { t.alpha = 0; continue; } posRota(f, ss, tmp); t.x = tmp.x; t.y = tmp.y; const k = 1 - (j + 1) / (TRL + 1); t.scaleX = t.scaleY = (.26 * k + .05) * (f.grande ? 1.5 : 1); t.tint = f.cor; t.alpha = fade * .6 * k; }
      }
      for (const fg of fagulhas) { if (fg.t >= fg.dur) { fg.p.alpha = 0; continue; } fg.t += dt; const u = fg.t / fg.dur; fg.x += fg.vx * dt; fg.y += fg.vy * dt; fg.vx *= .96; fg.vy *= .96; fg.p.x = fg.x; fg.p.y = fg.y; fg.p.alpha = (1 - u) * .8; fg.p.scaleX = fg.p.scaleY = .1 * (1 - u * .6); }
    }

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
      arquivosAtualiza(dt, aoChegar, env);
      if (lmax > 0) lref = lmax;   // a onda leva ~1,2 s para chegar ao fim do ramo mais longo
      custo = performance.now() - t0;
    }
    function evento(id, tipo) {
      const g = grupos.find(x => x.pr.id === id); if (!g) return;
      const cor = tipo === 'pedido' ? 0x8fcfff : 0xffe56e, kind = TIPOS.indexOf(tipo === 'pedido' ? 'recibo' : 'documento');
      lancar(g, -1, {grande: true, cor, tipo: kind, tam: 1.15}); lancar(g, -1, {grande: true, cor, tipo: kind, tam: .9, atraso: .35});
    }
    const contagem = () => grupos.map(g => ({id: g.pr.id, principais: g.paths.filter(p => p.nivel === 0).length, ramos: g.paths.filter(p => p.nivel === 1).length, subramos: g.paths.filter(p => p.nivel === 2).length, capilares: g.paths.filter(p => p.nivel === 3).length}));
    const espessuras = () => grupos.map(g => { const p = g.principal; return {id: g.pr.id, raiz: +p.w[0].toFixed(2), ponta: +p.w[p.N - 1].toFixed(2), raizBase: p.w0, pontaBase: p.w1, aos90: +p.w[Math.round(.88 * (p.N - 1))].toFixed(2)}; });
    return {principal: i => grupos[i] && grupos[i].principal, tumDesde: () => tumT, montar, atualizar, evento, flash: i => grupos[i]?.flash || 0, vivos: () => vivos, grupos: () => grupos.length, fios: () => grupos.reduce((a, g) => a + g.paths.length, 0) + links.length,
      contagem, espessuras, custo: () => custo, links: () => links.length,
      amostra: () => arquivos.filter(f => f.ativo && f.atraso <= 0 && f.gp).slice(0, 3).map(f => ({tipo: TIPOS[f.tipo], s: Math.round(f.s), x: f.gp.x, y: f.gp.y, a: f.gp.alpha})), log: () => LOG.slice(), tipos: TIPOS, simula: n => { for (let i = 0; i < n; i++) atualizar(.033, [], null, null); },
      suave(v) { suave = !!v; }, qualidade(q) { qualidade = q; }, densidade(d) { densidade = d; }, camada,
      destruir() { camada.destroy({children: true}); texturas.forEach(t => t.destroy(true)); }};
  }
  return {criar};
})();
