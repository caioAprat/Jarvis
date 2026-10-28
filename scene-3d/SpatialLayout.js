import * as THREE from 'three';

// Projeção conservadora do núcleo para proteger a área de leitura.
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
