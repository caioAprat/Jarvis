'use strict';
/**
 * JARVÃO · planeta dos clientes (R4, Claude, 05/11/2026) — Gabinete Chamados e Planilha J Hissnauer.
 *
 * Repaginado para o nível novo do Jarvis (pedido do Caio). Ref: planeta wireframe com anéis de mira (mike murdock, Dribbble).
 * Sem polígonos soltos nem fragmentos voando: esfera escura de metal com borda acesa (fresnel), grade de latitude/longitude
 * fina, faixa de varredura subindo e descendo, dois anéis de órbita inclinados — um por cliente — cada um com seu marcador,
 * e anéis de mira em volta (arcos com marcações) girando devagar.
 * montar(mapa, { posicao, raio, leve }) → { grupo, posicao, raio, mostrar(0..1), quadro(t,d), ancora() }
 */
(function () {
  function montar(mapa, op) {
    op = op || {};
    if (!mapa || !window.THREE) return null;
    const dep = mapa.depurar(), cena = dep.scene, R = op.raio || 6, leve = !!op.leve;
    const grupo = new THREE.Group(); grupo.position.copy(op.posicao || new THREE.Vector3()); grupo.visible = false; cena.add(grupo);
    const giro = new THREE.Group(); grupo.add(giro);
    const vis = { v: 0 }, mats = [];
    const aditivo = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };

    // Esfera: metal escuro, borda acesa e uma faixa de varredura que sobe e desce.
    const esferaMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uVis: { value: 0 } },
      vertexShader: 'varying vec3 vN,vP,vV;void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: `uniform float uT,uVis;varying vec3 vN,vP,vV;
        void main(){float fr=pow(1.-max(0.,dot(normalize(vN),vV)),2.6);
          float y=normalize(vP).y;float scan=smoothstep(.06,0.,abs(y-sin(uT*.45)*.92));
          vec3 cor=vec3(.035,.028,.024)+vec3(1.,.55,.25)*(fr*1.1+scan*.35)+vec3(1.,.85,.65)*fr*fr*.6;
          gl_FragColor=vec4(cor*uVis,1.);}`,
    });
    giro.add(new THREE.Mesh(new THREE.SphereGeometry(R, leve ? 40 : 72, leve ? 28 : 48), esferaMat));

    // Grade: latitudes e longitudes finas, um pouco acima da superfície; o equador mais forte.
    const linhas = (pts, opacidade, cor) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const m = new THREE.LineBasicMaterial(Object.assign({ color: cor || 0xff9a4d, opacity: 0 }, aditivo)); mats.push([m, opacidade]);
      return new THREE.LineSegments(g, m);
    };
    const rg = R * 1.004, grade = [], equador = [], SEG = 96;
    for (let i = 1; i < 12; i++) {
      const fi = -Math.PI / 2 + i * Math.PI / 12, y = Math.sin(fi) * rg, r = Math.cos(fi) * rg, alvo = i === 6 ? equador : grade;
      for (let j = 0; j < SEG; j++) { const a = j / SEG * Math.PI * 2, b = (j + 1) / SEG * Math.PI * 2; alvo.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); }
    }
    for (let i = 0; i < 18; i++) {
      const th = i / 18 * Math.PI * 2;
      for (let j = 0; j < 48; j++) { const a = -Math.PI / 2 + j / 48 * Math.PI, b = -Math.PI / 2 + (j + 1) / 48 * Math.PI; grade.push(Math.cos(a) * Math.cos(th) * rg, Math.sin(a) * rg, Math.cos(a) * Math.sin(th) * rg, Math.cos(b) * Math.cos(th) * rg, Math.sin(b) * rg, Math.cos(b) * Math.sin(th) * rg); }
    }
    giro.add(linhas(grade, .16)); giro.add(linhas(equador, .5));

    // Órbitas dos clientes: dois anéis inclinados, cada um com um marcador que percorre o anel.
    const orbitas = [];
    [[1.55, .42, .3], [1.85, -.55, 1.9]].forEach(([k, incl, fase]) => {
      const pts = []; for (let j = 0; j < 160; j++) { const a = j / 160 * Math.PI * 2, b = (j + 1) / 160 * Math.PI * 2; pts.push(Math.cos(a) * R * k, 0, Math.sin(a) * R * k, Math.cos(b) * R * k, 0, Math.sin(b) * R * k); }
      const anel = new THREE.Group(); anel.rotation.x = incl; anel.rotation.z = incl * .5; grupo.add(anel);
      anel.add(linhas(pts, .32));
      const mm = new THREE.MeshBasicMaterial(Object.assign({ color: 0xffd2a0, opacity: 0 }, aditivo)); mats.push([mm, 1]);
      const marcador = new THREE.Mesh(new THREE.SphereGeometry(R * .045, 16, 12), mm); anel.add(marcador);
      const hm = new THREE.MeshBasicMaterial(Object.assign({ color: 0xff9a4d, opacity: 0, side: THREE.DoubleSide }, aditivo)); mats.push([hm, .55]);
      const halo = new THREE.Mesh(new THREE.RingGeometry(R * .08, R * .095, 32), hm); anel.add(halo);
      orbitas.push({ anel, marcador, halo, k, fase });
    });

    // Anéis de mira: arcos com marcações em volta do planeta, virados para a câmera, girando em sentidos opostos.
    const mira = new THREE.Group(); grupo.add(mira);
    const miras = [];
    [[1.3, .28, 6, .7], [1.42, .18, 3, -.45], [2.15, .12, 9, .2]].forEach(([k, op_, n, vel]) => {
      const pts = [], r = R * k;
      for (let s = 0; s < n; s++) {
        const a0 = s / n * Math.PI * 2, a1 = a0 + Math.PI * 2 / n * .62;
        for (let j = 0; j < 24; j++) { const a = a0 + (a1 - a0) * j / 24, b = a0 + (a1 - a0) * (j + 1) / 24; pts.push(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(b) * r, Math.sin(b) * r, 0); }
        for (let t = 0; t < 6; t++) { const a = a0 + (a1 - a0) * t / 5; pts.push(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * (r - R * .05), Math.sin(a) * (r - R * .05), 0); }
      }
      const l = linhas(pts, op_); mira.add(l); miras.push({ l, vel });
    });

    function mostrar(v) { vis.v = Math.max(0, Math.min(1, v)); grupo.visible = vis.v > .005; esferaMat.uniforms.uVis.value = vis.v; mats.forEach(([mt, o]) => { mt.opacity = o * vis.v; }); }
    function quadro(t, d) {
      if (!grupo.visible) return;
      esferaMat.uniforms.uT.value = t; giro.rotation.y += d * .05;
      orbitas.forEach((o, i) => {
        const a = t * (.22 + i * .07) + o.fase, r = R * o.k;
        o.marcador.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); o.halo.position.copy(o.marcador.position);
        o.halo.lookAt(dep.camera.position); o.halo.scale.setScalar(1 + .25 * Math.sin(t * 3 + i));
      });
      mira.quaternion.copy(dep.camera.quaternion);
      miras.forEach(m => { m.l.rotation.z += d * m.vel * .3; });
    }
    const v = new THREE.Vector3();
    function ancora() { return v.set(R * .72, R * .62, R * .3).add(grupo.position).clone(); }
    mostrar(0);
    return { grupo, posicao: grupo.position, raio: R, mostrar, quadro, ancora, visivel: () => vis.v };
  }

  window.Planeta = { montar };
})();
