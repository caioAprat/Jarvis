'use strict';
/**
 * JARVÃO · planeta tech (R3, sem rocha nem lava) — o mundo dos clientes (Gabinete Chamados e Planilha J Hissnauer).
 *
 * Placas escuras (as faces de um icosaedro encolhidas, deixando fendas) sobre um miolo cujas fendas emitem laranja
 * (shader com ruído em faixas), uma malha wireframe por fora e fragmentos (InstancedMesh) que se soltam e orbitam
 * como blocos de dados. Fica longe do protótipo, numa cena própria do roteiro; não compete com o núcleo.
 * montar(mapa, { posicao, raio, leve }) → { grupo, posicao, mostrar(0..1), quadro(t,d), ancora() }
 */
(function () {
  const RUIDO = `
    float h3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float rn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }`;

  function montar(mapa, op) {
    op = op || {};
    if (!mapa || !window.THREE) return null;
    const dep = mapa.depurar(), cena = dep.scene, R = op.raio || 6, leve = !!op.leve;
    const grupo = new THREE.Group(); grupo.position.copy(op.posicao || new THREE.Vector3()); grupo.visible = false; cena.add(grupo);
    const vis = { v: 0 }, mats = [];

    // miolo com fendas que emitem laranja
    const mioloMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uVis: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: RUIDO + `
        uniform float uTime, uVis; varying vec3 vP;
        void main(){ vec3 q = normalize(vP) * 3.2; float n = rn(q + vec3(0., uTime * .08, 0.)) * .65 + rn(q * 2.3 - uTime * .05) * .35;
          float fenda = 1. - smoothstep(.0, .06, abs(n - .5));
          vec3 cor = mix(vec3(1., .54, .24), vec3(1., .88, .72), fenda * fenda) * (.25 + fenda * 1.6);
          gl_FragColor = vec4(cor * uVis, 1.); }`,
    });
    grupo.add(new THREE.Mesh(new THREE.SphereGeometry(R * .97, leve ? 32 : 64, leve ? 24 : 48), mioloMat));

    // placas: faces do icosaedro encolhidas para o próprio centro (sobram as fendas entre elas)
    const ico = new THREE.IcosahedronGeometry(R, leve ? 2 : 3), pos = ico.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      m.copy(a).add(b).add(c).multiplyScalar(1 / 3); const k = .86 + ((i / 3) % 5) * .012, sobe = 1 + ((i / 3) % 7) * .006;
      [a, b, c].forEach((v, j) => { v.sub(m).multiplyScalar(k).add(m).multiplyScalar(sobe); pos.setXYZ(i + j, v.x, v.y, v.z); });
    }
    ico.computeVertexNormals();
    const placaMat = new THREE.MeshBasicMaterial({ color: 0x120e0b, transparent: true, opacity: 0, side: THREE.DoubleSide }); mats.push([placaMat, .97]);
    grupo.add(new THREE.Mesh(ico, placaMat));
    const bordaMat = new THREE.LineBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }); mats.push([bordaMat, .35]);
    grupo.add(new THREE.LineSegments(new THREE.EdgesGeometry(ico, 1), bordaMat));
    const malhaMat = new THREE.MeshBasicMaterial({ color: 0xffe0b8, wireframe: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }); mats.push([malhaMat, .12]);
    grupo.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R * 1.12, 1), malhaMat));

    // fragmentos = blocos de dados que se soltam e orbitam
    const NF = leve ? 18 : 42, fragMat = new THREE.MeshBasicMaterial({ color: 0xffe0b8, transparent: true, opacity: 0 }); mats.push([fragMat, .9]);
    const frags = new THREE.InstancedMesh(new THREE.BoxGeometry(R * .06, R * .06, R * .06), fragMat, NF); grupo.add(frags);
    const fi = []; for (let i = 0; i < NF; i++) fi.push({ th: Math.random() * 6.28, ph: Math.acos(2 * Math.random() - 1), r: 1.02 + Math.random() * .1, v: .1 + Math.random() * .25, sai: Math.random() * 1.4, inc: (Math.random() - .5) * .8 });
    const dm = new THREE.Object3D();

    function mostrar(v) { vis.v = Math.max(0, Math.min(1, v)); grupo.visible = vis.v > .005; mioloMat.uniforms.uVis.value = vis.v; mats.forEach(([mt, o]) => { mt.opacity = o * vis.v; }); }
    function quadro(t, d) {
      if (!grupo.visible) return;
      mioloMat.uniforms.uTime.value = t; grupo.rotation.y += d * .06;
      fi.forEach((f, i) => {
        f.sai += d * .08; if (f.sai > 1.5) f.sai = 0;                  // solta, afasta, volta a nascer na superfície
        const rr = R * (f.r + Math.max(0, f.sai - .3) * .7); f.th += d * f.v;
        dm.position.set(Math.sin(f.ph) * Math.cos(f.th) * rr, Math.cos(f.ph) * rr + Math.sin(f.th + f.inc) * R * .08, Math.sin(f.ph) * Math.sin(f.th) * rr);
        dm.rotation.set(t * f.v * 3, t * f.v * 2, 0); dm.scale.setScalar(1 - Math.max(0, f.sai - 1.1) * 2.2 + .001); dm.updateMatrix(); frags.setMatrixAt(i, dm.matrix);
      });
      frags.instanceMatrix.needsUpdate = true;
    }
    const v = new THREE.Vector3();
    function ancora() { return v.set(R * .72, R * .62, R * .3).add(grupo.position).clone(); }
    mostrar(0);
    return { grupo, posicao: grupo.position, raio: R, mostrar, quadro, ancora };
  }

  window.Planeta = { montar };
})();
