'use strict';
/**
 * JARVÃO · fios — a variação que o Caio pediu (R1): fios ESTICADOS cruzando o ar e fios SOLTOS no chão.
 *
 *  esticados  TubeGeometry fina sobre curvas de pouca flecha, ligando os módulos do protótipo a pilares no escuro;
 *             por eles correm os pacotes de arquivos (pontos laranja/creme, nos dois sentidos, sempre em movimento).
 *             O ponto de chegada no módulo leva a cor de status do projeto (a única cor de status dos fios).
 *  no chão    saem das portas da base do protótipo, caem até o chão e serpenteiam com curvas e sobreposições.
 *  variação   3 espessuras; esticado × solto; metade pulsando, metade apagada; os soltos balançam de leve, mais
 *             quando a câmera passa perto.
 *
 * acenderChao(0..1) e acenderEsticados(0..1) revelam os fios ao longo do comprimento, um depois do outro.
 * Sem build: carregado por <script> em pc.html.
 */
(function () {
  const AMBAR = 0xff8a3d, CREME = 0xffe0b8, PRI = 0xff9a4d;
  const COR = { ok: 0x7bf0b4, atencao: 0xffc247, erro: 0xff4d5e, pausado: 0x7a6e60, config: 0x9a8c7a, aguardando: 0xc4a06a };
  const reduzido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const VERT = [
    'uniform float uTime, uAmp; varying vec2 vUv;',
    'void main(){ vUv = uv; vec3 p = position;',
    '  float s = sin(uTime * 1.25 + p.x * .35 + p.z * .28) * uAmp * smoothstep(0., 1., uv.x) * smoothstep(1., .7, uv.x);',
    '  p.y += s; p.x += s * .4;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }',
  ].join('\n');
  const FRAG = [
    'uniform vec3 uCor; uniform float uBrilho, uPulso, uAcende, uTime; varying vec2 vUv;',
    'void main(){ if (vUv.x > uAcende) discard;',
    '  float pul = mix(1., .55 + .45 * sin(uTime * 2.2 - vUv.x * 14.), uPulso);',
    '  float ponta = smoothstep(uAcende - .06, uAcende, vUv.x) * step(uAcende, .999);',   // a frente da revelação brilha
    '  gl_FragColor = vec4(uCor * (uBrilho * pul + ponta * 1.2), 1.); }',
  ].join('\n');

  function material(cor, brilho, pulso, amp) {
    return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAmp: { value: amp }, uCor: { value: new THREE.Color(cor) }, uBrilho: { value: brilho }, uPulso: { value: pulso }, uAcende: { value: 0 } } });
  }

  function montar(mapa, proto, op) {
    op = op || {};
    if (!mapa || !proto || !window.THREE) return null;
    const dep = mapa.depurar(), cena = dep.scene, E = proto.E, leve = !!op.leve;
    const nEst = leve ? 6 : 8, nChao = leve ? 6 : 8, CHAO = -3.2 * E;
    const grupo = new THREE.Group(); grupo.name = 'fios'; cena.add(grupo);
    const ESP = [.028 * E, .045 * E, .075 * E];
    let semente = 7; const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };

    // ------------------------------------------------------------ pilares no escuro (pontas dos fios esticados)
    const pilares = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * 6.2832 + .5, r = 9.5 * E + (i % 2) * 1.6 * E, h = (2.6 + (i % 3) * 1.1) * E;
      const geo = new THREE.CylinderGeometry(.05 * E, .09 * E, h - CHAO, 6), m = material(AMBAR, .22, 0, 0); m.uniforms.uAcende.value = 1;
      const p = new THREE.Mesh(geo, m); p.position.set(Math.cos(a) * r, (h + CHAO) / 2, Math.sin(a) * r); grupo.add(p);
      pilares.push({ topo: new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r), mat: m });
    }

    // ------------------------------------------------------------ fios esticados
    const esticados = [];
    function montarEsticados() {
      esticados.forEach(f => { grupo.remove(f.mesh); f.mesh.geometry.dispose(); if (f.ponta) grupo.remove(f.ponta); });
      esticados.length = 0;
      const mods = proto.modulos;
      for (let i = 0; i < nEst; i++) {
        const m = mods[i % Math.max(1, mods.length)];
        const ini = m ? new THREE.Vector3().copy(m.g.position).add(new THREE.Vector3(0, .5 * E, 0)) : new THREE.Vector3(0, 1.6 * E, 0);
        const fim = pilares[(i * 2 + 1) % pilares.length].topo.clone().add(new THREE.Vector3(0, -(i % 3) * .35 * E, 0));
        const meio = ini.clone().lerp(fim, .5); meio.y -= (.18 + (i % 3) * .12) * E;            // pouca flecha: em tensão
        const curva = new THREE.QuadraticBezierCurve3(ini, meio, fim);
        const esp = ESP[i % 3], mat = material(i % 2 ? CREME : PRI, i % 4 === 3 ? .2 : .55, i % 2 ? 1 : .25, .02 * E);
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curva, 48, esp, 6, false), mat); grupo.add(mesh);
        let ponta = null;
        if (m) { const pm = new THREE.MeshBasicMaterial({ color: COR[m.status] || COR.aguardando, transparent: true, opacity: 0 }); ponta = new THREE.Mesh(new THREE.SphereGeometry(esp * 2.2, 8, 6), pm); ponta.position.copy(ini); grupo.add(ponta); }
        esticados.push({ curva, mesh, mat, ponta, id: m && m.id });
      }
    }
    montarEsticados();

    // ------------------------------------------------------------ fios no chão
    const chao = [];
    for (let i = 0; i < nChao; i++) {
      const porta = proto.portas[i % proto.portas.length], dir = Math.atan2(porta.z, porta.x) + (rnd() - .5) * .6;
      const pts = [porta.clone(), new THREE.Vector3(porta.x * 1.08, CHAO + .25 * E, porta.z * 1.08)];
      let a = dir, r = Math.hypot(porta.x, porta.z) * 1.25;
      for (let k = 0; k < 7; k++) {                                    // serpenteia para fora, cruzando os vizinhos
        a += (rnd() - .5) * 1.1; r += (.9 + rnd() * 1.3) * E;
        pts.push(new THREE.Vector3(Math.cos(a) * r, CHAO + (k % 2 ? .05 : .16) * E * rnd(), Math.sin(a) * r));
      }
      const curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .5);
      const aceso = i % 2 === 0, esp = ESP[(i + 1) % 3];
      const mat = material(aceso ? AMBAR : AMBAR, aceso ? .45 : .1, aceso ? 1 : 0, .035 * E);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curva, 96, esp, 5, false), mat); grupo.add(mesh);
      chao.push({ curva, mesh, mat });
    }

    // ------------------------------------------------------------ pacotes de arquivos nos esticados
    const NP = leve ? 4 : 6, total = nEst * NP;
    const pPos = new Float32Array(total * 3), pCor = new Float32Array(total * 3), pTam = new Float32Array(total);
    const pac = [];
    for (let i = 0; i < total; i++) pac.push({ f: i % nEst, u: rnd(), v: .12 + rnd() * .16, dir: rnd() < .5 ? 1 : -1 });
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCor, 3)); pGeo.setAttribute('size', new THREE.BufferAttribute(pTam, 1));
    const pMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uVis: { value: 0 } },
      vertexShader: 'attribute float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = min(size * (220. / -mv.z), 18.); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uVis; varying vec3 vC; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vC * smoothstep(.5, 0., d) * 1.6 * uVis, 1.); }' });
    const pontos = new THREE.Points(pGeo, pMat); pontos.frustumCulled = false; grupo.add(pontos);
    const cPri = new THREE.Color(PRI), cCre = new THREE.Color(CREME), tmp = new THREE.Vector3();

    // ------------------------------------------------------------ controle
    const est = { chao: 0, est: 0, pac: 0 };
    function revelar(lista, v) {                                        // um depois do outro, ao longo do comprimento
      const n = lista.length;
      lista.forEach((f, i) => { const k = Math.max(0, Math.min(1, v * (n * .55 + 1) - i * .55)); f.mat.uniforms.uAcende.value = k; if (f.ponta) f.ponta.material.opacity = k >= 1 ? .95 : 0; });
    }
    function acenderChao(v) { est.chao = v; revelar(chao, v); }
    function acenderEsticados(v) { est.est = v; revelar(esticados, v); pilares.forEach(p => { p.mat.uniforms.uBrilho.value = .08 + .22 * v; }); }
    function pacotes(v) { est.pac = v; pMat.uniforms.uVis.value = v; }
    function status(projetos) { esticados.forEach(f => { const p = projetos.find(x => x.id === f.id); if (p && f.ponta) f.ponta.material.color.setHex(COR[p.status] || COR.aguardando); }); }
    function refazer() { montarEsticados(); revelar(esticados, est.est); }
    let ultimaCam = new THREE.Vector3(); let agito = 0;
    function quadro(t, d) {
      const cam = dep.camera.position; agito = Math.max(agito * Math.pow(.2, d), Math.min(1, cam.distanceTo(ultimaCam) / (d * 40 + 1e-4))); ultimaCam.copy(cam);
      const amp = (.025 + .05 * agito) * E;
      chao.forEach(f => { f.mat.uniforms.uTime.value = t; f.mat.uniforms.uAmp.value = amp; });
      esticados.forEach(f => { f.mat.uniforms.uTime.value = t; f.mat.uniforms.uAmp.value = .012 * E * (1 + agito); });
      pilares.forEach(p => { p.mat.uniforms.uTime.value = t; });
      if (est.pac <= 0) return;
      for (let i = 0; i < total; i++) {
        const q = pac[i], f = esticados[q.f]; if (!f) continue;
        if (!reduzido) { q.u += d * q.v * q.dir; if (q.u > 1) q.u -= 1; if (q.u < 0) q.u += 1; }
        const lim = f.mat.uniforms.uAcende.value; const u = q.u * lim;
        f.curva.getPointAt(Math.min(1, u), tmp); pPos[i * 3] = tmp.x; pPos[i * 3 + 1] = tmp.y; pPos[i * 3 + 2] = tmp.z;
        const c = q.dir > 0 ? cPri : cCre, e = Math.sin(q.u * Math.PI); pCor[i * 3] = c.r * e; pCor[i * 3 + 1] = c.g * e; pCor[i * 3 + 2] = c.b * e;
        pTam[i] = (1.6 + (q.f % 3) * .5) * (leve ? .8 : 1.2) * (lim > .02 ? 1 : 0);
      }
      pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = pGeo.attributes.size.needsUpdate = true;
    }
    function mostrar(v) { grupo.visible = !!v; }
    return { grupo, acenderChao, acenderEsticados, pacotes, status, refazer, quadro, mostrar, contagem: () => ({ esticados: esticados.length, chao: chao.length }) };
  }

  window.Fios = { montar };
})();
