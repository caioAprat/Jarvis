'use strict';
/** Letras com espaço reservado. A cena 3D e a sua linha do tempo não dependem deste módulo. */
(function () {
  const movimento = matchMedia('(prefers-reduced-motion: reduce)');
  const GLIFOS = '01/\\|<>[]{}=+-_#ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (window.gsap && window.ScrambleTextPlugin && window.SplitText) gsap.registerPlugin(ScrambleTextPlugin, SplitText);
  const css = document.createElement('style');
  css.textContent = `
    .esc-reserva{visibility:hidden;white-space:inherit}
    .esc-superficie{position:relative;display:block}
    .esc-vis{position:absolute;inset:0;white-space:inherit;opacity:.85}
    .esc-vis .esc-char{display:inline-block;text-align:center;overflow:visible}
    .narr-texto-camada{pointer-events:none!important;transform:none!important;filter:none!important;will-change:opacity!important}
    .narr-texto-camada .mom-tela,.narr-texto-camada form,.narr-texto-camada button{visibility:hidden!important;pointer-events:none!important}
  `;
  document.head.appendChild(css);

  // O original conserva os campos/canvas e os efeitos antigos. Só as letras usam a camada irmã.
  function superficie(el) {
    const cena = el.closest('.narr-cena');
    if (!cena || movimento.matches) return el;
    if (!cena._textoCamada) {
      const camada = cena.cloneNode(true);
      camada.classList.replace('narr-cena', 'narr-texto-camada');
      camada.removeAttribute('data-cena');
      camada.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      camada.querySelectorAll('input,button,a,form,canvas').forEach(n => {
        n.setAttribute('aria-hidden', 'true'); n.setAttribute('tabindex', '-1');
        if ('disabled' in n) n.disabled = true;
      });
      const originais = cena.querySelectorAll('.mom-g,.mom-p');
      const copias = camada.querySelectorAll('.mom-g,.mom-p');
      originais.forEach((n, i) => { n._superficie = copias[i]; n.style.visibility = 'hidden'; n.setAttribute('aria-hidden', 'true'); });
      cena.after(camada); cena._textoCamada = camada;
      const sincronizar = () => {
        camada.style.opacity = cena.style.opacity;
        camada.style.display = cena.style.display;
      };
      const observador = new MutationObserver(sincronizar);
      observador.observe(cena, { attributes: true, attributeFilter: ['style'] });
      cena._textoObservador = observador;
      sincronizar();
    }
    return el._superficie || el;
  }
  function cancelar(el) {
    el._geracao = (el._geracao || 0) + 1;
    if (el._tl) { el._tl.kill(); el._tl = null; }
    if (el._resolver) { el._resolver(false); el._resolver = null; }
    if (el._split) { el._split.revert(); el._split = null; }
  }
  function montar(el, texto) {
    el.textContent = '';
    const bloco = document.createElement('span'); bloco.className = 'esc-superficie';
    const reserva = document.createElement('span'); reserva.className = 'esc-reserva'; reserva.textContent = texto; reserva.setAttribute('aria-hidden', 'true');
    const vis = document.createElement('span'); vis.className = 'esc-vis'; vis.textContent = texto; vis.setAttribute('aria-hidden', 'true'); vis.style.opacity = '0';
    bloco.append(reserva, vis); el.append(bloco); el.setAttribute('aria-label', texto);
    return vis;
  }
  function preparar(el, texto) {
    if (!el) return;
    texto = String(texto == null ? '' : texto);
    if (el._texto === texto && el.querySelector('.esc-reserva')) return;
    cancelar(el); el._texto = texto; montar(el, texto);
    if (el._superficie) montar(el._superficie, texto);
  }
  async function escrever(el, texto, op) {
    op = op || {}; preparar(el, texto); cancelar(el);
    const geracao = el._geracao, alvo = superficie(el);
    alvo.style.color = op.cor || '';
    const vis = alvo.querySelector('.esc-vis');
    if (!vis) return false;
    vis.textContent = el._texto; vis.style.opacity = '.85';
    if (movimento.matches || !window.gsap || !window.SplitText || !window.ScrambleTextPlugin) { el.dataset.escrito = '1'; return true; }
    // Medir somente depois da fonte chegar evita larguras erradas e saltos de linha.
    if (document.fonts) { try { await document.fonts.load(getComputedStyle(alvo).font, el._texto); } catch (e) {} }
    if (geracao !== el._geracao || !el.isConnected) return false;
    const split = el._split = new SplitText(vis, { type: 'chars', charsClass: 'esc-char', aria: 'none' });
    split.chars.forEach(ch => { ch.style.width = ch.getBoundingClientRect().width + 'px'; });
    return new Promise(resolve => {
      el._resolver = resolve;
      const tl = el._tl = gsap.timeline({ onComplete: () => { el.dataset.escrito = '1'; el._resolver = null; resolve(true); } });
      split.chars.forEach((ch, i) => {
        const final = ch.textContent;
        ch.textContent = GLIFOS[Math.floor(Math.random() * GLIFOS.length)];
        tl.to(ch, { duration: .24, scrambleText: { text: final, chars: GLIFOS, speed: .6 }, ease: 'none' }, i * Math.min(.04, .8 / Math.max(1, split.chars.length)));
      });
      if (!split.chars.length) { el._resolver = null; resolve(true); }
    });
  }
  function sair(el) {
    if (!el || !el._texto || el.dataset.saindo === '1') return;
    cancelar(el); el.dataset.saindo = '1';
    const alvo = el._superficie || el, vis = alvo.querySelector('.esc-vis');
    if (!vis) return;
    if (movimento.matches || !window.gsap) { vis.style.opacity = '0'; return; }
    const estado = { p: 0 };
    el._tl = gsap.to(estado, { p: 1, duration: .25, ease: 'none', onUpdate: () => {
      vis.style.opacity = String(.85 * (1 - estado.p));
      vis.textContent = [...el._texto].map(c => /\s/.test(c) ? c : GLIFOS[Math.floor(Math.random() * GLIFOS.length)]).join('');
    } });
  }
  function zerar(el) {
    cancelar(el); el.dataset.escrito = ''; el.dataset.saindo = '';
    const vis = (el._superficie || el).querySelector('.esc-vis');
    if (vis) { vis.textContent = el._texto || ''; vis.style.opacity = '0'; }
  }
  function grande(el, texto, op) { el.dataset.saindo = ''; return escrever(el, texto, op); }
  function pequeno(el, texto) { el.dataset.saindo = ''; return escrever(el, texto); }
  function liberar(cena) {
    if (cena._textoObservador) cena._textoObservador.disconnect();
    if (cena._textoCamada) cena._textoCamada.remove();
    cena.querySelectorAll('.mom-g,.mom-p').forEach(zerar);
    cena._textoCamada = null;
  }
  window.Escrita = { grande, pequeno, decodificar: pequeno, preparar, sair, zerar, liberar, get reduzido() { return movimento.matches; } };
})();
