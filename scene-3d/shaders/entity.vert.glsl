uniform float u_time;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;

void main() {
  // Deslocamento pequeno: preserva continentes e a reserva de espaço calculada.
  float breath = sin(u_time * 1.45 + position.y * 4.0) * 0.008;
  vec3 displaced = position + normal * breath;
  vec4 view = modelViewMatrix * vec4(displaced, 1.0);
  vLocal = position;
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-view.xyz);
  vUv = uv;
  gl_Position = projectionMatrix * view;
}
