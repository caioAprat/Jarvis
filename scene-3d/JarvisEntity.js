import * as THREE from 'three';
import {TOKENS} from './DesignTokens.js';
import simplex from './shaders/simplex3d.glsl';
import vertex from './shaders/entity.vert.glsl';
import energy from './shaders/energy.frag.glsl';
import earth from './shaders/earth.frag.glsl';

/** Geometrias, fotografia e materiais têm um único proprietário. */
export async function createEntityResources() {
  const texture=await new THREE.TextureLoader().loadAsync(TOKENS.textures.earth);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  const uniforms={
    u_time:{value:0},uEarth:{value:texture},uOpening:{value:0},
    uEnergy:{value:new THREE.Color(TOKENS.palette.energy)},
    uElectric:{value:new THREE.Color(TOKENS.palette.electric)},
    uNeon:{value:new THREE.Color(TOKENS.palette.neon)}
  };
  const geometries={hero:new THREE.SphereGeometry(1,48,32),mini:new THREE.SphereGeometry(1,24,16)};
  const materials={
    energy:new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:simplex+energy,uniforms}),
    earth:new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:simplex+earth,uniforms})
  };
  return {
    texture,uniforms,geometries,materials,
    update(time,opening){uniforms.u_time.value=time;uniforms.uOpening.value=opening;},
    dispose(){Object.values(geometries).forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());texture.dispose();}
  };
}

/** Hero e projetos são instâncias desta EXATA classe, com duas malhas cada. */
export class JarvisEntity {
  constructor(resources,{radius=TOKENS.layout.heroRadius,seed=0,hero=false}={}) {
    this.group=new THREE.Group();
    this.group.userData.kind='JarvisEntity';
    this.radius=radius;
    this.seed=seed;
    this.hero=hero;
    const geometry=resources.geometries[hero?'hero':'mini'];
    this.energy=new THREE.Mesh(geometry,resources.materials.energy);
    this.energy.scale.setScalar(.88);
    this.shell=new THREE.Mesh(geometry,resources.materials.earth);
    this.group.add(this.energy,this.shell);
    this.group.scale.setScalar(radius);
    this.bounds=new THREE.Sphere(new THREE.Vector3(),radius*1.04);
  }

  update(time,motion,emphasis=0) {
    const scale=this.hero?motion.heroScale:1+emphasis*.18;
    this.group.scale.setScalar(this.radius*scale);
    this.shell.rotation.set(Math.sin(time*.1+this.seed)*.09,time*.035+this.seed*.7+(this.hero?motion.heroYaw:0),.08);
    this.energy.rotation.set(time*.025,-time*.04+this.seed,0);
    this.bounds.center.copy(this.group.position);
    this.bounds.radius=this.radius*scale*1.04;
  }

  dispose() {
    // NÃO dar dispose nos recursos compartilhados por outras entidades.
    this.group.removeFromParent();
    this.group.clear();
  }
}
