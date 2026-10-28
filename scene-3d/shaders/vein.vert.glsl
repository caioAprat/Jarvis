uniform vec3 uStartDelta;
uniform vec3 uEndDelta;
uniform float u_time;
uniform float uSeed;
varying vec2 vUv;

void main() {
  vUv = uv;
  // Mesma interpolação usada pela CPU nos documentos instanciados.
  vec3 p = position + mix(uStartDelta, uEndDelta, uv.x);
  p += normal * sin(u_time * 1.1 + uv.x * 17.0 + uSeed) * 0.006 * sin(uv.x * 3.14159265);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
