import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {TOKENS} from './DesignTokens.js';

export function createSceneSetup() {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  renderer.info.autoReset=false;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,120);
  camera.position.z=18;
  const world=new THREE.Group();
  scene.add(world);
  const composer=new EffectComposer(renderer);
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),TOKENS.bloom.strength,TOKENS.bloom.radius,TOKENS.bloom.threshold);
  composer.addPass(new RenderPass(scene,camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    renderer,scene,camera,world,composer,bloom,
    resize(quality=1) {
      const w=innerWidth,h=innerHeight;
      const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt((quality<1?650000:1100000)/(w*h)));
      camera.aspect=w/h;camera.updateProjectionMatrix();
      renderer.setPixelRatio(ratio);renderer.setSize(w,h);
      composer.setPixelRatio(ratio);composer.setSize(w,h);
      bloom.setSize(w*ratio*.5,h*ratio*.5);
    },
    render() {renderer.info.reset();composer.render();},
    dispose() {composer.passes.forEach(p=>p.dispose?.());composer.dispose();renderer.dispose();}
  };
}
