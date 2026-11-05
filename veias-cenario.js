'use strict';
/** Conexão espacial núcleo → mundo dos clientes. Somente o tubo, sem tráfego. */
(function () {
  function montar(mapa, planeta, op) {
    if (!planeta) return null;
    const dep=mapa.depurar(),E=dep.escala,leve=!!op.leve,red=matchMedia('(prefers-reduced-motion: reduce)');
    const grupo=new THREE.Group();grupo.name='veia-clientes';dep.scene.add(grupo);
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),d=new THREE.Vector3(),lateral=new THREE.Vector3(),direcao=new THREE.Vector3();
    const cima=new THREE.Vector3(0,1,0),frente=new THREE.Vector3(0,0,1);
    const ambiente=CenarioGeometria.ambiente(E);dep.scene.add(ambiente);const salaNucleo=CenarioGeometria.sala?CenarioGeometria.sala(E):null;if(salaNucleo)dep.scene.add(salaNucleo);
    const N=leve?48:80,centros=new Float32Array(N*3),tubo=CenarioGeometria.tubo(N,6);
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      uniforms:{uTime:{value:0},uVis:{value:0}},
      vertexShader:'varying vec2 vUv;varying float vDepth;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader:`uniform float uTime,uVis;varying vec2 vUv;varying float vDepth;void main(){float pulso=0.;float fim=smoothstep(0.,.035,vUv.x)*(1.-smoothstep(.96,1.,vUv.x));float marca=pow(max(0.,cos(vUv.x*120.)),48.);vec3 cor=mix(vec3(1.,.604,.302),vec3(1.,.72,.40),pulso);gl_FragColor=vec4(cor,uVis*fim*(.32+pulso*.45+marca*.18)*exp(-vDepth*.012));}`});
    const malha=new THREE.Mesh(tubo.geo,mat);malha.frustumCulled=false;grupo.add(malha);
    let acumulado=0;
    function quadro(t,dt) {
      grupo.visible=planeta.grupo.visible;if(!grupo.visible)return;
      const vis=planeta.grupo.children[0].material.uniforms.uVis.value;mat.uniforms.uVis.value=vis;
      const tempo=red.matches?0:t;mat.uniforms.uTime.value=tempo;
      acumulado+=dt;if(acumulado<1/30 && grupo.userData.pronto)return;acumulado=0;grupo.userData.pronto=true;
      // Controles em mundo; curva recua e retorna ao hemisfério voltado para o núcleo.
      direcao.copy(planeta.posicao).normalize();a.copy(direcao).multiplyScalar(1.45*E);
      // Estrutura fixa no mundo; a camera nao desloca a conexao.
      lateral.crossVectors(direcao,cima).normalize();
      d.copy(direcao).multiplyScalar(-planeta.raio).add(planeta.posicao);
      b.copy(a).addScaledVector(lateral,.8*E).addScaledVector(direcao,6*E).addScaledVector(cima,1.2*E);
      c.copy(d).addScaledVector(lateral,.8*E).addScaledVector(direcao,-6*E).addScaledVector(cima,1.2*E);
      CenarioGeometria.bezier(centros,a,b,c,d);tubo.atualizar(centros,.065*E);

    }
    function destruir(){dep.scene.remove(grupo);dep.scene.remove(ambiente);ambiente.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});tubo.geo.dispose();mat.dispose();}
    return {quadro,destruir};
  }
  window.VeiasCenario={montar};
})();
