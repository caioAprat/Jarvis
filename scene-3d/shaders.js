// GLSL original. Perlin clássico de Stefan Gustavson / Ashima, licença MIT.
// Atribuição e referência em scene-3d/README.md; nenhum shader de usuário do ShaderToy copiado.
export const noise = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
vec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
float cnoise(vec3 P){
 vec3 Pi0=floor(P),Pi1=Pi0+vec3(1.0);Pi0=mod(Pi0,289.0);Pi1=mod(Pi1,289.0);
 vec3 Pf0=fract(P),Pf1=Pf0-vec3(1.0);
 vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x),iy=vec4(Pi0.yy,Pi1.yy);
 vec4 ixy=permute(permute(ix)+iy),ixy0=permute(ixy+Pi0.z),ixy1=permute(ixy+Pi1.z);
 vec4 gx0=ixy0/7.0,gy0=fract(floor(gx0)/7.0)-0.5;gx0=fract(gx0);
 vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0),sz0=step(gz0,vec4(0.0));gx0-=sz0*(step(0.0,gx0)-0.5);gy0-=sz0*(step(0.0,gy0)-0.5);
 vec4 gx1=ixy1/7.0,gy1=fract(floor(gx1)/7.0)-0.5;gx1=fract(gx1);
 vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1),sz1=step(gz1,vec4(0.0));gx1-=sz1*(step(0.0,gx1)-0.5);gy1-=sz1*(step(0.0,gy1)-0.5);
 vec3 g000=vec3(gx0.x,gy0.x,gz0.x),g100=vec3(gx0.y,gy0.y,gz0.y),g010=vec3(gx0.z,gy0.z,gz0.z),g110=vec3(gx0.w,gy0.w,gz0.w);
 vec3 g001=vec3(gx1.x,gy1.x,gz1.x),g101=vec3(gx1.y,gy1.y,gz1.y),g011=vec3(gx1.z,gy1.z,gz1.z),g111=vec3(gx1.w,gy1.w,gz1.w);
 vec4 n0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
 g000*=n0.x;g010*=n0.y;g100*=n0.z;g110*=n0.w;
 vec4 n1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
 g001*=n1.x;g011*=n1.y;g101*=n1.z;g111*=n1.w;
 vec4 nz=mix(vec4(dot(g000,Pf0),dot(g100,vec3(Pf1.x,Pf0.yz)),dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z)),dot(g110,vec3(Pf1.xy,Pf0.z))),vec4(dot(g001,vec3(Pf0.xy,Pf1.z)),dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z)),dot(g011,vec3(Pf0.x,Pf1.yz)),dot(g111,Pf1)),fade(Pf0).z);
 return 2.2*mix(mix(nz.x,nz.z,fade(Pf0).y),mix(nz.y,nz.w,fade(Pf0).y),fade(Pf0).x);
}
float fbm(vec3 p){return .57*cnoise(p)+.28*cnoise(p*2.03)+.15*cnoise(p*4.11);}
`;
export const sphereVertex=`
uniform float uTime;uniform float uRoughness;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vEye;varying float vTerrain;
${noise}
void main(){
 float drift=fbm(position*2.1+vec3(0.0,uTime*.07,0.0));
 vec3 p=position+normal*(drift*uRoughness+sin(uTime*1.2+position.y*3.0)*uRoughness*.25);
 vLocal=position;vTerrain=drift;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(p,1.0);vEye=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;
}`;
export const coreFragment=`
uniform float uTime;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vEye;
${noise}
void main(){
 float n=fbm(vLocal*3.0+vec3(uTime*.12,-uTime*.17,uTime*.04));
 float pulse=.88+.12*sin(uTime*1.7);float bands=pow(.5+.5*sin(n*13.0+vLocal.y*4.0-uTime*.8),3.0);
 vec3 energy=mix(vec3(1.2,.16,.025),vec3(3.8,1.65,.42),bands)*pulse;
 float rim=pow(1.0-max(dot(normalize(vNormal),vEye),0.0),2.0);
 gl_FragColor=vec4(energy+vec3(1.0,.5,.1)*rim,1.0);
}`;
export const crustFragment=`
uniform float uTime;uniform float uSeed;uniform vec3 uColor;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vEye;varying float vTerrain;
${noise}
void main(){
 vec3 domain=vLocal*2.0+vec3(uSeed);float fractures=abs(cnoise(domain+vTerrain*.8));
 if(fractures<.115)discard;
 float edge=1.0-smoothstep(.115,.19,fractures);
 float light=max(.08,dot(normalize(vNormal),normalize(vec3(-.4,.7,1.0))));
 vec3 rock=uColor*(.25+light*.85)*(1.0+vTerrain*.35);
 gl_FragColor=vec4(rock+edge*vec3(1.9,.48,.06),1.0);
}`;
export const planetFragment=`
uniform float uTime;uniform float uSeed;uniform vec3 uColor;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vEye;
${noise}
void main(){
 float cloud=fbm(vLocal*5.0+vec3(uSeed,uTime*.025,0.0));
 float bands=.5+.5*sin(vLocal.y*18.0+cloud*5.0+uSeed);
 float light=max(.08,dot(normalize(vNormal),normalize(vec3(-.6,.4,1.0))));
 float fresnel=pow(1.0-max(dot(normalize(vNormal),vEye),0.0),3.0);
 gl_FragColor=vec4(uColor*(.3+bands*.7)*light+uColor*fresnel*.9,1.0);
}`;
export const veinVertex=`
uniform vec3 uDelta;uniform float uTime;uniform float uSeed;varying vec2 vUv;
void main(){vUv=uv;vec3 p=position+uDelta*uv.x*uv.x;float envelope=sin(uv.x*3.14159265);p+=normal*sin(uTime*1.2+uv.x*16.0+uSeed)*.012*envelope;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}
`;
export const veinFragment=`
uniform float uTime;uniform float uSeed;uniform vec3 uColor;uniform float uStrength;uniform float uSpeed;varying vec2 vUv;
void main(){float flow=pow(.5+.5*sin(vUv.x*35.0-uTime*uSpeed+uSeed),9.0);float filament=.3+.7*pow(.5+.5*cos(vUv.y*6.283185),2.0);gl_FragColor=vec4(uColor*(.32+flow*2.1)*filament*uStrength,.22+.65*uStrength);}
`;
export const particlesVertex=`
uniform float uTime;uniform float uProgress;uniform float uPixelRatio;uniform vec2 uPointer;uniform vec3 uTargets[16];uniform int uCount;varying float vAlpha;
${noise}
void main(){
 vec3 p=position;vec3 field=vec3(cnoise(p*.4+uTime*.09),cnoise(p.yzx*.4-uTime*.07),cnoise(p.zxy*.4+uTime*.06));
 p+=field*.4;p.xy+=uPointer*.12;p.y+=sin(uProgress*6.28+p.x)*.2;
 for(int i=0;i<16;i++){if(i>=uCount)break;vec3 end=uTargets[i];float t=clamp(dot(p,end)/max(dot(end,end),.01),.15,1.0);vec3 d=end*t-p;float distanceToVein=length(d);p+=d*exp(-distanceToVein*distanceToVein*2.0)*(.16+.06*sin(uTime+p.x));}
 vAlpha=.25+.45*(.5+.5*sin(p.x+uTime*.4));vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(19.0*uPixelRatio/-mv.z,1.0,3.5);
}`;
export const particlesFragment=`varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(1.0,.69,.32,(1.0-smoothstep(.05,.5,r))*vAlpha);}`;
