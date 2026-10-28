import * as THREE from 'three';
import {sphereVertex,coreFragment,crustFragment,planetFragment,particlesVertex,particlesFragment} from './shaders.js';
export const colors={ok:0x82dabe,atencao:0xffc278,erro:0xff6a86,aguardando:0xd9a873,config:0xa59ac9,pausado:0x827c79};
export const names={ok:'No ar',atencao:'Atenção',erro:'Problema',aguardando:'Aguardando',config:'Configurar',pausado:'Pausado'};
export function random(seed=12345){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function shader(fragment,color=0x64412a,seed=0,roughness=.08){return new THREE.ShaderMaterial({vertexShader:sphereVertex,fragmentShader:fragment,uniforms:{uTime:{value:0},uColor:{value:new THREE.Color(color)},uSeed:{value:seed},uRoughness:{value:roughness}}});}
export function createCore(){
 const group=new THREE.Group(),materials=[];
 const energy=new THREE.Mesh(new THREE.SphereGeometry(1.36,48,32),shader(coreFragment,0xffa849,0,.035));
 const crust=new THREE.Mesh(new THREE.SphereGeometry(1.62,64,48),shader(crustFragment,0x766153,0,.15));
 const fragments=new THREE.Mesh(new THREE.SphereGeometry(1.73,48,32),shader(crustFragment,0x343938,4.2,.12));
 fragments.scale.set(1.02,.96,1);fragments.rotation.z=.32;
 group.add(energy,crust,fragments);materials.push(energy.material,crust.material,fragments.material);
 // Anéis finos dão escala sem cobrir a crosta.
 for(let i=0;i<2;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(2.0+i*.18,2.008+i*.18,160),new THREE.MeshBasicMaterial({color:0xd8a66e,transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=1.08+i*.13;ring.rotation.y=i*.25;group.add(ring);}
 return {group,update(t){materials.forEach(m=>m.uniforms.uTime.value=t);energy.rotation.set(Math.sin(t*.11)*.14,t*.065,0);crust.rotation.set(t*.024,t*.043,Math.sin(t*.09)*.08);fragments.rotation.set(-t*.018,-t*.03,.32);energy.scale.setScalar(1+Math.sin(t*1.6)*.025);},materials};
}
export function createPlanets(projects,parent){
 const palette=[0x5aafa7,0xb7a8d0,0xc68d60,0x75a1be,0xa4b989,0xb76c68,0xbbb39c];
 return projects.map((project,i)=>{
  const angle=-Math.PI/2+i*Math.PI*2/Math.max(1,projects.length),home=new THREE.Vector3(Math.cos(angle)*3.4,Math.sin(angle)*2.75,-.35+Math.sin(i*1.3)*.65);
  const group=new THREE.Group();group.position.copy(home);parent.add(group);
  const radius=.3+(i%3)*.065,material=shader(planetFragment,palette[i%palette.length],i*3.7,.035);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(radius,32,24),material);group.add(globe);
  const ring=new THREE.Mesh(new THREE.RingGeometry(radius*1.4,radius*2,80),new THREE.MeshBasicMaterial({color:palette[i%palette.length],transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.set(1.05,.25,i*.3);group.add(ring);
  const orbit=new THREE.Object3D(),moon=new THREE.Mesh(new THREE.SphereGeometry(radius*.19,12,8),new THREE.MeshBasicMaterial({color:palette[i%palette.length]}));moon.position.set(radius*2.4,0,.1);orbit.rotation.z=i*.7;orbit.add(moon);group.add(orbit);
  return {project,group,home,globe,ring,orbit,material,focus:0,update(t,focus,dt,compact){this.focus=THREE.MathUtils.damp(this.focus,focus?1:0,6,dt);const target=compact?new THREE.Vector3(-2.25,-1.35,.8):new THREE.Vector3(-2.9,-1.25,1.3);group.position.copy(home);if(compact)group.position.x*=.76;group.position.lerp(target,this.focus);group.position.y+=Math.sin(t*.28+i)*.035;group.scale.setScalar(1+this.focus*.6);material.uniforms.uTime.value=t;globe.rotation.y=t*(.08+i*.007);ring.rotation.z=i*.3+Math.sin(t*.15+i)*.12;orbit.rotation.y=t*.4+i;}};
 });
}
export function createUniverse(scene,world,compact){
 const rng=random(2718),layers=[];const dotData=new Uint8Array(32*32*4);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const a=(y*32+x)*4,d=Math.hypot(x-15.5,y-15.5)/16;dotData[a]=dotData[a+1]=dotData[a+2]=255;dotData[a+3]=Math.max(0,1-d)**2*255;}
 const dot=new THREE.DataTexture(dotData,32,32);dot.needsUpdate=true;
 for(let layer=0;layer<3;layer++){
  const count=compact?650:1800,positions=new Float32Array(count*3),colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){positions.set([(rng()-.5)*80,(rng()-.5)*55,-6-rng()*40-layer*10],i*3);colors.set([.65+rng()*.35,.55+rng()*.25,.4+rng()*.3],i*3);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const material=new THREE.PointsMaterial({map:dot,size:.055+layer*.025,vertexColors:true,transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending});const points=new THREE.Points(geometry,material);scene.add(points);layers.push(points);
 }
 const count=compact?350:1000,positions=new Float32Array(count*3);
 for(let i=0;i<count;i++)positions.set([(rng()-.5)*12,(rng()-.5)*8,(rng()-.5)*5],i*3);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const material=new THREE.ShaderMaterial({vertexShader:particlesVertex,fragmentShader:particlesFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uProgress:{value:0},uPointer:{value:new THREE.Vector2()},uPixelRatio:{value:1},uCount:{value:0},uTargets:{value:Array.from({length:16},()=>new THREE.Vector3())}}});
 const field=new THREE.Points(geometry,material);world.add(field);
 return {layers,field,dot,update(time,progress,pointer,planets,pixelRatio){layers.forEach((p,i)=>{const d=(i+1)*.22;p.position.set(pointer.x*d*1.2,pointer.y*d-progress*d*2,0);p.rotation.z=time*.001*(i+1)+progress*.025*d;});material.uniforms.uTime.value=time;material.uniforms.uProgress.value=progress;material.uniforms.uPointer.value.copy(pointer);material.uniforms.uPixelRatio.value=pixelRatio;material.uniforms.uCount.value=Math.min(16,planets.length);planets.slice(0,16).forEach((p,i)=>material.uniforms.uTargets.value[i].copy(p.group.position));}};
}
export function disposeObject(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.clear();}
