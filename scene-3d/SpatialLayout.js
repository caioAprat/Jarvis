import * as THREE from 'three';
import {TOKENS} from './DesignTokens.js';

/** Reservas conservadoras por BoundingSphere + auditoria em espaço de tela. */
export function resolveEntityLayout(hero,nodes,compact,focus,dt) {
  const clearance=TOKENS.layout.clearance;
  for (let i=0;i<nodes.length;i++) {
    const node=nodes[i];
    node.emphasis=THREE.MathUtils.damp(node.emphasis,focus===i?1:0,6,dt);
    node.entity.bounds.radius=node.entity.radius*(1+node.emphasis*.18)*1.04;
    node.group.position.copy(node.home);
    if(compact)node.group.position.x*=.76;
    node.target.set(compact?-2.3:-2.65,-1.3,.12);
    node.group.position.lerp(node.target,node.emphasis);
  }
  // Correções somente no plano de leitura: a profundidade não esconde colisões.
  for (let iteration=0;iteration<5;iteration++) {
    for (const node of nodes) {
      const dx=node.group.position.x-hero.group.position.x,dy=node.group.position.y-hero.group.position.y;
      const distance=Math.hypot(dx,dy),minimum=hero.bounds.radius+node.entity.bounds.radius+clearance;
      if(distance<minimum){const factor=(minimum-distance)/Math.max(distance,.001);node.group.position.x+=dx*factor;node.group.position.y+=dy*factor;}
    }
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j],dx=b.group.position.x-a.group.position.x,dy=b.group.position.y-a.group.position.y;
      const distance=Math.hypot(dx,dy),minimum=a.entity.bounds.radius+b.entity.bounds.radius+clearance;
      if(distance<minimum){const amount=(minimum-distance)*.5/Math.max(distance,.001);a.group.position.x-=dx*amount;a.group.position.y-=dy*amount;b.group.position.x+=dx*amount;b.group.position.y+=dy*amount;}
    }
  }
}

export function projectEntityBounds(entity,camera,width,height) {
  const position=entity.group.getWorldPosition(new THREE.Vector3());
  const scale=entity.group.getWorldScale(new THREE.Vector3()).x;
  const center=position.clone().project(camera);
  const edge=position.clone().add(new THREE.Vector3(scale*1.04,0,0)).project(camera);
  const radius=Math.abs(edge.x-center.x)*width*.5;
  const x=(center.x*.5+.5)*width,y=(.5-center.y*.5)*height;
  return {x:x-radius,y:y-radius,width:radius*2,height:radius*2,cx:x,cy:y,radius};
}

export function findEntityOverlaps(bounds) {
  const overlaps=[];
  for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){
    const a=bounds[i],b=bounds[j];
    if(Math.hypot(a.cx-b.cx,a.cy-b.cy)<a.radius+b.radius+2)overlaps.push([i,j]);
  }
  return overlaps;
}
