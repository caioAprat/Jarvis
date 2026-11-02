'use strict';
/** Integração Verlet e restrições de distância; independente de DOM e Three.js.
 * Referência conceitual: unitycoder/ThreeJS-Rope-Physics. Implementação própria.
 * Unidades e passo fixo em segundos. Sem alocações no passo da simulação. */
(function (raiz) {
  class Corda {
    constructor(a, b, op = {}) {
      this.n = Math.max(18, Math.min(24, op.pontos || 22));
      this.p = new Float64Array(this.n * 3); this.anterior = new Float64Array(this.n * 3);
      this.a = new Float64Array(a); this.b = new Float64Array(b);
      this.chao = op.chao == null ? 0 : op.chao; this.raio = op.raio || .03;
      this.gravidade = op.gravidade == null ? .8 : op.gravidade;
      this.iteracoes = 8; this.amortecimento = .975; this.tempo = 0;
      this.ventoX = this.ventoZ = this.impulso = 0; this.reduzido = false;
      this.ponteiro = { ativo: false, x: 0, y: 0, z: 0, raio: 1 };
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], distancia = Math.hypot(dx, dy, dz);
      this.comprimento = Math.max(.01, distancia) * (1 + Math.max(.12, Math.min(.25, op.folga == null ? .2 : op.folga)));
      this.segmento = this.comprimento / (this.n - 1);
      const horizontal = Math.hypot(dx, dz), nx = horizontal > 1e-6 ? -dz / horizontal : 1, nz = horizontal > 1e-6 ? dx / horizontal : 0;
      // Curva inicial já tem folga, inclusive quando uma âncora fica perto do piso.
      let lo = 0, hi = this.comprimento;
      for (let k = 0; k < 24; k++) {
        const amp = (lo + hi) / 2; let comprimento = 0;
        for (let i = 0; i < this.n; i++) {
          const t = i / (this.n - 1), arco = Math.sin(t * Math.PI) * amp, j = i * 3;
          this.p[j] = a[0] + dx * t + nx * arco;
          this.p[j + 1] = Math.max(this.chao + this.raio, a[1] + dy * t - arco * .35);
          this.p[j + 2] = a[2] + dz * t + nz * arco;
          if (i) comprimento += Math.hypot(this.p[j] - this.p[j - 3], this.p[j + 1] - this.p[j - 2], this.p[j + 2] - this.p[j - 1]);
        }
        if (comprimento > this.comprimento) hi = amp; else lo = amp;
      }
      this.fixar(); this.anterior.set(this.p);
      for (let i = 0; i < 180; i++) this.passo(1 / 120);
    }
    ancoras(ax, ay, az, bx, by, bz) {
      // Transporta a corda com as âncoras, sem injetar velocidade artificial na chegada dos monitores.
      const dax=ax-this.a[0],day=ay-this.a[1],daz=az-this.a[2],dbx=bx-this.b[0],dby=by-this.b[1],dbz=bz-this.b[2];
      for(let i=1;i<this.n-1;i++){const t=i/(this.n-1),j=i*3,dx=dax+(dbx-dax)*t,dy=day+(dby-day)*t,dz=daz+(dbz-daz)*t;this.p[j]+=dx;this.anterior[j]+=dx;this.p[j+1]+=dy;this.anterior[j+1]+=dy;this.p[j+2]+=dz;this.anterior[j+2]+=dz;}
      this.a[0] = ax; this.a[1] = ay; this.a[2] = az; this.b[0] = bx; this.b[1] = by; this.b[2] = bz;
      this.fixar();
    }
    fixar() {
      const fim = (this.n - 1) * 3;
      for (let k = 0; k < 3; k++) { this.p[k] = this.anterior[k] = this.a[k]; this.p[fim + k] = this.anterior[fim + k] = this.b[k]; }
    }
    passo(dt) {
      dt = Math.max(0, Math.min(1 / 60, dt)); this.tempo += dt;
      const dt2 = dt * dt, minimo = this.chao + this.raio, ptr = this.ponteiro;
      for (let i = 1; i < this.n - 1; i++) {
        const j = i * 3, x = this.p[j], y = this.p[j + 1], z = this.p[j + 2];
        let fx = 0, fz = 0;
        if (!this.reduzido) {
          fx = this.ventoX + Math.sin(this.tempo * .65 + i * .47) * .025;
          fz = this.ventoZ + Math.cos(this.tempo * .51 + i * .31) * .025 + this.impulso;
          if (ptr.ativo) {
            const dx = x - ptr.x, dy = y - ptr.y, dz = z - ptr.z, dist = Math.hypot(dx, dy, dz);
            if (dist > .001 && dist < ptr.raio) { const f = (1 - dist / ptr.raio) * .35 / dist; fx += dx * f; fz += dz * f; }
          }
        }
        this.p[j] = x + (x - this.anterior[j]) * this.amortecimento + fx * dt2;
        this.p[j + 1] = y + (y - this.anterior[j + 1]) * this.amortecimento - this.gravidade * dt2;
        this.p[j + 2] = z + (z - this.anterior[j + 2]) * this.amortecimento + fz * dt2;
        this.anterior[j] = x; this.anterior[j + 1] = y; this.anterior[j + 2] = z;
      }
      for (let it = 0; it < this.iteracoes; it++) {
        for (let k = 0; k < this.n - 1; k++) {
          const i = it % 2 ? this.n - 2 - k : k, j = i * 3, b = j + 3;
          const dx = this.p[b] - this.p[j], dy = this.p[b + 1] - this.p[j + 1], dz = this.p[b + 2] - this.p[j + 2];
          const distancia = Math.hypot(dx, dy, dz); if (distancia < 1e-10) continue;
          const w1 = i === 0 ? 0 : 1, w2 = i === this.n - 2 ? 0 : 1;
          const f = (distancia - this.segmento) / (distancia * (w1 + w2));
          this.p[j] += dx * f * w1; this.p[j + 1] += dy * f * w1; this.p[j + 2] += dz * f * w1;
          this.p[b] -= dx * f * w2; this.p[b + 1] -= dy * f * w2; this.p[b + 2] -= dz * f * w2;
        }
        for (let i = 1; i < this.n - 1; i++) {
          const j = i * 3;
          if (this.p[j + 1] < minimo) {
            this.p[j + 1] = minimo; this.anterior[j + 1] = minimo;
            this.anterior[j] += (this.p[j] - this.anterior[j]) * .12;
            this.anterior[j + 2] += (this.p[j + 2] - this.anterior[j + 2]) * .12;
          }
        }
        this.fixar();
      }
      this.impulso *= .94;
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { Corda };
  else raiz.CordaVerlet = { Corda };
})(typeof window !== 'undefined' ? window : globalThis);
