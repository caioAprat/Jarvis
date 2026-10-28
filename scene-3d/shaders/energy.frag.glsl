uniform float u_time;
uniform vec3 uEnergy;
uniform vec3 uElectric;
uniform vec3 uNeon;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec3 p = vLocal * 3.5;
  float field = snoise(p + vec3(u_time * 0.21, -u_time * 0.13, 0.0));
  float branches = snoise(p * 2.1 + field * 0.6 + u_time * 0.38);
  float lightning = 1.0 - smoothstep(0.012, 0.075, abs(field + branches * 0.18));
  float pulse = 0.85 + 0.15 * sin(u_time * 2.2);
  float rim = pow(1.0 - max(dot(normalize(vNormal), vView), 0.0), 2.5);
  vec3 energy = uEnergy * (0.32 + 0.18 * field);
  energy += mix(uNeon, uElectric, lightning) * lightning * 3.2 * pulse;
  gl_FragColor = vec4(energy + uElectric * rim * 0.45, 1.0);
}
