import * as THREE from 'three';
import documentSVG from 'lucide-static/icons/file-text.svg';
import {TOKENS} from './DesignTokens.js';
import {seededRandom} from './Particles.js';
import vertex from './shaders/vein.vert.glsl';
import fragment from './shaders/vein.frag.glsl';

export async function createDocumentTexture() {
  const body=documentSVG.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 28 28"><g transform="translate(2 2)" fill="none" stroke="${TOKENS.palette.document}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Ícone de documento indisponível'));image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});
  const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
  return texture;
}

export function createConnections(hero,nodes,parent,texture) {
  const root=new THREE.Group();parent.add(root);
  const random=seededRandom(917),veins=[],packets=[];
  const direction=new THREE.Vector3();
  nodes.forEach((node,index)=>{
    direction.copy(node.home).sub(hero.group.position).normalize();
    const start=hero.group.position.clone().addScaledVector(direction,hero.radius*1.02);
    const end=node.home.clone().addScaledVector(direction,-node.entity.radius*1.02);
    for(let branch=0;branch<3+index%3;branch++){
      const fan=(branch-1)*.075+(random()-.5)*.07;
      const middle=start.clone().lerp(end,.5).add(new THREE.Vector3(-direction.y*.25+fan,direction.x*.25,fan));
      const curve=new THREE.CatmullRomCurve3([start,start.clone().lerp(middle,.6),middle,end],false,'centripetal');
      const radius=.006+random()*.008;
      const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,uniforms:{u_time:{value:0},uStartDelta:{value:new THREE.Vector3()},uEndDelta:{value:new THREE.Vector3()},uSeed:{value:random()*10},uStrength:{value:.6},uSpeed:{value:node.project.status==='pausado'?0:2+random()*2},uEnergy:{value:new THREE.Color(TOKENS.palette.energy)},uElectric:{value:new THREE.Color(TOKENS.palette.electric)}}});
      const geometry=new THREE.TubeGeometry(curve,32,radius,5,false);
      geometry.computeBoundingBox();
      const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;root.add(mesh);
      const vein={curve,mesh,node,index,start,end,radius,bounds:geometry.boundingBox.clone()};veins.push(vein);
      if(branch<2&&node.project.status!=='pausado'){
        // Antes: dois sprites/projeto. Agora: quatro instâncias/projeto.
        for(let copy=0;copy<2;copy++)packets.push({vein,offset:(copy*.5+branch*.21+index*.13)%1,reverse:branch===1,position:new THREE.Vector3(),opacity:0});
      }
    }
  });
  const geometry=new THREE.PlaneGeometry(1,1);
  const alpha=new THREE.InstancedBufferAttribute(new Float32Array(packets.length),1);
  const glow=new THREE.InstancedBufferAttribute(new Float32Array(packets.length),1);
  geometry.setAttribute('aOpacity',alpha);geometry.setAttribute('aGlow',glow);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uMap:{value:texture},uEnergy:{value:new THREE.Color(TOKENS.palette.energy)}},
    vertexShader:`attribute float aOpacity;attribute float aGlow;varying vec2 vUv;varying float vOpacity;varying float vGlow;void main(){vUv=uv;vOpacity=aOpacity;vGlow=aGlow;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D uMap;uniform vec3 uEnergy;varying vec2 vUv;varying float vOpacity;varying float vGlow;void main(){vec4 icon=texture2D(uMap,vUv);float alpha=icon.a*vOpacity;if(alpha<.04)discard;gl_FragColor=vec4(mix(icon.rgb,uEnergy,.12)*(.92+vGlow*.3),alpha);}`
  });
  const instances=new THREE.InstancedMesh(geometry,material,packets.length);
  instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);instances.frustumCulled=false;root.add(instances);
  const dummy=new THREE.Object3D(),delta=new THREE.Vector3(),startPoint=new THREE.Vector3(),endPoint=new THREE.Vector3();
  const worldQuaternion=new THREE.Quaternion(),cameraQuaternion=new THREE.Quaternion(),projected=new THREE.Vector3();
  const occupied=Array.from({length:packets.length},()=>new THREE.Vector2());
  const order=packets.map((_,i)=>i);
  let lastFocus=null;

  return {
    root,veins,packets,instances,
    update(time,focus,compact,camera,reserved){
      for(const vein of veins){
        const u=vein.mesh.material.uniforms;
        direction.copy(vein.node.group.position).sub(hero.group.position).normalize();
        startPoint.copy(hero.group.position).addScaledVector(direction,hero.bounds.radius);
        endPoint.copy(vein.node.group.position).addScaledVector(direction,-vein.node.entity.bounds.radius);
        u.uStartDelta.value.copy(startPoint).sub(vein.start);u.uEndDelta.value.copy(endPoint).sub(vein.end);
        u.u_time.value=time;u.uStrength.value=vein.node.project.status==='pausado'?.12:focus===vein.index?.9:focus>=0?.3:.52;
      }
      parent.getWorldQuaternion(worldQuaternion).invert();camera.getWorldQuaternion(cameraQuaternion);
      dummy.quaternion.copy(worldQuaternion).multiply(cameraQuaternion);
      let occupiedCount=0;
      // Reordena somente quando muda o capítulo; sem novas listas por frame.
      if(lastFocus!==focus){order.sort((a,b)=>Number(packets[b].vein.index===focus)-Number(packets[a].vein.index===focus));lastFocus=focus;}
      for(const i of order){
        const packet=packets[i],u=packet.vein.mesh.material.uniforms;
        const phase=(time/TOKENS.traffic.duration+packet.offset)%1,eased=.5-.5*Math.cos(phase*Math.PI),t=packet.reverse?1-eased:eased;
        packet.vein.curve.getPointAt(t,packet.position);
        delta.copy(u.uStartDelta.value).lerp(u.uEndDelta.value,t);packet.position.add(delta);
        projected.copy(packet.position);parent.localToWorld(projected);projected.project(camera);
        const x=(projected.x*.5+.5)*innerWidth,y=(.5-projected.y*.5)*innerHeight;
        const active=packet.vein.index===focus;
        let opacity=Math.min(1,phase*10,(1-phase)*10)*(active||focus<0?1:.45);
        let overlaps=false;
        for(let j=0;j<occupiedCount;j++)if(Math.abs(occupied[j].x-x)<16&&Math.abs(occupied[j].y-y)<19){overlaps=true;break;}
        if(reserved.some(r=>x>r.left-10&&x<r.right+10&&y>r.top-12&&y<r.bottom+12)||overlaps)opacity=0;
        if(opacity>.05)occupied[occupiedCount++].set(x,y);
        packet.opacity=opacity;
        dummy.position.copy(packet.position);dummy.scale.setScalar(TOKENS.traffic.size*(compact?1.25:1)*(active?1.12:1));dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);
        alpha.setX(i,opacity);glow.setX(i,.5+.5*Math.sin(time*2-t*12));
      }
      instances.instanceMatrix.needsUpdate=true;alpha.needsUpdate=true;glow.needsUpdate=true;
    },
    dispose(){root.removeFromParent();veins.forEach(v=>{v.mesh.geometry.dispose();v.mesh.material.dispose();});instances.dispose();geometry.dispose();material.dispose();root.clear();}
  };
}
