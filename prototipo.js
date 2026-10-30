'use strict';
/**
 * JARVÃO · protótipo 3D — a máquina no centro da narrativa (referências Territory Studio e R1 do Caio).
 *
 * Procedural (Three r128, sem modelo externo). O núcleo de plasma do mapa-vivo NÃO é tocado: o protótipo é
 * montado em volta dele, na mesma cena, na mesma origem. Unidade = E (raio do núcleo, mapa.depurar().escala).
 *
 *   base     3 lajes escuras empilhadas e giradas (y ≈ −2,2E…−3E), contorno âmbar; 8 portas de onde saem os fios do chão
 *   coração  gaiola aberta em volta do núcleo: 4 colunas finas, 2 anéis, marcadores em cruz
 *   módulos  uma placa escura por projeto real, empilhadas em espiral e desalinhadas, cada uma com uma TELA VIVA
 *            (CanvasTexture, desenhada por telas-vivas.js) e um LED na cor de status (a única cor de status do modelo)
 *   coroa    mastro + anel no topo; 2 trilhos orbitais finos com marcadores
 *
 * Só MeshBasicMaterial escuro + linhas âmbar/creme com mistura aditiva: sem luz ambiente; quem ilumina é o núcleo,
 * as telas e o bloom. aparecer(0..1) faz a silhueta surgir; enfatizar([ids]) deixa um módulo por vez no plano principal.
 *
 * Sem build: carregado por <script> em pc.html. Não guarda dados nem chaves.
 */
(function () {
  const AMBAR = 0xff8a3d, CREME = 0xffe0b8, ESCURO = 0x120e0b, ESCURO2 = 0x1b1510;
  const COR = { ok: 0x7bf0b4, atencao: 0xffc247, erro: 0xff4d5e, pausado: 0x7a6e60, config: 0x9a8c7a, aguardando: 0xc4a06a };

  function montar(mapa, op) {
    op = op || {};
    if (!mapa || !window.THREE) return null;
    const dep = mapa.depurar(), cena = dep.scene, E = dep.escala || 2.6, leve = !!op.leve;
    const raiz = new THREE.Group(); raiz.name = 'prototipo'; cena.add(raiz);
    const mats = [];                                     // tudo que entra no "aparecer"
    const linha = (geo, cor, op0) => { const m = new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: op0, blending: THREE.AdditiveBlending, depthWrite: false }); m.userData.base = op0; mats.push(m); return new THREE.LineSegments(new THREE.EdgesGeometry(geo), m); };
    const solido = (geo, cor, op0) => { const m = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op0 }); m.userData.base = op0; mats.push(m); return new THREE.Mesh(geo, m); };
    const fio = (geo, cor, op0) => { const m = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op0, blending: THREE.AdditiveBlending, depthWrite: false }); m.userData.base = op0; mats.push(m); return new THREE.Mesh(geo, m); };

    // ------------------------------------------------------------ base
    const base = new THREE.Group(); raiz.add(base);
    [[5 * E, .3 * E, 5 * E, -2.25, 0], [4.2 * E, .3 * E, 4.2 * E, -2.6, .38], [6 * E, .24 * E, 3.4 * E, -2.92, -.22]].forEach(([w, h, d, y, r]) => {
      const g = new THREE.BoxGeometry(w, h, d), s = solido(g, ESCURO, .96), l = linha(g, AMBAR, .45);
      s.position.y = l.position.y = y * E; s.rotation.y = l.rotation.y = r; base.add(s, l);
    });
    const portas = [];                                 // pontos (mundo) de onde saem os fios do chão
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + .2; portas.push(new THREE.Vector3(Math.cos(a) * 2.3 * E, -3 * E, Math.sin(a) * 2.3 * E)); }
    const espinha = solido(new THREE.CylinderGeometry(.11 * E, .16 * E, .55 * E, 10), ESCURO2, 1); espinha.position.y = -1.85 * E; raiz.add(espinha);
    const espinhaL = linha(new THREE.CylinderGeometry(.11 * E, .16 * E, .55 * E, 10), CREME, .25); espinhaL.position.y = -1.85 * E; raiz.add(espinhaL);

    // ------------------------------------------------------------ coração (gaiola em volta do núcleo)
    const coracao = new THREE.Group(); raiz.add(coracao);
    const RG = 1.78 * E, HG = 1.6 * E;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * 6.2832 + .785, col = fio(new THREE.CylinderGeometry(.022 * E, .022 * E, HG * 2, 6), AMBAR, .3);
      col.position.set(Math.cos(a) * RG, 0, Math.sin(a) * RG); coracao.add(col);
    }
    [HG, -HG].forEach(y => { const t = fio(new THREE.TorusGeometry(RG, .022 * E, 6, 64), AMBAR, .7); t.rotation.x = Math.PI / 2; t.position.y = y; coracao.add(t); });
    // marcadores em cruz nos encontros coluna × anel
    const cruzPts = [];
    for (let i = 0; i < 4; i++) for (const y of [HG, -HG]) {
      const a = i / 4 * 6.2832 + .785, c = new THREE.Vector3(Math.cos(a) * RG, y, Math.sin(a) * RG), k = .16 * E;
      cruzPts.push(c.x - k, c.y, c.z, c.x + k, c.y, c.z, c.x, c.y - k, c.z, c.x, c.y + k, c.z);
    }
    const cruzGeo = new THREE.BufferGeometry(); cruzGeo.setAttribute('position', new THREE.Float32BufferAttribute(cruzPts, 3));
    const cruzMat = new THREE.LineBasicMaterial({ color: CREME, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }); cruzMat.userData.base = .8; mats.push(cruzMat);
    coracao.add(new THREE.LineSegments(cruzGeo, cruzMat));

    // ------------------------------------------------------------ coroa e trilhos
    const coroa = new THREE.Group(); raiz.add(coroa);
    const mastro = fio(new THREE.CylinderGeometry(.022 * E, .04 * E, 3.6 * E, 8), AMBAR, .2); mastro.position.y = HG + 1.8 * E; coroa.add(mastro);
    const anelC = fio(new THREE.TorusGeometry(1.15 * E, .026 * E, 6, 64), AMBAR, .8); anelC.rotation.x = Math.PI / 2; anelC.position.y = 4.55 * E; coroa.add(anelC);
    const anelC2 = fio(new THREE.TorusGeometry(.62 * E, .018 * E, 6, 48), CREME, .6); anelC2.rotation.x = Math.PI / 2; anelC2.position.y = 5.05 * E; coroa.add(anelC2);
    const trilhos = [];
    [[4.4 * E, .18], [5.3 * E, -.22]].forEach(([r, inc], k) => {
      const t = fio(new THREE.TorusGeometry(r, .012 * E, 4, 120), AMBAR, .32); t.rotation.x = Math.PI / 2 + inc; t.position.y = (k ? .8 : 2.2) * E; raiz.add(t); trilhos.push(t);
    });
    const marcaGeo = new THREE.BoxGeometry(.14 * E, .14 * E, .14 * E), marcaMat = new THREE.MeshBasicMaterial({ color: CREME, transparent: true, opacity: .85 }); marcaMat.userData.base = .85; mats.push(marcaMat);
    const marcas = new THREE.InstancedMesh(marcaGeo, marcaMat, 12); raiz.add(marcas);
    const marcaInfo = []; for (let i = 0; i < 12; i++) marcaInfo.push({ t: i < 6 ? 0 : 1, a: (i % 6) / 6 * 6.2832, v: (i < 6 ? .12 : -.08) });

    // ------------------------------------------------------------ módulos (um por projeto)
    const modulos = [];
    const W = 1.7 * E, H = 1.06 * E, D = .09 * E;
    const resTela = leve ? [160, 100] : [256, 160];
    function criarModulos(projetos) {
      modulos.forEach(m => { raiz.remove(m.g); m.tex.dispose(); });
      modulos.length = 0;
      projetos.forEach((p, i) => {
        const g = new THREE.Group();
        const ang = i * 0.98 + .35, r = 3.15 * E + (i % 2) * .38 * E, y = -1.05 * E + i * .62 * E;
        g.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
        g.lookAt(0, y, 0); g.rotateY(Math.PI + (i % 3 - 1) * .2); g.rotateZ((i % 2 ? 1 : -1) * .05);
        const corpoG = new THREE.BoxGeometry(W, H, D), corpo = solido(corpoG, ESCURO, .97), borda = linha(corpoG, AMBAR, .55);
        const cv = document.createElement('canvas'); cv.width = resTela[0]; cv.height = resTela[1];
        const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
        const telaMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 1 }); telaMat.userData.base = 1; mats.push(telaMat);
        const tela = new THREE.Mesh(new THREE.PlaneGeometry(W * .9, H * .82), telaMat); tela.position.z = D / 2 + .004 * E; tela.userData.projeto = p.id;
        const ledMat = new THREE.MeshBasicMaterial({ color: COR[p.status] || COR.aguardando, transparent: true, opacity: 1 }); ledMat.userData.base = 1; mats.push(ledMat);
        const led = new THREE.Mesh(new THREE.SphereGeometry(.05 * E, 8, 6), ledMat); led.position.set(W / 2 - .1 * E, H / 2 - .1 * E, D / 2 + .02 * E);
        g.add(corpo, borda, tela, led); raiz.add(g);
        modulos.push({ id: p.id, g, tela, tex, cv, ctx: cv.getContext('2d', { willReadFrequently: true }),   // canvas na memória comum: subir para a GPU não trava a placa integrada
 led, ledMat, corpo, borda, ang, raio: r, y, enf: { v: 1, alvo: 1 } });
      });
    }
    criarModulos(op.projetos || []);

    // ------------------------------------------------------------ aparecer / ênfase / quadro
    const vis = { v: 0 };
    function aplicarOpacidade() {
      mats.forEach(m => { m.opacity = m.userData.base * vis.v; m.visible = vis.v > .005; });
      raiz.visible = vis.v > .005;
      modulos.forEach(m => { const k = vis.v * m.enf.v; m.tela.material.opacity = k; m.borda.material.opacity = .55 * k; m.corpo.material.opacity = .97 * vis.v; m.ledMat.opacity = k; });
    }
    function aparecer(v) { vis.v = Math.max(0, Math.min(1, v)); raiz.position.y = (1 - vis.v) * -.6 * E; aplicarOpacidade(); }
    function enfatizar(ids) {
      modulos.forEach(m => { const alvo = !ids || !ids.length || ids.includes(m.id) ? 1 : .32; if (Math.abs(m.enf.alvo - alvo) < .01) return; m.enf.alvo = alvo; if (window.gsap) gsap.to(m.enf, { v: alvo, duration: .5, ease: 'power2.out', onUpdate: aplicarOpacidade }); else { m.enf.v = alvo; aplicarOpacidade(); } });
    }
    function atualizarStatus(projetos) {
      const ids = projetos.map(p => p.id).join('|');
      if (ids !== modulos.map(m => m.id).join('|')) { criarModulos(projetos); aplicarOpacidade(); }
      projetos.forEach(p => { const m = modulos.find(x => x.id === p.id); if (m) m.ledMat.color.setHex(COR[p.status] || COR.aguardando); });
    }
    const dummy = new THREE.Object3D();
    function quadro(t, d) {
      if (!raiz.visible) return;
      coroa.rotation.y += d * .12; anelC2.rotation.z += d * .5;
      trilhos[0].rotation.z += d * .05; trilhos[1].rotation.z -= d * .04;
      marcaInfo.forEach((mk, i) => {
        mk.a += d * mk.v; const tr = trilhos[mk.t], r = tr.geometry.parameters.radius;
        dummy.position.set(Math.cos(mk.a) * r, Math.sin(mk.a) * r, 0).applyEuler(tr.rotation).add(tr.position);
        dummy.rotation.set(t * .7 + i, t * .5, 0); dummy.updateMatrix(); marcas.setMatrixAt(i, dummy.matrix);
      });
      marcas.instanceMatrix.needsUpdate = true;
      modulos.forEach((m, i) => { m.g.position.y = m.y + Math.sin(t * .6 + i * 1.3) * .05 * E; m.ledMat.opacity = (.55 + .45 * Math.abs(Math.sin(t * 1.6 + i))) * vis.v * m.enf.v; });
    }

    // ------------------------------------------------------------ pontos de ancoragem (mundo) e clique nas telas
    const v3 = new THREE.Vector3();
    function ancora(parte) {
      if (parte === 'nucleo') return v3.set(0, 0, 0).clone();
      if (parte === 'base') return v3.set(2.5 * E, -2.25 * E, 0).applyMatrix4(raiz.matrixWorld).clone();
      if (parte === 'coroa') return v3.set(1.15 * E, 4.55 * E, 0).applyMatrix4(raiz.matrixWorld).clone();
      if (parte === 'trilho') { const tr = trilhos[0], r = tr.geometry.parameters.radius; return v3.set(r, 0, 0).applyEuler(tr.rotation).add(tr.position).applyMatrix4(raiz.matrixWorld).clone(); }
      const m = modulos.find(x => x.id === parte); if (!m) return null;
      return v3.set(W / 2, H / 2, D / 2).applyMatrix4(m.g.matrixWorld).clone();
    }
    /** Canto da frente do módulo mais distante do núcleo NA TELA (a chamada sai para fora, sem cobrir a tela viva). */
    const cantos = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, y]) => new THREE.Vector3(x * W / 2, y * H / 2, D / 2));
    const pn = new THREE.Vector3(), pc = new THREE.Vector3();
    function ancoraFora(id, cam) {
      const m = modulos.find(x => x.id === id); if (!m) return null;
      pn.set(0, 0, 0).project(cam);
      let melhor = null, nota = -1e9;
      cantos.forEach(c => { pc.copy(c).applyMatrix4(m.g.matrixWorld); const w = pc.clone(); pc.project(cam); const fora = Math.abs(pc.x) > .94 || Math.abs(pc.y) > .9; const n = Math.abs(pc.x - pn.x) + pc.y * .35 - (fora ? 10 : 0); if (n > nota) { nota = n; melhor = w; } });   // canto fora da tela só se não houver outro
      return melhor;
    }
    function centroModulos(ids) {
      const ms = modulos.filter(m => ids.includes(m.id)); if (!ms.length) return { x: 0, y: 0, z: 0, ang: 0 };
      let x = 0, y = 0, z = 0; ms.forEach(m => { x += m.g.position.x; y += m.y; z += m.g.position.z; });
      x /= ms.length; y /= ms.length; z /= ms.length;
      return { x, y, z, ang: Math.atan2(x, z) };
    }
    const ray = new THREE.Raycaster();
    function telaEm(nx, ny) {
      if (!raiz.visible) return null;
      ray.setFromCamera({ x: nx, y: ny }, dep.camera);
      const hit = ray.intersectObjects(modulos.map(m => m.tela), false)[0];
      return hit ? hit.object.userData.projeto : null;
    }

    aparecer(0);
    return { E, raiz, portas, modulos, aparecer, enfatizar, atualizarStatus, quadro, ancora, ancoraFora, centroModulos, telaEm, visivel: () => vis.v };
  }

  window.Prototipo = { montar };
})();
