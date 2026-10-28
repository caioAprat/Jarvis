import * as THREE from 'three';
import filePdf from 'lucide-static/icons/file-type.svg';
import fileDoc from 'lucide-static/icons/file-text.svg';
import fileCode from 'lucide-static/icons/file-code-2.svg';
import database from 'lucide-static/icons/database.svg';
import {veinVertex,veinFragment} from './shaders.js';
import {colors,random,disposeObject} from './world.js';
export async function createFileTextures(){
 return Promise.all([[filePdf,'PDF'],[fileDoc,'DOC'],[fileCode,'CODE'],[database,'DB']].map(async([source,label])=>{
  const body=source.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="154" viewBox="0 0 128 154"><rect x="4" y="4" width="120" height="146" rx="17" fill="#111b20" fill-opacity=".94" stroke="#bdcaca" stroke-opacity=".35" stroke-width="3"/><g transform="translate(24 15) scale(3.33)" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</g><text x="64" y="132" text-anchor="middle" font-family="Arial,sans-serif" font-size="23" font-weight="700" fill="white">${label}</text></svg>`;
  const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Falha ao preparar ícone '+label));image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});
  const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.userData.label=label;return texture;
 }));
}
export function createVeins(planets,parent,textures){
 const container=new THREE.Group();parent.add(container);const veins=[],packets=[],rng=random(917);
 planets.forEach((planet,index)=>{
  const end=planet.home,count=3+index%3;
  for(let branch=0;branch<count;branch++){
   const fan=(branch-(count-1)/2)*.24;
   const points=[new THREE.Vector3(),end.clone().multiplyScalar(.32).add(new THREE.Vector3(-end.y*.13+fan,end.x*.1,fan+.4)),end.clone().multiplyScalar(.7).add(new THREE.Vector3(end.y*.1+fan,-end.x*.12,fan-.4)),end.clone()];
   const curve=new THREE.CatmullRomCurve3(points,false,'centripetal'),radius=.008+rng()*.012;
   const material=new THREE.ShaderMaterial({vertexShader:veinVertex,fragmentShader:veinFragment,transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uDelta:{value:new THREE.Vector3()},uSeed:{value:rng()*10},uStrength:{value:.6},uColor:{value:new THREE.Color(colors[planet.project.status]||0xaccac4)},uSpeed:{value:planet.project.status==='pausado'?0:2+rng()*3}}});
   const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,48,radius,5,false),material);mesh.frustumCulled=false;container.add(mesh);
   const vein={curve,mesh,planet,index,branch};veins.push(vein);
   if(branch<2&&planet.project.status!=='pausado'){
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:textures[(index+branch)%4],transparent:true,depthTest:true,depthWrite:false,toneMapped:false}));sprite.scale.set(.3,.36,1);container.add(sprite);
    packets.push({sprite,vein,offset:rng(),reverse:branch%2===1,duration:5+rng()*3});
   }
  }
 });
 const temp=new THREE.Vector3(),delta=new THREE.Vector3();
 return {container,veins,packets,update(time,focus,progress,compact){
  veins.forEach(v=>{const u=v.mesh.material.uniforms;u.uTime.value=time;u.uDelta.value.copy(v.planet.group.position).sub(v.planet.home);u.uStrength.value=v.planet.project.status==='pausado'?.12:focus===v.index?1:focus>=0?.24:.55;});
  packets.forEach(p=>{
   const phase=(time/p.duration+p.offset)%1,eased=.5-.5*Math.cos(phase*Math.PI),t=p.reverse?1-eased:eased;
   // Mesma curva e mesmo deslocamento utilizados pela TubeGeometry no vertex shader.
   temp.copy(p.vein.curve.getPointAt(t));delta.copy(p.vein.planet.group.position).sub(p.vein.planet.home);temp.addScaledVector(delta,t*t);p.sprite.position.copy(temp);
   const active=focus===p.vein.index,edge=Math.min(1,phase*10,(1-phase)*10);
   p.sprite.visible=!(compact&&focus>=0&&!active);p.sprite.material.opacity=edge*(active?1:focus>=0?.35:.85);
   const size=(compact?.46:.4)*(active?1.2:1);p.sprite.scale.set(size,size*1.2,1);
  });
 },dispose(){parent.remove(container);disposeObject(container);}};
}
