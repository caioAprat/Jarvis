'use strict';
(function(){
  function montar(mapa,proto,{leve=false}={}){
    const dep=mapa.depurar(),scene=dep.scene,E=proto.E,root=new THREE.Group();scene.add(root);
    const light=new THREE.DirectionalLight(0xffe0b8,1.8);light.position.set(8,14,12);root.add(light);
    root.add(new THREE.AmbientLight(0xb09c86,.8));
    const uniforms={time:{value:0},reveal:{value:1}},cables=[],curves=[];
    const count=leve?5:8,samples=64,data=new Float32Array(samples*count*4);
    const color=[0x7bf0b4,0xffc247,0xff4d5e,0xff9a4d];
    for(let i=0;i<count;i++){
      const side=i%2?1:-1,y=-2.6*E+i*.32*E;
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*13*E,y,-5*E),new THREE.Vector3(side*8*E,y+.4*E,2*E),new THREE.Vector3(side*4*E,y-1*E,3*E),new THREE.Vector3(side*1.8*E,-2*E,i*.35*E)],false,'centripetal');curves.push(curve);
      const radius=(.08+i%3*.025)*E;
      const mat=new THREE.MeshStandardMaterial({color:0x716c66,metalness:.45,roughness:.48});
      mat.onBeforeCompile=shader=>{shader.uniforms.uReveal=uniforms.reveal;shader.vertexShader='varying vec2 cableUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncableUv=uv;');
        shader.fragmentShader='varying vec2 cableUv;uniform float uReveal;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(cableUv.x>uReveal)discard;float dash=step(.32,fract(cableUv.x*28.))*step(.72,sin(cableUv.y*6.283));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.82,.78,.69),dash*.75);');};
      const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,80,radius,8,false),mat);root.add(mesh);cables.push(mesh);
      const end=curve.getPoint(0);
      color.forEach((c,j)=>{const a=end.clone().add(new THREE.Vector3(-side*(j*.12+.5)*E,(j-1.5)*.22*E,0)),b=a.clone().add(new THREE.Vector3(-side*.7*E,(j-1.5)*.3*E,.2*E));
        const strand=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([end,a,b]),16,.022*E,5,false),new THREE.MeshStandardMaterial({color:c,roughness:.6,metalness:.2}));root.add(strand);});
      for(let j=0;j<samples;j++){const p=curve.getPointAt(j/(samples-1));data.set([p.x,p.y,p.z,1],(i*samples+j)*4);}
    }
    const tex=new THREE.DataTexture(data,samples,count,THREE.RGBAFormat,THREE.FloatType);tex.needsUpdate=true;tex.minFilter=tex.magFilter=THREE.NearestFilter;
    const n=leve?2400:6400,geo=new THREE.BufferGeometry(),seeds=new Float32Array(n*3),pos=new Float32Array(n*3);
    for(let i=0;i<n;i++)seeds.set([i%count,Math.random(),Math.random()],i*3);
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aSeed',new THREE.BufferAttribute(seeds,3));
    const u={uTime:{value:0},uCurves:{value:tex},uCount:{value:count},uIntensity:{value:1},uProgress:{value:0}};
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:u,
      vertexShader:`attribute vec3 aSeed;uniform sampler2D uCurves;uniform float uCount,uTime,uProgress;varying vec3 vColor;varying float vAlpha;void main(){float t=fract(aSeed.y+uTime*.045);float j=t*63.;vec2 uv=vec2((floor(j)+.5)/64.,(aSeed.x+.5)/uCount);vec3 a=texture2D(uCurves,uv).xyz;vec3 b=texture2D(uCurves,uv+vec2(1./64.,0)).xyz;vec3 p=mix(a,b,fract(j));float angle=aSeed.z*6.283+uTime*.3;float loose=pow(.5+.5*sin(uTime*.4+aSeed.y*25.),12.);float r=.3+aSeed.z*.5+loose*1.2;p.yz+=vec2(cos(angle),sin(angle))*r;p.z+=uProgress*loose;vColor=mix(vec3(1.,.54,.24),vec3(1.,.88,.72),aSeed.y);if(aSeed.z>.985)vColor=vec3(.48,.94,.70);else if(aSeed.z>.97)vColor=vec3(1.,.76,.28);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((.7+aSeed.z*1.5)*100./max(1.,-mv.z),1.,4.);vAlpha=smoothstep(0.,.1,t)*smoothstep(1.,.9,t);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying vec3 vColor;varying float vAlpha;uniform float uIntensity;void main(){float d=length(gl_PointCoord-.5);float a=1.-smoothstep(.05,.5,d);gl_FragColor=vec4(vColor,a*vAlpha*uIntensity*.7);}`});
    const points=new THREE.Points(geo,mat);points.frustumCulled=false;root.add(points);
    const pointer=new THREE.Vector2(),current=new THREE.Vector2();let progress=0;
    return{mostrar:v=>root.visible=v,acenderChao:v=>uniforms.reveal.value=Math.max(.1,v),acenderEsticados(){},pacotes:v=>u.uIntensity.value=v,status(){},refazer(){},progresso:p=>progress=p,ponteiro:(x,y)=>pointer.set(x,y),
      quadro(t,dt){current.lerp(pointer,1-Math.exp(-dt*3));root.rotation.y=current.x*.018+Math.sin(t*.3)*.006;root.rotation.z=current.y*.009;u.uTime.value=t;u.uProgress.value=progress;},
      qualidade:q=>geo.setDrawRange(0,Math.floor(n/(1+q))),destruir(){root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});tex.dispose();scene.remove(root);}};
  }
  window.Fios={montar};
})();
