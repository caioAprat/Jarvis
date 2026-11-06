'use strict';
/**
 * Conexão de energia núcleo → mundo dos clientes (R2, Claude, 05/11/2026).
 * Pedido do Caio: "conexão muito mais bem feita de energia; não pode ser só energia laranja 3D feia e opaca".
 * Ref: feixe de energia atravessando anéis de contenção (Andrew Oliinyk, Dribbble "energy beam 3d").
 * Camadas: fio de energia fino e quente no centro (com pulsos correndo do núcleo para o planeta), bainha de luz bem fraca,
 * duas espirais finas girando em volta, anéis de contenção ao longo do caminho (acendem quando o pulso passa) e
 * emissores nas duas pontas. Sem partículas, poeira ou arquivos (pedido do Caio). Também monta o ambiente e a sala.
 */
(function () {
  function montar(mapa, planeta, op) {
    if (!planeta) return null;
    const dep = mapa.depurar(), E = dep.escala, leve = !!op.leve, red = matchMedia('(prefers-reduced-motion: reduce)');
    const grupo = new THREE.Group(); grupo.name = 'veia-clientes'; dep.scene.add(grupo);
    const ambiente = CenarioGeometria.ambiente(E); dep.scene.add(ambiente);
    const salaNucleo = CenarioGeometria.sala ? CenarioGeometria.sala(E) : null; if (salaNucleo) dep.scene.add(salaNucleo);
    const aditivo = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

    // Caminho fixo no mundo: sai do núcleo, sobe um pouco e desce no hemisfério do planeta voltado para o núcleo.
    const cima = new THREE.Vector3(0, 1, 0), direcao = planeta.posicao.clone().normalize(), lateral = new THREE.Vector3().crossVectors(direcao, cima).normalize();
    const a = direcao.clone().multiplyScalar(1.45 * E), d = direcao.clone().multiplyScalar(-planeta.raio * 1.02).add(planeta.posicao);
    const b = a.clone().addScaledVector(lateral, .8 * E).addScaledVector(direcao, 6 * E).addScaledVector(cima, 1.6 * E);
    const c = d.clone().addScaledVector(lateral, .8 * E).addScaledVector(direcao, -6 * E).addScaledVector(cima, 1.6 * E);
    const curva = new THREE.CubicBezierCurve3(a, b, c, d), N = leve ? 90 : 160, comp = curva.getLength();
    const centros = new Float32Array(N * 3); curva.getSpacedPoints(N - 1).forEach((p, i) => { centros[i * 3] = p.x; centros[i * 3 + 1] = p.y; centros[i * 3 + 2] = p.z; });

    const U = { uT: { value: 0 }, uVis: { value: 0 }, uLen: { value: comp / E } };
    const VERT = 'varying vec2 vUv;varying float vD;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}';
    // pulsos: 3 pacotes de energia correndo ao longo de vUv.x (núcleo → planeta)
    const PULSO = 'float pulsos(float x,float t){float p=0.;for(int i=0;i<3;i++){float c=fract(t*.18+float(i)/3.);p+=smoothstep(.05,0.,abs(x-c));}return p;}';
    const nucleoMat = new THREE.ShaderMaterial(Object.assign({ uniforms: U, vertexShader: VERT,
      fragmentShader: `uniform float uT,uVis,uLen;varying vec2 vUv;varying float vD;${PULSO}
        void main(){float fim=smoothstep(0.,.02,vUv.x)*(1.-smoothstep(.98,1.,vUv.x));float tremor=.85+.15*sin(vUv.x*uLen*3.-uT*14.);
          float p=pulsos(vUv.x,uT);vec3 cor=mix(vec3(1.,.62,.3),vec3(1.,.93,.8),clamp(p,0.,1.));
          gl_FragColor=vec4(cor,uVis*fim*(.55*tremor+p*1.2));}` }, aditivo));
    const fio = CenarioGeometria.tubo(N, 6); fio.atualizar(centros, .028 * E); grupo.add(Object.assign(new THREE.Mesh(fio.geo, nucleoMat), { frustumCulled: false }));
    const bainhaMat = new THREE.ShaderMaterial(Object.assign({ uniforms: U, vertexShader: VERT,
      fragmentShader: `uniform float uT,uVis;varying vec2 vUv;varying float vD;${PULSO}
        void main(){float fim=smoothstep(0.,.04,vUv.x)*(1.-smoothstep(.96,1.,vUv.x));float p=pulsos(vUv.x,uT);
          gl_FragColor=vec4(1.,.55,.25,uVis*fim*(.045+p*.08));}` }, aditivo));
    const bainha = CenarioGeometria.tubo(N, 12); bainha.atualizar(centros, .16 * E); grupo.add(Object.assign(new THREE.Mesh(bainha.geo, bainhaMat), { frustumCulled: false }));

    // Espirais: duas linhas finas girando em volta do fio (calculadas com o referencial de Frenet da curva).
    const quadros = curva.computeFrenetFrames(N - 1, false), esp = [], espU = [];
    for (const fase of [0, Math.PI]) for (let i = 0; i < N - 1; i++) for (const k of [i, i + 1]) {
      const t = k / (N - 1), ang = t * comp / E * 2.2 + fase, r = .1 * E, p = curva.getPointAt(t), nn = quadros.normals[k], bb = quadros.binormals[k];
      esp.push(p.x + (nn.x * Math.cos(ang) + bb.x * Math.sin(ang)) * r, p.y + (nn.y * Math.cos(ang) + bb.y * Math.sin(ang)) * r, p.z + (nn.z * Math.cos(ang) + bb.z * Math.sin(ang)) * r); espU.push(t);
    }
    const espGeo = new THREE.BufferGeometry(); espGeo.setAttribute('position', new THREE.Float32BufferAttribute(esp, 3)); espGeo.setAttribute('aU', new THREE.Float32BufferAttribute(espU, 1));
    const espMat = new THREE.ShaderMaterial(Object.assign({ uniforms: U,
      vertexShader: 'attribute float aU;varying float vU;void main(){vU=aU;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uT,uVis;varying float vU;${PULSO}void main(){float fim=smoothstep(0.,.05,vU)*(1.-smoothstep(.95,1.,vU));gl_FragColor=vec4(1.,.7,.42,uVis*fim*(.22+pulsos(vU,uT)*.6));}` }, aditivo));
    const espiral = new THREE.LineSegments(espGeo, espMat); grupo.add(espiral);

    // Anéis de contenção: a cada ~2,6E, perpendiculares ao caminho; acendem quando um pulso passa.
    const aneis = [], nA = Math.max(4, Math.floor(comp / (2.6 * E)));
    for (let i = 1; i < nA; i++) {
      const t = i / nA, p = curva.getPointAt(t), tg = curva.getTangentAt(t);
      const m = new THREE.MeshBasicMaterial(Object.assign({ color: 0xff9a4d, opacity: 0 }, aditivo));
      const anel = new THREE.Mesh(new THREE.TorusGeometry(.24 * E, .012 * E, 6, 48), m);
      anel.position.copy(p); anel.lookAt(p.clone().add(tg)); grupo.add(anel); aneis.push({ anel, m, t });
    }
    // Emissores nas pontas (anel duplo + brilho).
    const pontas = [];
    for (const [p, t] of [[a, 0], [d, 1]]) {
      const tg = curva.getTangentAt(t), g = new THREE.Group(); g.position.copy(p); g.lookAt(p.clone().add(tg)); grupo.add(g);
      const m1 = new THREE.MeshBasicMaterial(Object.assign({ color: 0xffc58a, opacity: 0, side: THREE.DoubleSide }, aditivo));
      g.add(new THREE.Mesh(new THREE.RingGeometry(.16 * E, .2 * E, 40), m1));
      g.add(new THREE.Mesh(new THREE.RingGeometry(.3 * E, .32 * E, 40), m1));
      pontas.push({ g, m1 });
    }

    function quadro(t, dt) {
      grupo.visible = planeta.grupo.visible; if (!grupo.visible) return;
      const vis = planeta.visivel ? planeta.visivel() : 1, tempo = red.matches ? 0 : t;
      U.uVis.value = vis; U.uT.value = tempo;
      aneis.forEach(o => { let p = 0; for (let i = 0; i < 3; i++) { const c = (tempo * .18 + i / 3) % 1; p = Math.max(p, 1 - Math.min(1, Math.abs(o.t - c) / .06)); } o.m.opacity = vis * (.14 + p * .7); o.anel.scale.setScalar(1 + p * .18); });
      pontas.forEach((o, i) => { o.m1.opacity = vis * (.35 + .25 * Math.sin(tempo * 3 + i * 1.7)); o.g.rotateZ(dt * .6); });
    }
    let destruido = false;
    function destruir() {
      if (destruido) return; destruido = true;
      dep.scene.remove(grupo); dep.scene.remove(ambiente); if (salaNucleo) dep.scene.remove(salaNucleo);
      const recursos = new Set();
      [grupo, ambiente, salaNucleo].forEach(r => r && r.traverse(o => { if (o.geometry) recursos.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => recursos.add(m)); }));
      recursos.forEach(r => r.dispose());
      [grupo, ambiente, salaNucleo].forEach(r => r && r.clear());
    }
    return { quadro, destruir };
  }
  window.VeiasCenario = { montar };
})();
