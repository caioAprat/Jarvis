import * as THREE from 'three';
import {TOKENS} from './DesignTokens.js';
import simplex from './shaders/simplex3d.glsl';
export function seededRandom(seed=2718){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

export function createParticles(scene,world,compact) {
  const random=seededRandom(),layers=[];
  const pixels=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const offset=(y*32+x)*4,distance=Math.hypot(x-15.5,y-15.5)/16;
    pixels[offset]=pixels[offset+1]=pixels[offset+2]=255;pixels[offset+3]=Math.max(0,1-distance)**2*255;
  }
  const dot=new THREE.DataTexture(pixels,32,32);dot.needsUpdate=true;
  for(let depth=0;depth<3;depth++){
    const count=compact?420:1100,positions=new Float32Array(count*3);
    for(let i=0;i<count;i++)positions.set([(random()-.5)*80,(random()-.5)*55,-10-random()*45-depth*5],i*3);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const material=new THREE.PointsMaterial({map:dot,color:TOKENS.palette.muted,size:.055+depth*.025,transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending});
    const points=new THREE.Points(geometry,material);scene.add(points);layers.push(points);
  }
  const count=compact?200:600,positions=new Float32Array(count*3);
  for(let i=0;i<count;i++)positions.set([(random()-.5)*10,(random()-.5)*7,(random()-.5)*4],i*3);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{u_time:{value:0},uProgress:{value:0},uPointer:{value:new THREE.Vector2()},uColor:{value:new THREE.Color(TOKENS.palette.energy)},uTargets:{value:Array.from({length:16},()=>new THREE.Vector3())},uCount:{value:0},uPixelRatio:{value:1}},
    vertexShader:simplex+`
      uniform float u_time,uProgress,uPixelRatio;uniform vec2 uPointer;uniform vec3 uTargets[16];uniform int uCount;varying float vAlpha;
      void main(){vec3 p=position;vec3 field=vec3(snoise(p*.4+u_time*.07),snoise(p.yzx*.4-u_time*.05),snoise(p.zxy*.4+u_time*.04));p+=field*.3;p.xy+=uPointer*.1;p.y+=sin(uProgress*6.28+p.x)*.15;
      for(int i=0;i<16;i++){if(i>=uCount)break;vec3 e=uTargets[i];float t=clamp(dot(p,e)/max(dot(e,e),.01),.2,1.0);vec3 d=e*t-p;p+=d*exp(-dot(d,d)*2.0)*.15;}
      vAlpha=.2+.3*(.5+.5*sin(p.x+u_time*.4));vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(18.0*uPixelRatio/-mv.z,1.0,3.0);}`,
    fragmentShader:`uniform vec3 uColor;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(uColor,(1.0-smoothstep(.04,.5,r))*vAlpha);}`
  });
  const field=new THREE.Points(geometry,material);world.add(field);
  return {
    layers,
    update(time,progress,pointer,nodes,ratio){
      layers.forEach((layer,i)=>{const d=(i+1)*.22;layer.position.set(pointer.x*d, pointer.y*d-progress*d*2,0);layer.rotation.z=time*.001+progress*d*.02;});
      const u=material.uniforms;u.u_time.value=time;u.uProgress.value=progress;u.uPointer.value.copy(pointer);u.uPixelRatio.value=ratio;u.uCount.value=Math.min(16,nodes.length);
      nodes.slice(0,16).forEach((node,i)=>u.uTargets.value[i].copy(node.group.position));
    },
    dispose(){layers.forEach(p=>{p.removeFromParent();p.geometry.dispose();p.material.dispose();});field.removeFromParent();geometry.dispose();material.dispose();dot.dispose();}
  };
}
