'use strict';
/**
 * JARVÃO · chamadas ancoradas — explicações que saem de partes específicas do protótipo (Territory Studio / R1).
 *
 * Âncora no modelo (cruz ou círculo pontilhado girando) → linha 1px com cotovelo → bloco: rótulo em JetBrains Mono
 * maiúscula, dado real grande em JetBrains Mono 600, explicação embaixo com decodificação. A posição é recalculada a
 * cada quadro pela projeção 3D→2D (o texto acompanha a peça quando a câmera anda); o bloco vai para o lado de fora e
 * nunca fica sobre o núcleo. Uma ação real opcional por chamada (ex.: "SAIBA MAIS" → aba Clientes).
 *
 * montar({ camera, nucleoRaio }) → { definir(lista), quadro(), limpar() }
 *   lista: [{ id, ancora: () => Vector3, rotulo, grande, explica, marcador: 'cruz'|'circulo', acao: { texto, f } }]
 */
(function () {
  const CSS = `
  .cham-svg{position:fixed;inset:0;width:100vw;height:100vh;z-index:3;pointer-events:none;overflow:visible}
  .cham-svg line,.cham-svg polyline{stroke:rgba(255,170,100,.55);stroke-width:1;fill:none}
  .cham-svg .cm-circ{fill:none;stroke:#ff9a4d;stroke-width:1.2;stroke-dasharray:2 3;transform-box:fill-box;transform-origin:center;animation:cm-gira 6s linear infinite}
  .cham-svg .cm-ponto{fill:#ff9a4d}
  .cham-svg .cm-cruz{stroke:#ffe0b8;stroke-width:1.2}
  @keyframes cm-gira{to{transform:rotate(360deg)}}
  .cham-bloco{position:fixed;left:0;top:0;z-index:4;max-width:250px;pointer-events:none;will-change:transform,opacity;transition:opacity .35s;
    text-shadow:0 0 8px #000,0 1px 2px #000}
  .cham-bloco .cm-rot{font:500 10.5px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--di)}
  .cham-bloco .cm-g{font:600 28px/1.1 var(--mono);color:var(--tx);font-variant-numeric:tabular-nums;margin:3px 0 4px;white-space:nowrap}
  .cham-bloco .cm-ex{font:500 11px/1.55 var(--mono);letter-spacing:.04em;color:var(--mu);min-height:1.5em}
  .cham-bloco .cm-acao{pointer-events:auto;margin-top:10px;display:inline-flex;align-items:center;gap:10px;font:600 10.5px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--pri);min-height:36px}
  .cham-bloco .cm-acao i{width:22px;height:22px;border-radius:50%;border:1.2px dashed var(--pri);animation:cm-gira 5s linear infinite}
  .cham-bloco .cm-acao:hover{color:var(--tx)}
  .cham-bloco .cm-cursor{display:inline-block;width:.55em;height:1em;background:var(--pri);vertical-align:-.12em;margin-left:3px;animation:cm-pisca 1s steps(1) infinite}
  @keyframes cm-pisca{50%{opacity:0}}
  @media (max-width:700px){ .cham-bloco{max-width:160px} .cham-bloco .cm-g{font-size:20px} .cham-bloco .cm-ex{font-size:10px} }
  @media (prefers-reduced-motion:reduce){ .cham-svg .cm-circ,.cham-bloco .cm-acao i,.cham-bloco .cm-cursor{animation:none} }`;
  const NS = 'http://www.w3.org/2000/svg';

  function montar(op) {
    if (!document.getElementById('cham-css')) { const s = document.createElement('style'); s.id = 'cham-css'; s.textContent = CSS; document.head.appendChild(s); }
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'cham-svg'); svg.setAttribute('aria-hidden', 'true'); document.body.appendChild(svg);
    let itens = [];
    const v = new THREE.Vector3(), dir = new THREE.Vector3();

    function limpar() { itens.forEach(it => { it.el.remove(); it.g.remove(); }); itens = []; }
    function definir(lista) {
      const chave = lista.map(x => x.id + '|' + x.grande + '|' + x.explica).join('§');
      if (chave === definir.ultima) return; definir.ultima = chave;
      limpar();
      itens = lista.map(x => {
        const el = document.createElement('div'); el.className = 'cham-bloco'; el.style.opacity = '0';
        el.innerHTML = `<div class="cm-rot"></div><div class="cm-g"></div><div class="cm-ex"></div>`;
        el.querySelector('.cm-rot').textContent = x.rotulo || ''; el.querySelector('.cm-g').textContent = x.grande == null ? '' : x.grande;
        if (x.acao) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'cm-acao'; b.innerHTML = '<i aria-hidden="true"></i><span></span>';
          b.querySelector('span').textContent = x.acao.texto; b.addEventListener('click', () => x.acao.f()); el.appendChild(b);
        }
        if (x.micro) { const m = document.createElement('div'); m.className = 'cm-ex'; m.innerHTML = '<span></span><i class="cm-cursor" aria-hidden="true"></i>'; m.querySelector('span').textContent = x.micro; el.appendChild(m); }
        document.body.appendChild(el);
        const g = document.createElementNS(NS, 'g'); svg.appendChild(g);
        g.innerHTML = x.marcador === 'cruz'
          ? '<line class="cm-cruz" x1="-7" y1="0" x2="7" y2="0"/><line class="cm-cruz" x1="0" y1="-7" x2="0" y2="7"/><polyline/>'
          : '<circle class="cm-circ" r="9" cx="0" cy="0"/><circle class="cm-ponto" r="2.2" cx="0" cy="0"/><polyline/>';
        const it = { x, el, g, escrito: false, w: 0, h: 0 };
        requestAnimationFrame(() => { const r = el.getBoundingClientRect(); it.w = r.width; it.h = r.height; });
        return it;
      });
    }
    function quadro() {
      if (!itens.length) return;
      const cam = op.camera(), W = innerWidth, H = innerHeight, gut = 16;
      // zona proibida: o objeto da cena (o núcleo, ou o que a chamada indicar em `zona`) projetado na tela
      const z = itens[0] && itens[0].x.zona ? itens[0].x.zona() : { centro: new THREE.Vector3(0, 0, 0), raio: op.nucleoRaio() };
      v.copy(z.centro).project(cam); const nx = (v.x * .5 + .5) * W, ny = (-v.y * .5 + .5) * H;
      cam.getWorldDirection(dir); const lado = new THREE.Vector3().crossVectors(dir, cam.up).normalize().multiplyScalar(z.raio).add(z.centro);
      v.copy(lado).project(cam); const nr = Math.abs((v.x * .5 + .5) * W - nx) + 24;
      const ocupados = [];
      itens.forEach(it => {
        const p = it.x.ancora && it.x.ancora(); if (!p) { it.el.style.opacity = '0'; it.g.style.display = 'none'; return; }
        v.copy(p).project(cam);
        const atras = v.z > 1, ax = (v.x * .5 + .5) * W, ay = (-v.y * .5 + .5) * H;
        if (atras || ax < -40 || ax > W + 40 || ay < -40 || ay > H + 40) { it.el.style.opacity = '0'; it.g.style.display = 'none'; return; }
        const w = Math.max(it.w || 0, W < 700 ? 160 : 250), h = it.h || 80, paraDireita = ax >= nx;
        let bx, by;
        if (W < 700) {                                                    // celular: não há lados — empilha acima e abaixo do objeto
          const i = ocupados.length, acima = ny - nr - 10, abaixo = ny + nr + 10;
          bx = gut + (i % 2) * Math.max(0, W - 2 * gut - 34 - w);
          by = i === 0 ? acima - h : abaixo + (i - 1) * (h + 10);
          by = Math.max(170, Math.min(H - h - 110, by));
        } else {
          bx = paraDireita ? Math.max(ax + 60, nx + nr) : Math.min(ax - 60 - w, nx - nr - w);
          bx = Math.max(gut, Math.min(W - w - 84, bx));                    // à direita fica a navegação numerada
          by = ay - h - 26; if (by < gut + 60) by = ay + 26;
          for (const o of ocupados) if (Math.abs(o.x - bx) < w && Math.abs(o.y - by) < h + 8) by = o.y + h + 12;   // não empilha um sobre o outro
          by = Math.max(gut + 56, Math.min(H - h - 96, by));
        }
        ocupados.push({ x: bx, y: by });
        it.el.style.transform = `translate(${Math.round(bx)}px,${Math.round(by)}px)`; it.el.style.opacity = '1';
        const ex = paraDireita ? bx - 6 : bx + w + 6, ey = by + 18, cx = ax + (ex - ax) * .55;
        it.g.style.display = ''; it.g.setAttribute('transform', `translate(${ax.toFixed(1)},${ay.toFixed(1)})`);
        it.g.querySelector('polyline').setAttribute('points', `0,0 ${(cx - ax).toFixed(1)},0 ${(cx - ax).toFixed(1)},${(ey - ay).toFixed(1)} ${(ex - ax).toFixed(1)},${(ey - ay).toFixed(1)}`);
        if (!it.escrito && window.Escrita) { it.escrito = true; Escrita.decodificar(it.el.querySelector('.cm-ex'), it.x.explica || ''); }
      });
    }
    function esconder(v) { svg.style.display = v ? 'none' : ''; itens.forEach(it => { it.el.style.display = v ? 'none' : ''; }); }
    return { definir, quadro, limpar: () => { limpar(); definir.ultima = ''; }, esconder };
  }

  window.Chamadas = { montar };
})();
