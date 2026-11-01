'use strict';
/** Uma ligação física por monitor. O ambiente é independente do modelo luminoso. */
(function () {
  function montar(mapa, proto, op) {
    if (!mapa || !proto || !window.THREE) return null;
    const E = proto.E, dep = mapa.depurar(), ambiente = AmbienteControle.montar(mapa, proto);
    const grupo = new THREE.Group(); grupo.name = 'fios'; dep.scene.add(grupo);
    const cabos = [], material = new THREE.MeshBasicMaterial({ color: 0x24201a });
    function refazer() {
      cabos.forEach(c => { grupo.remove(c.mesh); c.mesh.geometry.dispose(); }); cabos.length = 0; ambiente.sincronizar();
      ambiente.apoios.forEach((a, i) => {
        const ini = ambiente.portas[i].ancora, fim = a.ancora, meio = ini.clone().lerp(fim,.5); meio.y = ambiente.CHAO + .12 * E;
        const curva = new THREE.QuadraticBezierCurve3(ini.clone(), meio, fim.clone());
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curva,48,.03*E,8,false), material);grupo.add(mesh);cabos.push({mesh});
      });
    }
    let vis = 0;
    function quadro() { if(document.hidden) return; ambiente.quadro(); grupo.visible = vis > 0 && proto.visivel() > .005; }
    function acenderChao(v) {vis=v;}
    function mostrar(v) {grupo.visible=!!v;ambiente.mostrar(v);}
    function destruir(){cabos.forEach(c=>c.mesh.geometry.dispose());material.dispose();dep.scene.remove(grupo);ambiente.destruir();}
    refazer();
    return {grupo, refazer, quadro, acenderChao, acenderEsticados(){}, pacotes(){}, status(){}, mostrar, destruir, contagem:()=>({cabos:cabos.length})};
  }
  window.Fios={montar};
})();
