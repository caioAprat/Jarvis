'use strict';
/**
 * JARVÃO · veias — a malha de cabos do cenário (Parte H visual, Claude, 05/11/2026).
 *
 * Pedido do Caio: tantos cabos que pareçam VEIAS, variando de onde saem e onde ligam; por enquanto nada trafega neles.
 * Refs: cabos sci-fi do ArtStation (mangueira corrugada, cabo liso com colares/conectores, feixe trançado, fio fino) e o
 * circuito que sai do núcleo pelo piso (Horacio Velozo, Dribbble "reactor core").
 *
 * Veias.criar(scene, { E, pisoY }) -> { acender(v 0..1), pulso(v 0..1), destruir() }
 *   acender: a luz corre do núcleo para fora (pela distância ao centro) — a ignição chama de 0 a 1.
 *   pulso: batimento depois de ligado.
 * Desempenho: as veias de cada modelo viram UMA malha só (4 chamadas de desenho no total). Estáticas: nada de física.
 */
(function () {
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  const VERT = `attribute float aD;attribute float aU;attribute float aLen;varying float vD,vU,vLen;varying vec3 vN,vW;
    void main(){vD=aD;vU=aU;vLen=aLen;vN=normalize(normalMatrix*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
  // tipo: 0 corrugada · 1 lisa com colares · 2 feixe · 3 fio
  const FRAG = `uniform float uLuz,uPulso,uTipo,uE,uT,uCarga;uniform vec3 uCor;varying float vD,vU,vLen;varying vec3 vN,vW;
    void main(){
      vec3 n=normalize(vN);float luzAmb=.22+.55*max(0.,n.y)+.25*pow(1.-abs(n.z),2.);
      float s=vU*vLen/uE;                         // posição ao longo do cabo, em unidades de E
      float sulco=uTipo<.5?.65+.35*smoothstep(.2,.5,abs(fract(s*9.)-.5)):1.;
      float colar=uTipo>.5&&uTipo<1.5?step(vU*vLen/uE,.22)+step(vLen/uE-vU*vLen/uE,.22)+step(.48,fract(s*.35))*step(fract(s*.35),.52):0.;
      vec3 base=vec3(.075,.06,.05)*luzAmb*sulco+vec3(.11,.085,.065)*colar*luzAmb;
      // luz: frente que corre do núcleo para fora + brilho que fica; o fio de luz corre no topo do cabo
      float aceso=smoothstep(uLuz,uLuz-.06,vD);
      float frente=smoothstep(.07,0.,abs(vD-uLuz))*step(.001,uLuz)*(1.-step(.999,uLuz));
      float topo=pow(max(0.,n.y),3.);
      float carga=uCarga<0.?0.:smoothstep(.1,0.,abs(vD-uCarga))*.9;
      float emis=carga*(uTipo>2.5?1.4:.55+.45*topo)+(aceso*(.1+.55*uPulso*smoothstep(1.,0.,abs(vD-fract(uT*.4))*4.))+frente*1.6)*(uTipo>2.5?1.4:.55+.45*topo);
      emis*=(uTipo<.5?sulco:1.)+colar*.8;
      float fade=1.-smoothstep(30.*uE,70.*uE,length(vW.xz));
      gl_FragColor=vec4(base*fade+uCor*emis*fade,1.);
    }`;

  function criar(scene, op) {
    if (!window.THREE || !window.CenarioGeometria) return null;
    const E = op.E || 1, chao = op.pisoY != null ? op.pisoY : -3.2 * E, sorteio = rng(op.semente || 20261105);
    const R = (a, b) => a + (b - a) * sorteio(), V = (x, y, z) => new THREE.Vector3(x, y, z);
    const grupo = new THREE.Group(); grupo.name = 'veias'; scene.add(grupo);
    const RAIO = [.085 * E, .055 * E, .026 * E, .014 * E];
    const listas = [[], [], [], []];                // curvas por tipo: {pts:[Vector3...]}
    const curva = (tipo, a, b, c, d) => listas[tipo].push([a, b, c, d]);
    const noChao = (tipo) => chao + RAIO[tipo] * .95;
    const polar = (r, ang, y) => V(Math.cos(ang) * r, y, Math.sin(ang) * r);

    // 1) Veias do piso: saem da base do núcleo e correm pelo chão até as paredes (o "circuito" da ref), algumas em feixe.
    for (let i = 0; i < 34; i++) {
      const tipo = i % 5 === 0 ? 0 : i % 3 === 0 ? 1 : i % 2 ? 2 : 3, y = noChao(tipo);
      const a0 = i / 34 * Math.PI * 2 + R(-.05, .05), r0 = R(1.1, 1.5) * E, r1 = R(15.5, 17) * E, giro = R(-.5, .5);
      const p0 = polar(r0, a0, y), p3 = polar(r1, a0 + giro, y);
      const p1 = polar(R(4, 7) * E, a0 + giro * R(.1, .4), y), p2 = polar(R(9, 13) * E, a0 + giro * R(.6, .95), y);
      curva(tipo, p0, p1, p2, p3);
      if (tipo === 2) for (const off of [.05, -.05]) { const o = V(-Math.sin(a0) * off * E, 0, Math.cos(a0) * off * E); curva(2, p0.clone().add(o), p1.clone().add(o), p2.clone().add(o), p3.clone().add(o)); }
    }
    // 2) Descidas de parede: saem alto na parede, descem e se deitam no piso rumo ao deck.
    for (let i = 0; i < 22; i++) {
      const tipo = i % 4 === 0 ? 0 : i % 2 ? 1 : 3, ang = R(0, Math.PI * 2), rw = 16.8 * E, alto = R(3, 7.5) * E;
      const p0 = polar(rw, ang, chao + alto), p1 = polar(rw - .2 * E, ang, chao + RAIO[tipo]), p2 = polar(R(10, 13) * E, ang + R(-.15, .15), noChao(tipo)), p3 = polar(R(6.2, 8) * E, ang + R(-.25, .25), noChao(tipo));
      curva(tipo, p0, p1, p2, p3);
    }
    // 3) Penduradas: catenárias entre pontos altos das paredes, passando por cima do deck (bem pesadas no meio).
    for (let i = 0; i < 14; i++) {
      // vãos curtos entre painéis vizinhos da 1ª parede: penduram rente à parede e nunca cruzam a frente da câmera
      const tipo = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 3, a0 = R(0, Math.PI * 2), a1 = a0 + R(.25, .6);
      const h0 = chao + R(5, 7) * E, h1 = chao + R(5, 7) * E, p0 = polar(16.7 * E, a0, h0), p3 = polar(16.7 * E, a1, h1);
      const meio = p0.clone().add(p3).multiplyScalar(.5); meio.y = chao + R(2.2, 3.8) * E;
      curva(tipo, p0, p0.clone().lerp(meio, .66).setY(meio.y - .8 * E), p3.clone().lerp(meio, .66).setY(meio.y - .8 * E), p3);
    }
    // 4) Escoradas: sobem do piso fora do deck e se apoiam na mureta/guarda-corpo (r 5,9E), em arco curto.
    for (let i = 0; i < 16; i++) {
      const tipo = i % 2 ? 1 : 2, ang = i / 16 * Math.PI * 2 + .2, y = noChao(tipo);
      const p0 = polar(R(8.5, 11) * E, ang, y), p3 = polar(6.05 * E, ang + R(-.05, .05), chao + R(.3, 1) * E);
      curva(tipo, p0, polar(7.6 * E, ang, y), polar(6.4 * E, ang, chao + R(.9, 1.6) * E), p3);
    }
    // 5) Saindo do quadro: do deck para longe (somem no fundo) e do topo do núcleo para o alto.
    for (let i = 0; i < 12; i++) {
      const tipo = i % 3 === 0 ? 0 : 3, ang = R(0, Math.PI * 2), y = noChao(tipo);
      curva(tipo, polar(6.3 * E, ang, y), polar(18 * E, ang + .1, y), polar(34 * E, ang + .25, y), polar(60 * E, ang + .4, y));
    }
    for (let i = 0; i < 6; i++) {
      const tipo = i % 2 ? 1 : 0, ang = i / 6 * Math.PI * 2;
      curva(tipo, polar(.9 * E, ang, 4.6 * E), polar(1.4 * E, ang, 7 * E), polar(3 * E, ang + .3, 11 * E), polar(5 * E, ang + .5, 22 * E));
    }

    // P4b: corredores livres nas dez poses Desktop de camera-estado.json.
    // Desvios angulares medidos por tipo/índice da curva (graus), sem mudar
    // altura, raio de ancoragem, modelo ou quantidade. Feixes giram juntos.
    // Ref: cabos sci-fi/ArtStation; cálculo e inspeção com Three r128/Playwright.
    // Reauditar estes corredores se as poses ou a semente forem alteradas.
    const desvios = [
      { 1:-3, 2:-9, 4:-6, 5:30, 8:30, 9:-27, 10:-51, 12:-30, 14:-21, 17:3, 18:-9 },
      { 5:-9, 6:39, 7:27, 10:18, 12:-21, 16:27, 17:24, 18:15, 19:15, 21:-9, 24:18, 29:-30, 30:24 },
      { 3:6, 4:6, 5:6, 15:-30, 16:-30, 17:-30, 18:48, 19:48, 20:48, 31:-3, 32:48, 33:3 },
      { 5:-33, 6:30, 9:-33, 11:-24, 12:-6, 13:21, 16:-30, 17:36, 18:3, 23:3, 25:12 },
    ];
    listas.forEach((lst, tipo) => lst.forEach((pts, i) => {
      const a = (desvios[tipo][i] || 0) * Math.PI / 180;
      if (!a) return;
      const c = Math.cos(a), s = Math.sin(a);
      pts.forEach(p => { const x = p.x, z = p.z; p.x = c * x - s * z; p.z = s * x + c * z; });
    }));

    // Malha única por tipo: tubos estáticos (CenarioGeometria.tubo) costurados num BufferGeometry.
    const mats = [], N = 40, LADOS = [10, 8, 6, 4];
    listas.forEach((lst, tipo) => {
      if (!lst.length) return;
      const pos = [], nor = [], aD = [], aU = [], aLen = [], idx = []; let base = 0;
      const centros = new Float32Array(N * 3);
      for (const [a, b, c, d] of lst) {
        CenarioGeometria.bezier(centros, a, b, c, d);
        let len = 0; for (let s = 1; s < N; s++) len += Math.hypot(centros[s * 3] - centros[s * 3 - 3], centros[s * 3 + 1] - centros[s * 3 - 2], centros[s * 3 + 2] - centros[s * 3 - 1]);
        const t = CenarioGeometria.tubo(N, LADOS[tipo]); t.atualizar(centros, RAIO[tipo] * (tipo === 0 ? 1 : R(.8, 1.15)));
        const P = t.geo.attributes.position.array, Nn = t.geo.attributes.normal.array, UV = t.geo.attributes.uv.array, I = t.geo.index.array;
        for (let k = 0; k < P.length / 3; k++) {
          pos.push(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]); nor.push(Nn[k * 3], Nn[k * 3 + 1], Nn[k * 3 + 2]);
          aD.push(Math.min(1, Math.hypot(P[k * 3], P[k * 3 + 1] * .5, P[k * 3 + 2]) / (24 * E))); aU.push(UV[k * 2]); aLen.push(len);
        }
        for (let k = 0; k < I.length; k++) idx.push(I[k] + base);
        base += P.length / 3; t.geo.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.setAttribute('aD', new THREE.Float32BufferAttribute(aD, 1)); geo.setAttribute('aU', new THREE.Float32BufferAttribute(aU, 1)); geo.setAttribute('aLen', new THREE.Float32BufferAttribute(aLen, 1));
      geo.setIndex(idx);
      const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG,
        uniforms: { uCarga: { value: -1 }, uLuz: { value: 0 }, uPulso: { value: 0 }, uTipo: { value: tipo }, uE: { value: E }, uT: { value: 0 }, uCor: { value: new THREE.Color(0xff9a4d) } } });
      mats.push(mat);
      const m = new THREE.Mesh(geo, mat); m.name = 'veias-' + ['corrugadas', 'lisas', 'feixes', 'fios'][tipo]; m.frustumCulled = false; grupo.add(m);
    });
    let destruido = false;
    let t0 = performance.now();
    function quadro() { const t = (performance.now() - t0) / 1000; mats.forEach(m => { m.uniforms.uT.value = t; }); }
    return {
      grupo, quadro,
      acender(v) { mats.forEach(m => { m.uniforms.uLuz.value = Math.max(0, Math.min(1.08, v)); }); },
      carga(v) { mats.forEach(m => { m.uniforms.uCarga.value = v; }); },
      pulso(v) { mats.forEach(m => { m.uniforms.uPulso.value = Math.max(0, Math.min(1, v)); }); },
      contagem: () => listas.reduce((a, l) => a + l.length, 0),
      destruir() { if (destruido) return; destruido = true; scene.remove(grupo); grupo.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); grupo.clear(); mats.length = 0; },
    };
  }
  window.Veias = { criar };
})();
