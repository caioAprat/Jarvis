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
  if (fault < cut) discard;
  vec3 earth = texture2D(uEarth, vUv).rgb;
  float light = 0.32 + 0.68 * max(dot(normalize(vNormal), normalize(vec3(-0.4, 0.5, 1.0))), 0.0);
  float edge = 1.0 - smoothstep(cut, cut + 0.035, fault);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), vView), 0.0), 3.0);
  gl_FragColor = vec4(earth * light + uEnergy * edge * 1.4 + uNeon * fresnel * 0.16, 1.0);
}
