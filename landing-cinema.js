'use strict';
(function () {
  function criar(mapa, reduzido) {
    const dep=mapa.depurar(), E=dep.escala, mob=innerWidth<700?1.65:1;
    const caminho=new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3,2,17),new THREE.Vector3(2,3,15),new THREE.Vector3(-1,1,11),
      new THREE.Vector3(1,1,9),new THREE.Vector3(3,2,12),new THREE.Vector3(0,2,16)
    ].map(v=>v.multiplyScalar(E*mob)),false,'centripetal');
    const pos=new THREE.Vector3();
    return { aplicar(p){p=Math.max(0,Math.min(1,p));caminho.getPointAt(reduzido?0:p,pos);
      mapa.cinema({pos:pos.toArray(),cx:0,cy:E*.3,cz:0,fov:40-Math.sin(p*Math.PI)*3});
    }};
  }
  window.LandingCinema={criar};
})();
