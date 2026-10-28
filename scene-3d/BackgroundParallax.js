import * as THREE from 'three';
import {TOKENS} from './DesignTokens.js';
import simplex from './shaders/simplex3d.glsl';
import vertex from './shaders/entity.vert.glsl';

const planetFragment=`
uniform float u_time; uniform float uVisibility; uniform vec3 uColor; uniform vec3 uShade;
varying vec3 vLocal; varying vec3 vNormal;
void main(){
 float cloud=snoise(vLocal*2.0+u_time*.01);
 float bands=.5+.5*sin(vLocal.y*7.0+cloud*1.5);
 float light=.18+.6*max(dot(normalize(vNormal),normalize(vec3(-.5,.6,1.0))),0.0);
 gl_FragColor=vec4(mix(uShade,uColor,.35+bands*.3)*light*.65,.55*uVisibility);
}`;
const ringVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const ringFragment=`uniform float uVisibility;uniform vec3 uColor;varying vec2 vUv;void main(){float edge=pow(abs(sin(vUv.y*6.283185)),.6);gl_FragColor=vec4(uColor,edge*.2*uVisibility);}`;

export function createBackgroundParallax(scene) {
  const root=new THREE.Group();
  root.userData.kind='BackgroundParallax';
  scene.add(root);
  const sphere=new THREE.SphereGeometry(1,24,16);
  const torus=new THREE.TorusGeometry(1.55,.26,8,80);
  const colors=[TOKENS.palette.planetCold,TOKENS.palette.planetWarm,TOKENS.palette.planetNeutral];
  const positions=[[-13,12,-24],[24,8,-32],[-10,-11,-26],[19,-10,-28],[0,13,-38]];
  const materials=[];
  const planets=positions.map((position,i)=>{
    const group=new THREE.Group();
    const base=new THREE.Vector3(...position);
    group.position.copy(base);group.scale.setScalar(1.1+i*.15);
    group.userData.kind='BackgroundPlanet';
    const visibility={value:1};
    const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:simplex+planetFragment,transparent:true,depthWrite:false,uniforms:{uVisibility:visibility,u_time:{value:0},uColor:{value:new THREE.Color(colors[i%colors.length])},uShade:{value:new THREE.Color(TOKENS.palette.surface)}}});
    materials.push(material);
    group.add(new THREE.Mesh(sphere,material));
    if(i===0||i===3){
      const ringMaterial=new THREE.ShaderMaterial({vertexShader:ringVertex,fragmentShader:ringFragment,uniforms:{uVisibility:visibility,uColor:{value:new THREE.Color(colors[i%colors.length])}},transparent:true,depthWrite:false,side:THREE.DoubleSide});
      materials.push(ringMaterial);
      const ring=new THREE.Mesh(torus,ringMaterial);
      ring.scale.z=.12;ring.rotation.set(.85,.15,.25+i*.2);group.add(ring);
    }
    root.add(group);
    return {group,base,material,visibility,depth:12/Math.abs(base.z)};
  });
  return {
    root,planets,
    update(time,scroll,pointer){
      planets.forEach((p,i)=>{
        p.group.position.set(p.base.x*(innerWidth<=700?.38:1)+pointer.x*p.depth,p.base.y-scroll*p.depth*5+pointer.y*p.depth,p.base.z);
        p.group.rotation.y=time*.018+scroll*p.depth*.35;
        p.group.rotation.z=Math.sin(time*.035+i)*.045;
        p.material.uniforms.u_time.value=time;
      });
    },
    protectReading(camera,rects,bounds){
      for(const p of planets){
        const center=p.group.position.clone().project(camera);
        const edge=p.group.position.clone();edge.x+=p.group.scale.x*(p.group.children.length>1?1.9:1);edge.project(camera);
        const x=(center.x*.5+.5)*innerWidth,y=(.5-center.y*.5)*innerHeight,r=Math.abs(edge.x-center.x)*innerWidth*.5;
        let visibility=1;
        for(const b of bounds)visibility=Math.min(visibility,Math.max(0,Math.min(1,(Math.hypot(x-b.cx,y-b.cy)-r-b.radius-14)/45)));
        for(const box of rects){const gap=Math.hypot(Math.max(box.left-x,0,x-box.right),Math.max(box.top-y,0,y-box.bottom))-r;visibility=Math.min(visibility,Math.max(0,Math.min(1,gap/45)));}
        p.visibility.value=visibility;
      }
    },
    dispose(){root.removeFromParent();sphere.dispose();torus.dispose();materials.forEach(m=>m.dispose());root.clear();}
  };
}
