'use strict';
/**
 * JARVÃO · acesso dentro do cenário — o pedido de link e de PIN viram uma cena da narrativa.
 *
 * Só apresentação: quem valida é o mesmo código de sempre (pc.html colarLink() para o link,
 * Cadeado.tentar() para o PIN). Aqui: texto grande de um lado ("Seu PIN" / "Seu link", que se
 * escreve depois que o núcleo centraliza), texto pequeno explicativo do outro, e o campo como parte
 * da cena — no PIN, cada dígito acende um orbe no laranja da marca; erro pisca em --er só no aviso.
 *
 * Campo real (focável, teclado numérico no celular, autocomplete one-time-code), rótulo para leitor
 * de tela, Enter envia, Esc limpa. Sem chave nem segredo no front além do que o cadeado já tinha.
 *
 * montar(host, { modo, aoLink(texto)->bool, aoPin(valor)->bool })  →  { escrever(), zerar(), focar(), modo }
 */
(function () {
  const TEXTOS = {
    pin: { grande: 'Seu PIN', pequeno: 'Este aparelho já conhece a sua chave. Digite o PIN para abrir os dados reais — fica liberado por 12 horas.' },
    link: { grande: 'Seu link', pequeno: 'Primeira vez neste endereço: cole o link da central do PC que veio no Telegram. Depois disso, só o PIN.' },
  };

  if (!document.getElementById('acesso-term-css')) {
    const st = document.createElement('style'); st.id = 'acesso-term-css';
    st.textContent = `
    .acesso-campo:has(.term){width:min(390px,100%)}
    .mom-bloco:has(.term){top:auto!important;bottom:clamp(92px,11vh,130px)}
    .mom-bloco:has(.term) .mom-g{font-size:clamp(40px,5.2vw,68px)}
    .term{position:relative;margin-top:2px;padding:16px 18px 14px;width:min(380px,100%);background:linear-gradient(180deg,rgba(255,154,77,.045),rgba(255,154,77,.012));border:1px solid rgba(255,170,100,.12);backdrop-filter:blur(3px)}
    .term-c{position:absolute;width:9px;height:9px;pointer-events:none}
    .term-c::before,.term-c::after{content:'';position:absolute;background:var(--pri);opacity:.85}
    .term-c::before{left:4px;top:0;width:1px;height:9px}.term-c::after{top:4px;left:0;height:1px;width:9px}
    .term-c.tl{left:-5px;top:-5px}.term-c.tr{right:-5px;top:-5px}.term-c.bl{left:-5px;bottom:-5px}.term-c.br{right:-5px;bottom:-5px}
    .term-cab{display:flex;justify-content:space-between;font:500 10px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--di);padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid rgba(255,170,100,.1)}
    .term-cab span:last-child{color:var(--pri);opacity:.8}
    .casas{display:grid;grid-template-columns:repeat(8,1fr);gap:7px}
    .casas i{position:relative;height:42px;border:1px solid rgba(255,170,100,.2);background:rgba(8,7,6,.55);transition:border-color .18s cubic-bezier(.2,0,0,1),box-shadow .18s,background-color .18s}
    .casas i::after{content:'';position:absolute;left:50%;top:50%;width:7px;height:7px;margin:-3.5px;border-radius:50%;background:var(--pri);transform:scale(0);transition:transform .2s cubic-bezier(.2,0,0,1.4)}
    .casas i.aceso{border-color:rgba(255,154,77,.75);box-shadow:inset 0 0 14px rgba(255,138,61,.22),0 0 10px rgba(255,138,61,.18)}
    .casas i.aceso::after{transform:scale(1);box-shadow:0 0 8px #ff8a3d}
    .acesso-campo:focus-within .casas i.prox{border-color:rgba(255,154,77,.55)}
    .acesso-campo:focus-within .casas i.prox::before{content:'';position:absolute;left:50%;bottom:9px;width:12px;height:2px;margin-left:-6px;background:var(--pri);animation:pisca 1s steps(1) infinite}
    .casas i.erro{border-color:var(--er);box-shadow:0 0 10px rgba(255,77,94,.25)}
    .casas i.erro::after{background:var(--er);transform:scale(1)}
    .casas i.ok{border-color:var(--pri);background:rgba(255,154,77,.12)}
    .acesso-campo:focus-within .orbes,.acesso-campo:focus-within .casas{outline:none}
    .acesso-campo:focus-within .term{border-color:rgba(255,170,100,.26)}
    .term-log{list-style:none;margin:14px 0 0;padding:10px 0 0;border-top:1px solid rgba(255,170,100,.08);font:400 11px/1.9 var(--mono);color:var(--di);min-height:calc(3 * 1.9em + 10px)}
    .term-log li{display:flex;gap:8px;align-items:baseline;opacity:0;transform:translateY(4px);transition:opacity .25s,transform .25s cubic-bezier(.2,0,0,1)}
    .term-log li.vis{opacity:1;transform:none}
    .term-log li::before{content:'>';color:var(--pri);opacity:.6}
    .term-log .l-p{flex:1;border-bottom:1px dotted rgba(255,170,100,.16);transform:translateY(-3px)}
    .term-log .l-e{font-weight:600;letter-spacing:.1em;color:var(--mu)}
    .term-log li.ok .l-e{color:var(--pri)}
    .term-log li.erro .l-e{color:var(--er)}
    .term-log li.verif .l-e{animation:pisca .5s steps(1) infinite}
    @keyframes pisca{50%{opacity:0}}
    .anel-pin{position:fixed;left:0;top:0;z-index:3;pointer-events:none;overflow:visible;opacity:0;transition:opacity .3s}
    .anel-pin .anel-gir{transform-origin:0 0;animation:anelGira 40s linear infinite}
    .anel-pin .anel-trilha{fill:none;stroke:rgba(255,170,100,.16);stroke-width:.6}
    .anel-pin .anel-seg{fill:none;stroke:rgba(255,170,100,.34);stroke-width:2.4;stroke-linecap:round;transition:stroke .2s,stroke-width .2s}
    .anel-pin .anel-seg.aceso{stroke:var(--pri);stroke-width:3.4;filter:drop-shadow(0 0 4px #ff8a3d)}
    .anel-pin .anel-seg.erro{stroke:var(--er)}
    .anel-pin .anel-tick{stroke:rgba(255,170,100,.35);stroke-width:.6}
    .anel-pin.liberado{transition:opacity .9s .25s;opacity:0}
    .anel-pin.liberado .anel-gir{animation:anelGira 1.2s cubic-bezier(.2,0,0,1) 1}
    @keyframes anelGira{to{transform:rotate(360deg)}}
    @media(max-width:700px){.casas{gap:5px}.casas i{height:38px}.term{padding:14px 14px 12px}}
    @media(prefers-reduced-motion:reduce){.anel-pin .anel-gir{animation:none}.term-log li{transition:none}.casas i::after{transition:none}}
`;
    document.head.appendChild(st);
  }

  function montar(host, op) {
    const modo = op.modo === 'link' ? 'link' : 'pin', T = TEXTOS[modo];
    const n = (window.Cadeado && Cadeado.tamanho) || 8;
    host.innerHTML = `
      <div class="mom-lado mom-esq"><div class="mom-g" data-g></div></div>
      <div class="mom-lado mom-dir">
        <p class="mom-p" data-p></p>
        <form class="acesso-campo" data-form novalidate>
          ${modo === 'pin'
            ? `<div class="term" data-term>
                 <i class="term-c tl"></i><i class="term-c tr"></i><i class="term-c bl"></i><i class="term-c br"></i>
                 <div class="term-cab" aria-hidden="true"><span>Entrada</span><span>PIN · ${n} dígitos</span></div>
                 <label class="sr" for="cenaPin">PIN deste aparelho (${n} dígitos)</label>
                 <div class="casas" data-orbes aria-hidden="true">${'<i></i>'.repeat(n)}</div>
                 <input id="cenaPin" class="pin-real" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="${n}" enterkeyhint="go">
                 <ol class="term-log" data-log aria-hidden="true"></ol>
               </div>`
            : `<label class="sr" for="cenaLink">Link da central do PC</label>
               <input id="cenaLink" class="link-real" type="url" autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="https://caioaprat.github.io/Jarvis/pc.html#k=…">`}
          <div class="acesso-aviso" data-aviso aria-live="polite"></div>
        </form>
      </div>`;
    const g = host.querySelector('[data-g]'), p = host.querySelector('[data-p]'), form = host.querySelector('[data-form]');
    const campo = host.querySelector('input'), aviso = host.querySelector('[data-aviso]'), orbes = host.querySelector('[data-orbes]');
    Escrita.preparar(g, T.grande); Escrita.preparar(p, T.pequeno);
    let escrito = false, enviando = false;

    const log = host.querySelector('[data-log]');
    const LOG = [['canal seguro', 'OK'], ['chave do aparelho', 'OK'], ['aguardando PIN', '···']];
    function linhaLog(i, estado, classe) {
      if (!log) return; let li = log.children[i];
      if (!li) { li = document.createElement('li'); li.innerHTML = '<span class="l-t"></span><span class="l-p"></span><b class="l-e"></b>'; log.append(li); }
      li.querySelector('.l-t').textContent = LOG[i][0]; li.querySelector('.l-e').textContent = estado;
      const cl = 'vis ' + (classe || ''); requestAnimationFrame(() => { li.className = cl; });
    }
    // Anel em volta do núcleo: um trecho por dígito. SVG fixo, preso à posição do núcleo na tela.
    let anel = null, laco = 0; const segs = [];
    if (modo === 'pin' && op.anel) {
      const NS = 'http://www.w3.org/2000/svg';
      anel = document.createElementNS(NS, 'svg'); anel.setAttribute('class', 'anel-pin'); anel.setAttribute('viewBox', '-100 -100 200 200'); anel.setAttribute('aria-hidden', 'true');
      const arco = (a0, a1, r) => `M${(Math.cos(a0) * r).toFixed(2)} ${(Math.sin(a0) * r).toFixed(2)} A${r} ${r} 0 0 1 ${(Math.cos(a1) * r).toFixed(2)} ${(Math.sin(a1) * r).toFixed(2)}`;
      const gr = document.createElementNS(NS, 'g'); gr.setAttribute('class', 'anel-gir'); anel.append(gr);
      const trilha = document.createElementNS(NS, 'circle'); trilha.setAttribute('r', '92'); trilha.setAttribute('class', 'anel-trilha'); gr.append(trilha);
      for (let i = 0; i < n; i++) {
        const a0 = -Math.PI / 2 + i * 2 * Math.PI / n + .07, a1 = a0 + 2 * Math.PI / n - .14, aa = a0 - .07;
        const ph = document.createElementNS(NS, 'path'); ph.setAttribute('d', arco(a0, a1, 92)); ph.setAttribute('class', 'anel-seg'); gr.append(ph); segs.push(ph);
        const tk = document.createElementNS(NS, 'line');
        tk.setAttribute('x1', (Math.cos(aa) * 84).toFixed(2)); tk.setAttribute('y1', (Math.sin(aa) * 84).toFixed(2));
        tk.setAttribute('x2', (Math.cos(aa) * 99).toFixed(2)); tk.setAttribute('y2', (Math.sin(aa) * 99).toFixed(2));
        tk.setAttribute('class', 'anel-tick'); gr.append(tk);
      }
      document.body.append(anel);
      const seguir = () => {
        laco = requestAnimationFrame(seguir);
        const v = op.anel(), cena = host.closest('.narr-cena'), vis = cena ? +getComputedStyle(cena).opacity : 1;
        if (!v || vis < .02) { anel.style.opacity = '0'; return; }
        if (!anel.classList.contains('liberado')) anel.style.opacity = String(Math.min(1, vis));
        anel.style.width = anel.style.height = (v.r * 2) + 'px';
        anel.style.transform = `translate(${(v.x - v.r).toFixed(1)}px,${(v.y - v.r).toFixed(1)}px)`;
      };
      laco = requestAnimationFrame(seguir);
    }
    function pintar(erro) {
      if (!orbes) return;
      const k = campo.value.length;
      [...orbes.children].forEach((o, i) => { o.className = erro ? 'erro' : i < k ? 'aceso' : i === k ? 'prox' : ''; });
      segs.forEach((sg, i) => sg.setAttribute('class', 'anel-seg' + (erro ? ' erro' : i < k ? ' aceso' : '')));
      if (op.aoDigitos) op.aoDigitos(erro ? 0 : k);
    }
    function errar(msg) {
      aviso.textContent = msg; aviso.classList.add('erro');
      pintar(true); host.classList.remove('treme'); void host.offsetWidth; host.classList.add('treme');
      linhaLog(2, 'NEGADO', 'erro');
      setTimeout(() => { campo.value = ''; pintar(false); linhaLog(2, '···'); }, 620);
    }
    function enviar() {
      if (enviando) return;
      if (modo === 'pin') {
        if (op.aoPin && op.aoPin(campo.value)) { aviso.textContent = ''; aviso.classList.remove('erro'); enviando = true; [...(orbes ? orbes.children : [])].forEach(o => { o.className = 'aceso ok'; }); LOG[2][0] = 'PIN confirmado'; linhaLog(2, 'OK', 'ok'); if (anel) { anel.style.opacity = ''; anel.classList.add('liberado'); } campo.blur(); }
        else errar('PIN errado.');
      } else if (op.aoLink && op.aoLink(campo.value)) { aviso.textContent = ''; aviso.classList.remove('erro'); enviando = true; campo.blur(); }
      else errar('Esse não parece o link da central do PC.');
    }
    form.addEventListener('submit', ev => { ev.preventDefault(); ev.stopPropagation(); enviar(); });
    campo.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); campo.value = ''; aviso.textContent = ''; aviso.classList.remove('erro'); pintar(false); }
      else if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); enviar(); }
    });
    campo.addEventListener('input', () => {
      if (modo === 'pin') { campo.value = campo.value.replace(/\D/g, '').slice(0, n); pintar(false); aviso.textContent = ''; aviso.classList.remove('erro'); if (campo.value.length === n) enviar(); }
    });
    if (orbes) orbes.addEventListener('click', () => campo.focus());

    async function escrever() {
      if (escrito) return; escrito = true;
      if (!await Escrita.grande(g, T.grande)) return;
      await Escrita.pequeno(p, T.pequeno);
      host.classList.add('pronto');
      await logar();
    }
    let logando = false;
    async function logar() {
      if (logando || (log && log.children.length)) return; logando = true;
      for (let i = 0; i < LOG.length; i++) { await new Promise(r => setTimeout(r, 260)); linhaLog(i, i < 2 ? 'OK' : '···', i < 2 ? 'ok' : ''); }
      logando = false; pintar(false);
    }
    function zerar() { escrito = false; host.classList.remove('pronto'); Escrita.zerar(g); Escrita.zerar(p); if (log) log.innerHTML = ''; }
    function focar() { try { campo.focus({ preventScroll: true }); } catch (e) { campo.focus(); } }
    function destruir() { cancelAnimationFrame(laco); if (anel) anel.remove(); }
    if (anel) new MutationObserver((m, ob) => { if (!host.contains(campo)) { destruir(); ob.disconnect(); } }).observe(host, { childList: true, subtree: true });
    return { escrever, zerar, focar, modo, destruir, logar };
  }

  window.LandingAcesso = { montar };
})();
