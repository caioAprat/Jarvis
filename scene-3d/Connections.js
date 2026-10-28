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

/** Feixes independentes dos projetos: órbitas curvas que mergulham no núcleo. */
export function createConnections(hero,parent,texture) {
  const root=new THREE.Group();parent.add(root);
  const random=seededRandom(917),veins=[],packets=[];
  for(let index=0;index<TOKENS.traffic.streams;index++){
    const angle=index*Math.PI*2/TOKENS.traffic.streams,reach=2.4+random()*1.1;
    const point=(a,r,z)=>new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*.65,z);
    const curve=new THREE.CatmullRomCurve3([
      point(angle,reach,-.5),point(angle+.7,reach*.96,.2),
      point(angle+1.5,reach*.72,1.3),point(angle+2.1,.32,1.0)
    ],false,'centripetal');
    const radius=.012+random()*.014;
    const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{u_time:{value:0},uStartDelta:{value:new THREE.Vector3()},uEndDelta:{value:new THREE.Vector3()},uSeed:{value:random()*10},uStrength:{value:.65},uSpeed:{value:5+random()*3},uEnergy:{value:new THREE.Color(TOKENS.palette.energy)},uElectric:{value:new THREE.Color(TOKENS.palette.electric)}}});
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,48,radius,5,false),material);mesh.frustumCulled=false;root.add(mesh);
    const vein={curve,mesh,index,radius};veins.push(vein);
    for(let copy=0;copy<TOKENS.traffic.perStream;copy++)packets.push({vein,offset:(copy/TOKENS.traffic.perStream+index*.017)%1,position:new THREE.Vector3(),opacity:0});
  }
  const geometry=new THREE.PlaneGeometry(1,1);
  const alpha=new THREE.InstancedBufferAttribute(new Float32Array(packets.length),1);
  geometry.setAttribute('aOpacity',alpha);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uMap:{value:texture},uEnergy:{value:new THREE.Color(TOKENS.palette.electric)}},
    vertexShader:`attribute float aOpacity;varying vec2 vUv;varying float vOpacity;void main(){vUv=uv;vOpacity=aOpacity;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D uMap;uniform vec3 uEnergy;varying vec2 vUv;varying float vOpacity;void main(){float a=texture2D(uMap,vUv).a*vOpacity;if(a<.04)discard;gl_FragColor=vec4(uEnergy*1.5,a);}`
  });
  const instances=new THREE.InstancedMesh(geometry,material,packets.length);
  instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);instances.frustumCulled=false;root.add(instances);
  // Quatro pontos por documento formam caudas luminosas em uma única chamada.
  const tailPositions=new Float32Array(packets.length*4*3),tailGeometry=new THREE.BufferGeometry();
  tailGeometry.setAttribute('position',new THREE.BufferAttribute(tailPositions,3).setUsage(THREE.DynamicDrawUsage));
  const tailMaterial=new THREE.PointsMaterial({color:TOKENS.palette.energy,size:.035,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending});
  const trails=new THREE.Points(tailGeometry,tailMaterial);trails.frustumCulled=false;root.add(trails);
  const dummy=new THREE.Object3D(),tail=new THREE.Vector3(),worldQuaternion=new THREE.Quaternion(),cameraQuaternion=new THREE.Quaternion(),projected=new THREE.Vector3();
  return {
    root,veins,packets,instances,
    update(time,progress,compact,camera,reserved){
      root.position.copy(hero.group.position);
      for(const vein of veins){const u=vein.mesh.material.uniforms;u.u_time.value=time;u.uStrength.value=.45+progress*.25;}
      parent.getWorldQuaternion(worldQuaternion).invert();camera.getWorldQuaternion(cameraQuaternion);dummy.quaternion.copy(worldQuaternion).multiply(cameraQuaternion);
      for(let i=0;i<packets.length;i++){
        const packet=packets[i],phase=(time/TOKENS.traffic.duration+packet.offset)%1,t=phase*phase*(3-2*phase);
        packet.vein.curve.getPointAt(t,packet.position);
        projected.copy(packet.position).add(root.position);parent.localToWorld(projected);projected.project(camera);
        const x=(projected.x*.5+.5)*innerWidth,y=(.5-projected.y*.5)*innerHeight;
        let opacity=Math.min(1,phase*14,(1-phase)*8);
        if(reserved.some(r=>x>r.left-12&&x<r.right+12&&y>r.top-12&&y<r.bottom+12))opacity=0;
        packet.opacity=opacity;
        dummy.position.copy(packet.position);dummy.scale.setScalar(TOKENS.traffic.size*(compact?1.2:1));dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);alpha.setX(i,opacity);
        for(let j=0;j<4;j++){
          packet.vein.curve.getPointAt(Math.max(0,t-j*.008),tail);
          if(opacity<.05)tail.set(0,0,-1000);
          tail.toArray(tailPositions,(i*4+j)*3);
        }
      }
      instances.instanceMatrix.needsUpdate=true;alpha.needsUpdate=true;tailGeometry.attributes.position.needsUpdate=true;
    },
    dispose(){root.removeFromParent();veins.forEach(v=>{v.mesh.geometry.dispose();v.mesh.material.dispose();});instances.dispose();geometry.dispose();material.dispose();tailGeometry.dispose();tailMaterial.dispose();root.clear();}
  };
}
