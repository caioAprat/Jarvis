'use strict';
/**
 * JARVÃO · navegação numerada lateral (R3): 01, 02, 03… à direita, mostrando a cena atual; clique leva até ela.
 * JetBrains Mono pequeno em --di; a cena ativa em --pri com uma linha curta. 390 px: só os pontos.
 * montar() → { definir([{ rotulo, ir }]), ativa(i), remover() }
 */
(function () {
  const CSS = `
  .nav-cenas{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:35;display:flex;flex-direction:column;gap:2px;pointer-events:auto}
  .nav-cenas button{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-height:24px;padding:2px 4px;font:500 10.5px var(--mono);letter-spacing:.08em;color:var(--di);transition:color .2s}
  .nav-cenas button i{display:block;width:6px;height:1px;background:var(--di);transition:width .25s cubic-bezier(.2,0,0,1),background-color .2s}
  .nav-cenas button:hover{color:var(--tx)}
  .nav-cenas button[aria-current="true"]{color:var(--pri)} .nav-cenas button[aria-current="true"] i{width:22px;background:var(--pri)}
  .nav-cenas button .nr{min-width:2ch;text-align:right}
  @media (max-width:700px){ .nav-cenas{right:6px} .nav-cenas button .nr{display:none} .nav-cenas button{min-height:18px} }`;

  function montar() {
    if (!document.getElementById('nav-cenas-css')) { const s = document.createElement('style'); s.id = 'nav-cenas-css'; s.textContent = CSS; document.head.appendChild(s); }
    const el = document.createElement('nav'); el.className = 'nav-cenas'; el.setAttribute('aria-label', 'Cenas'); document.body.appendChild(el);
    let botoes = [], atual = -1;
    function definir(lista) {
      el.innerHTML = ''; atual = -1;
      botoes = lista.map((c, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Cena ' + String(i + 1).padStart(2, '0') + ': ' + c.rotulo);
        b.innerHTML = `<span class="nr">${String(c.n || i + 1).padStart(2, '0')}</span><i aria-hidden="true"></i>`; b.title = c.rotulo;
        b.addEventListener('click', () => c.ir()); el.appendChild(b); return b;
      });
    }
    function ativa(i) { if (i === atual) return; atual = i; botoes.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false')); }
    return { definir, ativa, remover: () => el.remove(), el };
  }

  window.NavCenas = { montar };
})();
