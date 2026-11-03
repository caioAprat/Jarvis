'use strict';
/** Conexão espacial núcleo → mundo dos clientes. Tubo e tráfego usam a mesma curva. */
(function () {
  function montar(mapa, planeta, op) {
    if (!planeta) return null;
    const dep=mapa.depurar(),E=dep.escala,leve=!!op.leve,red=matchMedia('(prefers-reduced-motion: reduce)');
    const grupo=new THREE.Group();grupo.name='veia-clientes';dep.scene.add(grupo);
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),d=new THREE.Vector3(),lateral=new THREE.Vector3(),direcao=new THREE.Vector3();
    const cima=new THREE.Vector3(),frente=new THREE.Vector3();
    const N=leve?48:80,centros=new Float32Array(N*3),tubo=CenarioGeometria.tubo(N,6);
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      uniforms:{uTime:{value:0},uVis:{value:0}},
      vertexShader:'varying vec2 vUv;varying float vDepth;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader:`uniform float uTime,uVis;varying vec2 vUv;varying float vDepth;void main(){float pulso=pow(max(0.,cos(vUv.x*50.-uTime*2.1)),40.);float fim=smoothstep(0.,.035,vUv.x)*(1.-smoothstep(.96,1.,vUv.x));float marca=pow(max(0.,cos(vUv.x*120.)),48.);vec3 cor=mix(vec3(1.,.604,.302),vec3(.965,.918,.86),pulso);gl_FragColor=vec4(cor,uVis*fim*(.15+pulso*.55+marca*.14)*exp(-vDepth*.012));}`});
    const malha=new THREE.Mesh(tubo.geo,mat);malha.frustumCulled=false;grupo.add(malha);
    const total=leve?90:300,p=new Float32Array(total*3),fase=new Float32Array(total),geo=new THREE.BufferGeometry();
    for(let i=0;i<total;i++)fase[i]=i/total;
    geo.setAttribute('position',new THREE.BufferAttribute(p,3).setUsage(THREE.DynamicDrawUsage));
    const pm=new THREE.PointsMaterial({color:0xf6eadb,size:.035*E,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending});
    const points=new THREE.Points(geo,pm);points.frustumCulled=false;grupo.add(points);
    const marcas=new THREE.InstancedMesh(new THREE.SphereGeometry(.034*E,8,6),new THREE.MeshBasicMaterial({color:0xff9a4d,transparent:true,opacity:.45}),7);marcas.frustumCulled=false;grupo.add(marcas);const dummy=new THREE.Object3D();
    let acumulado=0;
    function quadro(t,dt) {
      grupo.visible=planeta.grupo.visible;if(!grupo.visible)return;
      const vis=planeta.grupo.children[0].material.uniforms.uVis.value;mat.uniforms.uVis.value=vis;pm.opacity=.45*vis;marcas.material.opacity=.4*vis;
      const tempo=red.matches?0:t;mat.uniforms.uTime.value=tempo;
      acumulado+=dt;if(acumulado<1/30 && grupo.userData.pronto)return;acumulado=0;grupo.userData.pronto=true;
      // Controles em mundo; curva recua e retorna ao hemisfério voltado para o núcleo.
      direcao.copy(planeta.posicao).normalize();a.copy(direcao).multiplyScalar(1.45*E);
      lateral.setFromMatrixColumn(dep.camera.matrixWorld,0);cima.setFromMatrixColumn(dep.camera.matrixWorld,1);frente.setFromMatrixColumn(dep.camera.matrixWorld,2);
      d.copy(lateral).multiplyScalar(.84).addScaledVector(cima,.35).addScaledVector(frente,.4).normalize().multiplyScalar(planeta.raio).add(planeta.posicao);
      b.copy(a).addScaledVector(lateral,2.5*E).addScaledVector(cima,5*E).addScaledVector(frente,-4*E);
      c.copy(d).addScaledVector(lateral,3*E).addScaledVector(cima,2*E).addScaledVector(frente,-2*E);
      CenarioGeometria.bezier(centros,a,b,c,d);tubo.atualizar(centros,.018*E);
      for(let i=0;i<total;i++){
        const u=(fase[i]+tempo*(.026+(i%3)*.008))%1,x=u*(N-1),j=Math.floor(x),k=Math.min(N-1,j+1),f=x-j;
        for(let axis=0;axis<3;axis++)p[i*3+axis]=centros[j*3+axis]+(centros[k*3+axis]-centros[j*3+axis])*f;
      }
      geo.attributes.position.needsUpdate=true;
      for(let i=0;i<7;i++){const j=Math.round((i+1)/8*(N-1))*3;dummy.position.fromArray(centros,j);dummy.updateMatrix();marcas.setMatrixAt(i,dummy.matrix);}marcas.instanceMatrix.needsUpdate=true;
    }
    function destruir(){dep.scene.remove(grupo);tubo.geo.dispose();mat.dispose();geo.dispose();pm.dispose();marcas.geometry.dispose();marcas.material.dispose();}
    return {quadro,destruir};
  }
  window.VeiasCenario={montar};
})();
