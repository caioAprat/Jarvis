'use strict';
(function(){
  // Campo vetorial com rotacional analítico: movimento sem divergência, calculado na GPU.
  const campo=`vec3 curl(vec3 p){return vec3(cos(p.y)-sin(p.z),cos(p.z)-sin(p.x),cos(p.x)-sin(p.y));}`;
  function montar(scene,op={}){
    const n=op.leve?1800:5200,geo=new THREE.InstancedBufferGeometry();
    // Um triângulo vazado por fragmento; tamanhos diferentes são atributos, não meshes extras.
    geo.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.3,0,.5,-.3,0,0,.56,0],3));
    geo.setAttribute('aBary',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1],3));
    const origem=[],destino=[],seed=[],cores=[];const pal=[0xff8a3d,0xffe0b8,0xff9a4d,0x7bf0b4,0xffc247,0xff4d5e];
    let rndSeed=19;const rnd=()=>{rndSeed=(rndSeed*1664525+1013904223)>>>0;return rndSeed/4294967296;};
    for(let i=0;i<n;i++){const z=rnd()*2-1,a=rnd()*Math.PI*2,r=5.5+ rnd()*.7,k=Math.sqrt(1-z*z);
      origem.push(Math.cos(a)*k*r,z*r,Math.sin(a)*k*r);
      destino.push((rnd()-.5)*42,(rnd()-.5)*30,25+rnd()*90);seed.push(rnd(),rnd()<.025?1+rnd():.06+rnd()*.19);
      const c=new THREE.Color(pal[rnd()<.96?Math.floor(rnd()*3):3+Math.floor(rnd()*3)]);cores.push(c.r,c.g,c.b);
    }
    for(const [name,array,size]of[['aOrigin',origem,3],['aTarget',destino,3],['aSeed',seed,2],['aColor',cores,3]])geo.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(array),size));
    geo.instanceCount=n;
    const uniforms={uTime:{value:0},uProgress:{value:0},uVis:{value:1},uPointer:{value:new THREE.Vector3(1000,0,1000)}};
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,extensions:{derivatives:true},uniforms,
      vertexShader:campo+`attribute vec3 aOrigin,aTarget,aColor,aBary;attribute vec2 aSeed;uniform float uTime,uProgress;uniform vec3 uPointer;varying vec3 vB,vC;varying float vFade;
      void main(){float m=smoothstep(.16,.43,uProgress)*(1.-smoothstep(.85,1.,uProgress));vec3 p=mix(aOrigin,aTarget,m);p+=curl(p*.3+uTime*.13)*(.12+m*.6);vec3 d=p-uPointer;p+=normalize(d+vec3(.001))*exp(-dot(d,d)*.08)*.6;vec4 mv=modelViewMatrix*vec4(p,1.);float nearFade=smoothstep(.3,4.,-mv.z);vFade=nearFade*(1.-m*.35);mv.xy+=position.xy*aSeed.y;vB=aBary;vC=aColor;gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform float uVis;varying vec3 vB,vC;varying float vFade;void main(){float edge=min(vB.x,min(vB.y,vB.z));float width=max(fwidth(edge)*1.4,.018);float line=1.-smoothstep(.02,.02+width,edge);gl_FragColor=vec4(vC,line*vFade*uVis*.65);}`});
    const pontos=new THREE.Mesh(geo,mat);pontos.frustumCulled=false;scene.add(pontos);
    return{pontos,progresso:p=>uniforms.uProgress.value=p,quadro:(t)=>uniforms.uTime.value=t,perto:(x,z)=>uniforms.uPointer.value.set(x,0,z),longe:()=>uniforms.uPointer.value.set(1000,0,1000),intensidade:v=>uniforms.uVis.value=v,
      qualidade:q=>geo.instanceCount=LandingMovimento.quantidade(n,q),destruir(){scene.remove(pontos);geo.dispose();mat.dispose();}};
  }
  window.LandingParticulas={montar};
})();
