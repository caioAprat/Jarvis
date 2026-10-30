'use strict';
/**
 * JARVÃO · escrita — palavras que se escrevem (técnica Ovechkin) e texto pequeno que aparece depois.
 *
 * grande(el, texto, { cor }): monta um SVG com um <tspan> por letra; cada letra é desenhada pelo
 *   contorno (stroke-dashoffset, em laranja da marca) e depois preenchida (em --tx ou na cor de status
 *   passada). Devolve uma Promise que resolve quando terminou. O texto real fica num .sr para leitor de tela.
 * pequeno(el, texto): letras aparecem em sequência rápida (mono). Devolve Promise.
 * zerar(el): volta ao estado "ainda não escrito" (para a cena poder se escrever de novo).
 * Com prefers-reduced-motion: tudo aparece pronto, sem animação.
 *
 * Sem build: carregado por <script> em pc.html. Usa GSAP (já carregado).
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const reduzido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function limpar(el) { if (el._tl) { el._tl.kill(); el._tl = null; } el.innerHTML = ''; el.dataset.escrito = ''; }

  function grande(el, texto, op) {
    op = op || {};
    limpar(el);
    texto = String(texto == null ? '' : texto);
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = texto; el.appendChild(sr);
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'esc-svg');
    const t = document.createElementNS(NS, 'text');
    const fs = parseFloat(getComputedStyle(el).fontSize) || 96;
    t.setAttribute('x', String(fs * .04)); t.setAttribute('y', String(fs * .86));
    const letras = [];
    for (const ch of texto) {
      const s = document.createElementNS(NS, 'tspan'); s.textContent = ch;
      s.setAttribute('class', 'esc-l'); t.appendChild(s); letras.push(s);
    }
    svg.appendChild(t); el.appendChild(svg);
    const cor = op.cor || 'var(--tx)';
    // dimensiona pelo texto de verdade (fonte já carregada)
    try { const b = t.getBBox(); svg.setAttribute('viewBox', `0 0 ${Math.ceil(b.x + b.width + fs * .08)} ${Math.ceil(fs * 1.08)}`); svg.style.width = Math.ceil(b.x + b.width + fs * .08) + 'px'; svg.style.height = Math.ceil(fs * 1.08) + 'px'; } catch (e) {}
    const L = fs * 3.2;                                                     // comprimento de traço que cobre o contorno de uma letra
    letras.forEach(s => { s.style.fill = cor; s.style.stroke = 'var(--pri)'; s.style.strokeWidth = Math.max(1, fs / 90) + 'px'; s.style.strokeDasharray = L; });
    if (reduzido || !window.gsap) { letras.forEach(s => { s.style.strokeDashoffset = 0; s.style.fillOpacity = 1; s.style.strokeOpacity = 0; }); el.dataset.escrito = '1'; return Promise.resolve(); }
    letras.forEach(s => { s.style.strokeDashoffset = L; s.style.fillOpacity = 0; s.style.strokeOpacity = 1; });
    return new Promise(res => {
      const tl = gsap.timeline({ onComplete: () => { el.dataset.escrito = '1'; res(); } });
      tl.to(letras, { strokeDashoffset: 0, duration: .55, ease: 'power2.inOut', stagger: .055 }, 0)
        .to(letras, { fillOpacity: 1, duration: .35, ease: 'power1.out', stagger: .055 }, .32)
        .to(letras, { strokeOpacity: 0, duration: .5, ease: 'power1.out', stagger: .055 }, .55);
      el._tl = tl;
    });
  }

  function pequeno(el, texto) {
    limpar(el);
    texto = String(texto == null ? '' : texto);
    if (reduzido || !window.gsap) { el.textContent = texto; el.dataset.escrito = '1'; return Promise.resolve(); }
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = texto; el.appendChild(sr);
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true'); el.appendChild(vis);
    const est = { n: 0 };
    return new Promise(res => {
      el._tl = gsap.to(est, { n: texto.length, duration: Math.min(1.1, .25 + texto.length * .018), ease: 'none',
        onUpdate: () => { vis.textContent = texto.slice(0, Math.round(est.n)); },
        onComplete: () => { vis.textContent = texto; el.dataset.escrito = '1'; res(); } });
    });
  }

  /** Decodificação: letras embaralhadas que se resolvem da esquerda para a direita (~0,7 s) até virar o texto real. */
  const GLIFOS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789▮/#%';
  function decodificar(el, texto, dur) {
    limpar(el);
    texto = String(texto == null ? '' : texto);
    if (reduzido || !window.gsap) { el.textContent = texto; el.dataset.escrito = '1'; return Promise.resolve(); }
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = texto; el.appendChild(sr);
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true'); el.appendChild(vis);
    const est = { k: 0 }, n = texto.length;
    return new Promise(res => {
      el._tl = gsap.to(est, { k: 1, duration: dur || Math.min(1.1, .45 + n * .012), ease: 'power1.inOut',
        onUpdate: () => {
          const pronto = Math.floor(est.k * n); let out = texto.slice(0, pronto);
          for (let i = pronto; i < Math.min(n, pronto + 14); i++) out += texto[i] === ' ' ? ' ' : GLIFOS[(Math.random() * GLIFOS.length) | 0];
          vis.textContent = out;
        },
        onComplete: () => { vis.textContent = texto; el.dataset.escrito = '1'; res(); } });
    });
  }

  function zerar(el) { limpar(el); }

  window.Escrita = { grande, pequeno, decodificar, zerar, reduzido };
})();
