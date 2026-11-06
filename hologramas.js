'use strict';
// P3 · Pixflow/Dribbble: maquete luminosa sobre grade circular. Three r128.
// Só fecho precisa do novo objeto: pedidos/avisos não existem no roteiro B atual.
(function () {
  function criar(scene, { E }) {
    const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const grupo = new THREE.Group(); grupo.name = 'holograma-fecho';
    grupo.position.set(-10 * E, 0, 0); scene.add(grupo);
    const pontos = [], intensidades = [];
    const linha = (a, b, luz = 1) => { pontos.push(...a, ...b); intensidades.push(luz, luz); };
    function circulo(r, y, luz, inclinacao = 0, giro = 0) {
      const transformar = a => {
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const yy = -z * Math.sin(inclinacao), zz = z * Math.cos(inclinacao);
        return [x * Math.cos(giro) - zz * Math.sin(giro), y + yy, x * Math.sin(giro) + zz * Math.cos(giro)];
      };
      for (let i = 0; i < 96; i++) linha(transformar(i / 96 * Math.PI * 2), transformar((i + 1) / 96 * Math.PI * 2), luz);
    }
    // Tudo em unidades locais E; uma única geometria/material, sem alocação no quadro.
    for (const r of [.45, .9, 1.35, 1.65]) circulo(r, .02, .24);
    for (let i = -4; i <= 4; i++) {
      const x = i * .3, z = Math.sqrt(1.65 * 1.65 - x * x);
      linha([x, .02, -z], [x, .02, z], .12);
      linha([-z, .02, x], [z, .02, x], .12);
    }
    const centro = 1.62, raio = 1.03;
    for (let i = -3; i <= 3; i++) {
      const y = i * raio / 4; circulo(Math.sqrt(raio * raio - y * y), centro + y, .45);
    }
    for (let i = 0; i < 6; i++) circulo(raio, centro, .5, Math.PI / 2, i * Math.PI / 6);
    circulo(1.35, centro, .92, .42, .3);
    circulo(1.35, centro, .72, -.65, 1.4);
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2, r = i % 4 ? 1.57 : 1.5;
      linha([r * Math.cos(a), .025, r * Math.sin(a)], [1.65 * Math.cos(a), .025, 1.65 * Math.sin(a)], .8);
    }
    for (const s of [-1, 1]) {
      linha([s * 1.6, .55, 0], [s * 1.6, 2.65, 0], .3);
      linha([s * 1.6, 2.65, 0], [s * 1.35, 2.65, 0], .7);
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(pontos, 3));
    geometria.setAttribute('aLuz', new THREE.Float32BufferAttribute(intensidades, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uP: { value: 0 }, uT: { value: 0 }, uE: { value: E }, uMov: { value: reduzido ? 0 : 1 } },
      vertexShader: `attribute float aLuz;varying float vLuz,vY,vDist;uniform float uE;
        void main(){vLuz=aLuz;vY=position.y;vec4 p=modelViewMatrix*vec4(position*uE,1.);vDist=length(p.xyz)/uE;gl_Position=projectionMatrix*p;}`,
      fragmentShader: `uniform float uP,uT,uMov;varying float vLuz,vY,vDist;
        void main(){float frente=smoothstep(vY-.18,vY+.18,uP*3.2);
          float scan=exp(-pow((vY-mod(uT*.42,2.8))/.06,2.))*uMov;
          float longe=1.-smoothstep(25.,65.,vDist);
          gl_FragColor=vec4(vec3(1.,.604,.302),uP*frente*longe*(vLuz*.65+scan*.45));}`
    });
    const malha = new THREE.LineSegments(geometria, material);
    // O shader aplica E às posições; a esfera de culling CPU não conhece essa escala.
    malha.frustumCulled = false; grupo.add(malha);
    const rotulo = document.createElement('div');
    rotulo.textContent = 'SISTEMAS / VISÃO GERAL'; rotulo.setAttribute('aria-hidden', 'true');
    Object.assign(rotulo.style, { position: 'fixed', left: '0', top: '0', width: '240px', textAlign: 'center',
      font: '400 10px "JetBrains Mono", monospace', letterSpacing: '.16em', color: '#ff9a4d',
      pointerEvents: 'none', zIndex: '1', opacity: '0' }); document.body.appendChild(rotulo);
    const ancora = new THREE.Vector3(); let progresso = 0;
    grupo.visible = false;
    return {
      grupo,
      progresso(id, p) { progresso = id === 'fecho' ? Math.max(0, Math.min(1, p)) : 0; material.uniforms.uP.value = progresso; grupo.visible = progresso > .001; },
      quadro(t, camera) {
        material.uniforms.uT.value = reduzido ? 0 : t;
        rotulo.style.opacity = '0';
        if (!grupo.visible || !camera) return;
        ancora.set(0, -.18 * E, 0).add(grupo.position).project(camera);
        if (Math.abs(ancora.x) > .95 || Math.abs(ancora.y) > .95 || Math.abs(ancora.z) > 1) return;
        rotulo.style.transform = `translate(${(ancora.x * .5 + .5) * innerWidth - 120}px,${(-ancora.y * .5 + .5) * innerHeight}px)`;
        rotulo.style.opacity = String(progresso * .8);
      },
      destruir() { scene.remove(grupo); geometria.dispose(); material.dispose(); rotulo.remove(); }
    };
  }
  window.Hologramas = { criar };
})();
