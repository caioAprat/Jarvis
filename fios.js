'use strict';
/** Cabos do protótipo. As curvas e as janelas de revelação continuam sendo as originais.
 * A luz é calculada exclusivamente nestes materiais; nenhuma luz é adicionada à cena. */
(function () {
  const AMBAR = 0xff8a3d, CREME = 0xffe0b8, PRI = 0xff9a4d;
  const COR = { ok: 0x7bf0b4, atencao: 0xffc247, erro: 0xff4d5e, pausado: 0x7a6e60, config: 0x9a8c7a, aguardando: 0xc4a06a };
  const movimento = matchMedia('(prefers-reduced-motion: reduce)');
  const VERT = `
    uniform float uTime, uAmp;
    uniform vec3 uDelta;
    attribute float aTipo, aPercurso, aAncora;
    attribute vec3 aCor;
    varying vec2 vUv;
    varying vec3 vNormal, vMundo, vCor;
    varying float vTipo, vPercurso;
    void main() {
      vUv = uv; vTipo = aTipo; vCor = aCor; vPercurso = aPercurso;
      vec3 p = position + uDelta * aAncora;
      float janela = smoothstep(0., .12, aPercurso) * (1. - smoothstep(.7, 1., aPercurso));
      float s = sin(uTime * 1.25 + p.x * .35 + p.z * .28) * uAmp * janela;
      p.y += s; p.x += s * .4;
      vMundo = (modelMatrix * vec4(p, 1.)).xyz;
      vNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * vec4(vMundo, 1.);
    }`;
  const FRAG = `
    uniform float uAcende, uEscala, uComprimento;
    varying vec2 vUv;
    varying vec3 vNormal, vMundo, vCor;
    varying float vTipo, vPercurso;
    void main() {
      if (uAcende <= .001 || vPercurso > uAcende) discard;
      vec3 n = normalize(vNormal), vista = normalize(cameraPosition - vMundo);
      vec3 luz = normalize(-vMundo + vec3(0., .35 * uEscala, 0.));
      float distancia = length(vMundo) / uEscala;
      float calor = 1. / (1. + distancia * distancia * .22);
      float difusa = max(dot(n, luz), 0.);
      float borda = pow(1. - abs(dot(n, vista)), 3.);
      // Grafite fosco: a faixa creme é tinta no corpo, não uma linha emissiva.
      float faixa = step(.78, fract(vUv.x * uComprimento / uEscala * 1.1)) * step(.35, sin(vUv.y * 6.28318));
      vec3 base = mix(vec3(.026, .025, .024), vec3(.36, .31, .25), faixa * .65);
      if (vTipo > .5) base = vec3(.12, .115, .105);
      if (vTipo > 1.5) base = vCor * .35;
      vec3 cor = base * (.55 + difusa * calor * 2.2);
      cor += vec3(1., .35, .09) * calor * (difusa * .11 + borda * .065);
      cor += vec3(1., .88, .72) * borda * .035;
      if (vTipo > 2.5) cor = vCor * .65;
      gl_FragColor = vec4(cor, 1.);
    }`;

  function montar(mapa, proto, op) {
    op = op || {};
    if (!mapa || !proto || !window.THREE) return null;
    const dep = mapa.depurar(), cena = dep.scene, E = proto.E, leve = !!op.leve;
    const nEst = leve ? 6 : 8, nChao = leve ? 6 : 8, CHAO = -3.2 * E;
    const grupo = new THREE.Group(); grupo.name = 'fios'; cena.add(grupo);
    const ESP = [.028 * E, .045 * E, .075 * E];
    let semente = 7; const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };
    const eixoZ = new THREE.Vector3(0, 0, 1);
    const recursos = new Set();
    function material(comprimento) {
      const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG,
        uniforms: { uTime: { value: 0 }, uAmp: { value: 0 }, uDelta: { value: new THREE.Vector3() },
          uAcende: { value: 0 }, uEscala: { value: E }, uComprimento: { value: comprimento } } });
      recursos.add(mat); return mat;
    }
    // Junta corpo, anéis e terminações em uma única geometria por cabo (um draw call).
    function juntar(partes) {
      const listas = { position: [], normal: [], uv: [], aTipo: [], aPercurso: [], aAncora: [], aCor: [] };
      partes.forEach(({ geo, tipo = 0, percurso, cor = CREME, ancora }) => {
        const g = geo.index ? geo.toNonIndexed() : geo, c = new THREE.Color(cor);
        for (let i = 0; i < g.attributes.position.count; i++) {
          const u = percurso === undefined ? g.attributes.uv.getX(i) : percurso;
          for (const nome of ['position', 'normal', 'uv']) {
            const a = g.attributes[nome]; for (let k = 0; k < a.itemSize; k++) listas[nome].push(a.array[i * a.itemSize + k]);
          }
          listas.aTipo.push(tipo); listas.aPercurso.push(u);
          listas.aAncora.push(ancora === undefined ? 1 - THREE.MathUtils.smoothstep(u, 0, .18) : ancora);
          listas.aCor.push(c.r, c.g, c.b);
        }
        if (g !== geo) g.dispose(); geo.dispose();
      });
      const geo = new THREE.BufferGeometry();
      Object.entries(listas).forEach(([nome, dados]) => geo.setAttribute(nome, new THREE.Float32BufferAttribute(dados, ['position', 'normal', 'aCor'].includes(nome) ? 3 : nome === 'uv' ? 2 : 1)));
      recursos.add(geo); return geo;
    }
    function anel(partes, ponto, tangente, raio, percurso, ancora) {
      const geo = new THREE.TorusGeometry(raio, raio * .2, 4, 10);
      geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(eixoZ, tangente.clone().normalize()))); geo.translate(ponto.x, ponto.y, ponto.z);
      partes.push({ geo, tipo: 1, percurso, ancora });
    }
    function luva(partes, ponto, tangente, raio, u, ancora) {
      const comprimento = raio * 5;
      const geo = new THREE.CylinderGeometry(raio * 1.6, raio * 1.6, comprimento, 10);
      geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangente.clone().normalize())));
      geo.translate(ponto.x, ponto.y, ponto.z); partes.push({ geo, tipo: 1, percurso: u, ancora });
      [-.45, -.15, .15, .45].forEach(k => anel(partes, ponto.clone().addScaledVector(tangente, comprimento * k), tangente, raio * 1.7, u, ancora));
    }
    function criarCabo(curva, esp, segmentos, modulo, indice, noChao) {
      const partes = [{ geo: new THREE.TubeGeometry(curva, segmentos, esp, 8, false) }];
      [.08, .24, .43, .65, .84].forEach(u => anel(partes, curva.getPointAt(u), curva.getTangentAt(u), esp * 1.18, u));
      const inicio = curva.getPointAt(0), fim = curva.getPointAt(1);
      luva(partes, inicio, curva.getTangentAt(0), esp, 0, 1);
      luva(partes, fim, curva.getTangentAt(1), esp, 1, 0);
      let extensao = null;
      if (noChao) {
        // Prolongamento autorizado: mergulha no núcleo que já está visível na abertura.
        // A curva no chão permanece intacta, inclusive sua semente aleatória.
        const ang = Math.atan2(inicio.z, inicio.x);
        const porta = new THREE.Vector3(Math.cos(ang) * .48 * E, -.65 * E, Math.sin(ang) * .48 * E);
        const ombro = new THREE.Vector3(Math.cos(ang) * 1.5 * E, -1.6 * E, Math.sin(ang) * 1.5 * E);
        extensao = new THREE.QuadraticBezierCurve3(porta, ombro, inicio);
        partes.push({ geo: new THREE.TubeGeometry(extensao, 32, esp, 8, false), percurso: 0, ancora: 0 });
        luva(partes, extensao.getPoint(.14), extensao.getTangent(.14), esp, 0, 0);
        // A terminação externa tem uma sapata no chão, mesmo quando cabe no enquadramento.
        const altura = Math.max(.08 * E, fim.y - CHAO + esp * 2);
        const sapata = new THREE.CylinderGeometry(esp * 2.6, esp * 3.2, altura, 10);
        sapata.translate(fim.x, CHAO + altura / 2, fim.z); partes.push({ geo: sapata, tipo: 1, percurso: 1, ancora: 0 });
      }
      const cores = [COR.ok, COR.atencao, COR.erro, PRI];
      const origem = noChao ? extensao.getPoint(.14) : inicio;
      cores.forEach((cor, j) => {
        const a = j * Math.PI / 2;
        const saida = origem.clone().add(new THREE.Vector3(Math.cos(a) * esp, 0, Math.sin(a) * esp));
        const chegada = noChao ? extensao.getPoint(0).add(new THREE.Vector3(Math.cos(a) * .06 * E, .06 * E, Math.sin(a) * .06 * E)) : inicio.clone().add(new THREE.Vector3(Math.cos(a) * .07 * E, -.16 * E, Math.sin(a) * .01 * E));
        const meio = saida.clone().lerp(chegada, .5).add(new THREE.Vector3(Math.cos(a) * .055 * E, 0, Math.sin(a) * .055 * E));
        partes.push({ geo: new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(saida, meio, chegada), 12, .009 * E, 5, false), tipo: 2, percurso: 0, cor, ancora: noChao ? 0 : 1 });
      });
      const mat = material(curva.getLength()), mesh = new THREE.Mesh(juntar(partes), mat);
      mesh.name = (noChao ? 'cabo-chao-' : 'cabo-suspenso-') + indice;
      // Guardado para inspeção/testes, sem reconstruir curvas ou buffers a cada quadro.
      mesh.userData.curva = curva; grupo.add(mesh);
      return { curva, extensao, mesh, mat, inicio, modulo, id: modulo && modulo.id, noChao };
    }
    const pilares = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * 6.2832 + .5, r = 9.5 * E + (i % 2) * 1.6 * E, h = (2.6 + (i % 3) * 1.1) * E;
      // Suportes originais, nas mesmas posições; não são luzes da cena.
      const geo = new THREE.CylinderGeometry(.05 * E, .09 * E, h - CHAO, 6);
      const mat = new THREE.MeshBasicMaterial({ color: AMBAR, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false });
      const p = new THREE.Mesh(geo, mat); p.position.set(Math.cos(a) * r, (h + CHAO) / 2, Math.sin(a) * r); grupo.add(p); recursos.add(geo); recursos.add(mat);
      pilares.push({ topo: new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r), mat });
    }
    const esticados = [], chao = [];
    function removerCabo(f) {
      grupo.remove(f.mesh); f.mesh.geometry.dispose(); f.mat.dispose(); recursos.delete(f.mesh.geometry); recursos.delete(f.mat);
    }
    function montarEsticados() {
      esticados.forEach(removerCabo); esticados.length = 0;
      const mods = proto.modulos;
      for (let i = 0; i < nEst; i++) {
        const m = mods[i % Math.max(1, mods.length)];
        const ini = m ? new THREE.Vector3().copy(m.g.position).add(new THREE.Vector3(0, .5 * E, 0)) : new THREE.Vector3(0, 1.6 * E, 0);
        const fim = pilares[(i * 2 + 1) % pilares.length].topo.clone().add(new THREE.Vector3(0, -(i % 3) * .35 * E, 0));
        const meio = ini.clone().lerp(fim, .5); meio.y -= (.18 + (i % 3) * .12) * E;
        const curva = new THREE.QuadraticBezierCurve3(ini, meio, fim);
        esticados.push(criarCabo(curva, ESP[i % 3], 48, m, i, false));
      }
    }
    montarEsticados();
    for (let i = 0; i < nChao; i++) {
      const porta = proto.portas[i % proto.portas.length], dir = Math.atan2(porta.z, porta.x) + (rnd() - .5) * .6;
      const pts = [porta.clone(), new THREE.Vector3(porta.x * 1.08, CHAO + .25 * E, porta.z * 1.08)];
      let a = dir, r = Math.hypot(porta.x, porta.z) * 1.25;
      for (let k = 0; k < 7; k++) {
        a += (rnd() - .5) * 1.1; r += (.9 + rnd() * 1.3) * E;
        pts.push(new THREE.Vector3(Math.cos(a) * r, CHAO + (k % 2 ? .05 : .16) * E * rnd(), Math.sin(a) * r));
      }
      const curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .5);
      chao.push(criarCabo(curva, ESP[(i + 1) % 3], 96, null, i, true));
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
    function acenderEsticados(v) { est.est = v; revelar(esticados, v); pilares.forEach(p => { p.mat.opacity = .08 + .22 * v; }); }
    function pacotes(v) { est.pac = v; pMat.uniforms.uVis.value = v; }
    function status(projetos) { esticados.forEach(f => { const p = projetos.find(x => x.id === f.id); if (p && f.ponta) f.ponta.material.color.setHex(COR[p.status] || COR.aguardando); }); }
    function refazer() { montarEsticados(); revelar(esticados, est.est); }
    let ultimaCam = new THREE.Vector3(); let agito = 0;
    function quadro(t, d) {
      const cam = dep.camera.position; agito = Math.max(agito * Math.pow(.2, d), Math.min(1, cam.distanceTo(ultimaCam) / (d * 40 + 1e-4))); ultimaCam.copy(cam);
      const amp = (.025 + .05 * agito) * E;
      chao.forEach(f => { f.mat.uniforms.uTime.value = t; f.mat.uniforms.uAmp.value = amp; });
      esticados.forEach(f => { f.mat.uniforms.uTime.value = t; f.mat.uniforms.uAmp.value = .012 * E * (1 + agito); });
      esticados.forEach(f => {
        if (!f.modulo) return;
        const alvo = f.modulo.g.localToWorld(new THREE.Vector3(0, .5 * E, 0));
        f.mat.uniforms.uDelta.value.copy(alvo).sub(f.inicio);
      });
      if (est.pac <= 0) return;
      for (let i = 0; i < total; i++) {
        const q = pac[i], f = esticados[q.f]; if (!f) continue;
        if (!movimento.matches) { q.u += d * q.v * q.dir; if (q.u > 1) q.u -= 1; if (q.u < 0) q.u += 1; }
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
