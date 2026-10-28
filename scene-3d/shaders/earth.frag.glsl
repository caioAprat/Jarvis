uniform float u_time;
uniform sampler2D uEarth;
uniform vec3 uEnergy;
uniform vec3 uNeon;
uniform float uOpening;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;

void main() {
  // Alpha clipping procedural: a fotografia permanece na casca; as fraturas
  // revelam de verdade a segunda malha, em vez de pintar um brilho por cima.
  float fault = abs(snoise(vLocal * 2.15 + vec3(0.0, sin(u_time * 0.08) * 0.06, 0.0)));
  float cut = 0.115 + uOpening * 0.025;
  // Uma seção estrutural larga atravessa a crosta, além das fissuras finas.
  float seam=abs(vLocal.x + vLocal.y*.38 + snoise(vLocal*3.0)*.085);
  float opening=.23+uOpening*.045;
  if (fault < cut*.45 || seam < opening) discard;
  vec3 earth = texture2D(uEarth, vUv).rgb;
  float light = 0.32 + 0.68 * max(dot(normalize(vNormal), normalize(vec3(-0.4, 0.5, 1.0))), 0.0);
  float edge = 1.0 - smoothstep(opening, opening + 0.055, seam);
  float veins=1.0-smoothstep(.025,.065,fault);
  vec2 grid=abs(fract(vUv*vec2(48.0,24.0))-.5);
  float circuit=step(.482,max(grid.x,grid.y))*.12;
  float flow=.45+.55*pow(.5+.5*sin(length(vLocal.xy)*24.0-u_time*5.0),3.0);
  earth=mix(earth,uNeon*.15,.18)+uNeon*circuit;
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), vView), 0.0), 3.0);
  gl_FragColor = vec4(earth * light + uEnergy * (edge * 2.4 + veins * flow * 2.0) + uNeon * fresnel * 0.16, 1.0);
}
