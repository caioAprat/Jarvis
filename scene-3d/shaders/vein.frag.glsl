uniform float u_time;
uniform float uSeed;
uniform float uStrength;
uniform float uSpeed;
uniform vec3 uEnergy;
uniform vec3 uElectric;
varying vec2 vUv;

void main() {
  float packet = pow(0.5 + 0.5 * sin(vUv.x * 31.0 - u_time * uSpeed + uSeed), 8.0);
  float filament = 0.45 + 0.55 * pow(0.5 + 0.5 * cos(vUv.y * 6.283185), 2.0);
  vec3 color = mix(uEnergy * 0.35, uElectric * 1.8, packet) * filament;
  gl_FragColor = vec4(color, uStrength * (0.35 + packet * 0.65));
}
