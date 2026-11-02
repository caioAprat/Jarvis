'use strict';
/** Sala de controle: um piso, um hub e suportes físicos. Nenhuma luz afeta o núcleo. */
(function () {
  function montar(mapa, proto) {
    const THREE = window.THREE, dep = mapa.depurar(), E = proto.E, CHAO = -3.2 * E;
    const grupo = new THREE.Group(); grupo.name = 'ambiente-controle'; dep.scene.add(grupo);
    const recursos = new Set(), apoios = [], portas = [];
    const metal = new THREE.MeshBasicMaterial({ color: 0x17130f });
    const escuro = new THREE.MeshBasicMaterial({ color: 0x0c0b09 });
    const acento = new THREE.MeshBasicMaterial({ color: 0xff9a4d, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false });
    [metal, escuro, acento].forEach(m => recursos.add(m));
    function mesh(geo, mat, parent = grupo) { recursos.add(geo); const m = new THREE.Mesh(geo, mat); parent.add(m); return m; }
    const hub = new THREE.Group(); hub.name = 'hub'; grupo.add(hub);
    const pedestal = mesh(new THREE.CylinderGeometry(1.55 * E, 1.7 * E, .34 * E, 64), metal, hub);
    pedestal.position.y = CHAO + .17 * E;
    const tampa = mesh(new THREE.CylinderGeometry(1.5 * E, 1.5 * E, .035 * E, 64), escuro, hub); tampa.position.y = CHAO + .35 * E;
    const aro = mesh(new THREE.TorusGeometry(1.48 * E, .009 * E, 4, 72), acento, hub); aro.rotation.x = Math.PI / 2; aro.position.y = CHAO + .375 * E;
    const centros = Array.from({ length: 16 }, () => new THREE.Vector3(10000, 0, 10000));
    const pisoMat = new THREE.ShaderMaterial({ uniforms: { uE: { value: E }, uBases: { value: centros } },
      vertexShader: 'varying vec3 vP; void main(){vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.);}',
      fragmentShader: `uniform float uE; uniform vec3 uBases[16]; varying vec3 vP;
        void main(){vec2 p=vP.xz/uE;float r=length(p);float luz=exp(-r*r*.095);
          float sombra=exp(-r*r*.42)*.75;
          for(int i=0;i<16;i++){vec2 d=(vP.xz-uBases[i].xz)/uE;sombra=max(sombra,exp(-dot(d,d)*8.)*.85);}
          float marca=pow(max(0.,cos(r*6.28318)),180.)*step(1.9,r)*(1.-smoothstep(6.,10.,r));
          vec3 cor=vec3(.009,.007,.006)*(1.-sombra*.85)+vec3(.12,.035,.007)*luz*(1.-sombra)+vec3(.06,.025,.008)*marca;
          cor=mix(cor,vec3(.03137,.02745,.02353),smoothstep(8.,20.,r));gl_FragColor=vec4(cor,1.);}` }); recursos.add(pisoMat);
    const piso = mesh(new THREE.PlaneGeometry(60 * E, 60 * E), pisoMat); piso.name = 'chao-unico'; piso.rotation.x = -Math.PI / 2; piso.position.y = CHAO;
    const eixo = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), giroSoquete = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI / 2);
    function limparApoios() {
      [...apoios, ...portas].forEach(a => { const g = a.grupo; grupo.remove(g); g.traverse(o => { if (o.geometry) { o.geometry.dispose(); recursos.delete(o.geometry); } }); });
      apoios.length = portas.length = 0; centros.forEach(c => c.set(10000, 0, 10000));
    }
    function sincronizar() {
      const ids = proto.modulos.map(m => m.id).join('|'); if (ids === sincronizar.ids) return;
      sincronizar.ids = ids; limparApoios();
      proto.modulos.forEach((m, i) => {
        const g = new THREE.Group(); g.name = 'apoio-' + m.id; grupo.add(g);
        const pe = mesh(new THREE.CylinderGeometry(.32 * E, .4 * E, .09 * E, 16), escuro, g);
        const haste = mesh(new THREE.CylinderGeometry(.035 * E, .055 * E, 1, 8), metal, g);
        const junta = mesh(new THREE.SphereGeometry(.085 * E, 10, 8), metal, g);
        const soquete = mesh(new THREE.CylinderGeometry(.07 * E, .09 * E, .12 * E, 12), metal, g);
        const aro = mesh(new THREE.TorusGeometry(.072 * E, .01 * E, 4, 12), acento, g);
        apoios.push({ grupo: g, id: m.id, modulo: m, pe, haste, junta, soquete, aro, ancora: new THREE.Vector3(), apoio: new THREE.Vector3() });
        const ang = i / Math.max(1, proto.modulos.length) * Math.PI * 2;
        const pos = new THREE.Vector3(Math.cos(ang) * 1.52 * E, CHAO + .26 * E, Math.sin(ang) * 1.52 * E);
        const pg = new THREE.Group(); pg.name = 'porta-hub-' + m.id; grupo.add(pg);
        const normal = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
        const corpo = mesh(new THREE.CylinderGeometry(.075 * E, .09 * E, .15 * E, 12), metal, pg); corpo.position.copy(pos); corpo.quaternion.setFromUnitVectors(eixo, normal);
        const anel = mesh(new THREE.TorusGeometry(.077 * E, .011 * E, 4, 12), acento, pg); anel.position.copy(pos).addScaledVector(normal, .075 * E); anel.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), normal);
        portas.push({ grupo: pg, id: m.id, ancora: pos.clone().addScaledVector(normal, .07 * E) });
      });
      quadro();
    }
    function quadro() {
      proto.raiz.updateMatrixWorld(true);
      apoios.forEach((a, i) => {
        const m = a.modulo.g; a.grupo.visible = proto.visivel() > .005;
        m.localToWorld(a.ancora.set(0, -.36 * E, -.08 * E));
        m.localToWorld(a.apoio.set(0, -.5 * E, -.06 * E));
        a.pe.position.set(a.apoio.x, CHAO + .045 * E, a.apoio.z);
        const altura = Math.max(.01 * E, a.apoio.y - CHAO - .08 * E);
        a.haste.position.set(a.apoio.x, CHAO + .08 * E + altura / 2, a.apoio.z); a.haste.scale.y = altura;
        a.junta.position.copy(a.apoio); a.soquete.position.copy(a.ancora);
        m.getWorldQuaternion(q); a.soquete.quaternion.copy(q).multiply(giroSoquete);
        a.aro.position.copy(a.ancora); a.aro.quaternion.copy(q);
        if(centros[i]){if (a.grupo.visible) centros[i].copy(a.pe.position); else centros[i].set(10000, 0, 10000);}
      });
    }
    function mostrar(v) { if(grupo.visible && !v) recursos.forEach(r=>r.dispose()); grupo.visible = !!v; }
    function destruir() { recursos.forEach(r => r.dispose()); recursos.clear(); dep.scene.remove(grupo); }
    sincronizar();
    return { grupo, CHAO, portas, apoios, sincronizar, quadro, mostrar, destruir };
  }
  window.AmbienteControle = { montar };
})();
