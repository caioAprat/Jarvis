'use strict';
/** Conexão espacial núcleo → mundo dos clientes. Tubo e tráfego usam a mesma curva. */
(function () {
  function montar(mapa, planeta, op) {
    if (!planeta) return null;
    const dep=mapa.depurar(),E=dep.escala,leve=!!op.leve,red=matchMedia('(prefers-reduced-motion: reduce)');
    const grupo=new THREE.Group();grupo.name='veia-clientes';dep.scene.add(grupo);
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),d=new THREE.Vector3(),lateral=new THREE.Vector3(),direcao=new THREE.Vector3();
    const cima=new THREE.Vector3(0,1,0),frente=new THREE.Vector3(0,0,1);
    const ambiente=CenarioGeometria.ambiente(E);dep.scene.add(ambiente);
    const N=leve?48:80,centros=new Float32Array(N*3),tubo=CenarioGeometria.tubo(N,6);
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      uniforms:{uTime:{value:0},uVis:{value:0}},
      vertexShader:'varying vec2 vUv;varying float vDepth;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader:`uniform float uTime,uVis;varying vec2 vUv;varying float vDepth;void main(){float pulso=pow(max(0.,cos(vUv.x*75.398-uTime*2.1)),40.);float fim=smoothstep(0.,.035,vUv.x)*(1.-smoothstep(.96,1.,vUv.x));float marca=pow(max(0.,cos(vUv.x*120.)),48.);vec3 cor=mix(vec3(1.,.604,.302),vec3(1.,.72,.40),pulso);gl_FragColor=vec4(cor,uVis*fim*(.32+pulso*.45+marca*.18)*exp(-vDepth*.012));}`});
    const malha=new THREE.Mesh(tubo.geo,mat);malha.frustumCulled=false;grupo.add(malha);
    const total=leve?960:2160,p=new Float32Array(total*3),fase=new Float32Array(total),geo=new THREE.BufferGeometry();
    for(let i=0;i<total;i++)fase[i]=i/total;
    geo.setAttribute('position',new THREE.BufferAttribute(p,3).setUsage(THREE.DynamicDrawUsage));
    const pm=new THREE.PointsMaterial({color:0xff9a4d,size:.06*E,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending});
    const points=new THREE.Points(geo,pm);points.frustumCulled=false;grupo.add(points);
    const marcas=new THREE.InstancedMesh(new THREE.TorusGeometry(.19*E,.018*E,4,16),new THREE.MeshBasicMaterial({color:0xff9a4d,transparent:true,opacity:.45}),15);marcas.frustumCulled=false;grupo.add(marcas);const dummy=new THREE.Object3D();
    const arquivos=FiosIcones.montar(grupo,dep.camera,[{centros,tipos:['documento','pasta','banco'],duracao:2.7}]);
    let acumulado=0;
    function quadro(t,dt) {
      grupo.visible=planeta.grupo.visible;if(!grupo.visible)return;
      const vis=planeta.grupo.children[0].material.uniforms.uVis.value;mat.uniforms.uVis.value=vis;pm.opacity=.6*vis;marcas.material.opacity=.65*vis;
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
      arquivos.quadro(tempo,vis,red.matches,dep.renderer);
      for(let i=0;i<total;i++){
        const fluxo=(fase[i]+tempo*(.026+(i%3)*.008))%1;
        // Halo mais denso nas duas ancoras, mantendo o trafego no duto inteiro.
        const u=i%4===0?Math.pow(fluxo,3):i%4===1?1-Math.pow(1-fluxo,3):fluxo,x=u*(N-1),j=Math.floor(x),k=Math.min(N-1,j+1),f=x-j;
        for(let axis=0;axis<3;axis++)p[i*3+axis]=centros[j*3+axis]+(centros[k*3+axis]-centros[j*3+axis])*f;
      }
      // Halo de poeira 3D ao redor do duto, sem novas chamadas de desenho.
      for(let i=0;i<total;i++){const raio=(i%3===0?.3:.12)*E,ang=i*2.39996; p[i*3]+=Math.cos(ang)*raio;p[i*3+1]+=Math.sin(ang)*raio;}
      geo.attributes.position.needsUpdate=true;
      for(let i=0;i<15;i++){const j=Math.round((i+1)/16*(N-1))*3;dummy.position.fromArray(centros,j);frente.fromArray(centros,Math.min(N-1,j/3+1)*3);dummy.lookAt(frente);dummy.updateMatrix();marcas.setMatrixAt(i,dummy.matrix);}marcas.instanceMatrix.needsUpdate=true;
    }
    function destruir(){arquivos.destruir();dep.scene.remove(grupo);dep.scene.remove(ambiente);ambiente.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});tubo.geo.dispose();mat.dispose();geo.dispose();pm.dispose();marcas.geometry.dispose();marcas.material.dispose();}
    return {quadro,destruir};
  }
  window.VeiasCenario={montar};
})();
