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

  function montar(host, op) {
    const modo = op.modo === 'link' ? 'link' : 'pin', T = TEXTOS[modo];
    const n = (window.Cadeado && Cadeado.tamanho) || 8;
    host.innerHTML = `
      <div class="mom-lado mom-esq"><div class="mom-g" data-g></div></div>
      <div class="mom-lado mom-dir">
        <p class="mom-p" data-p></p>
        <form class="acesso-campo" data-form novalidate>
          ${modo === 'pin'
            ? `<label class="sr" for="cenaPin">PIN deste aparelho (${n} dígitos)</label>
               <div class="orbes" data-orbes aria-hidden="true">${'<i></i>'.repeat(n)}</div>
               <input id="cenaPin" class="pin-real" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="${n}" enterkeyhint="go">`
            : `<label class="sr" for="cenaLink">Link da central do PC</label>
               <input id="cenaLink" class="link-real" type="url" autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="https://caioaprat.github.io/Jarvis/pc.html#k=…">`}
          <div class="acesso-aviso" data-aviso aria-live="polite"></div>
        </form>
      </div>`;
    const g = host.querySelector('[data-g]'), p = host.querySelector('[data-p]'), form = host.querySelector('[data-form]');
    const campo = host.querySelector('input'), aviso = host.querySelector('[data-aviso]'), orbes = host.querySelector('[data-orbes]');
    let escrito = false, enviando = false;

    function pintar(erro) {
      if (!orbes) return;
      const k = campo.value.length;
      [...orbes.children].forEach((o, i) => { o.className = erro ? 'erro' : i < k ? 'aceso' : ''; });
    }
    function errar(msg) {
      aviso.textContent = msg; aviso.classList.add('erro');
      pintar(true); host.classList.remove('treme'); void host.offsetWidth; host.classList.add('treme');
      setTimeout(() => { campo.value = ''; pintar(false); }, 520);
    }
    function enviar() {
      if (enviando) return;
      if (modo === 'pin') {
        if (op.aoPin && op.aoPin(campo.value)) { aviso.textContent = ''; aviso.classList.remove('erro'); enviando = true; [...(orbes ? orbes.children : [])].forEach(o => { o.className = 'aceso ok'; }); campo.blur(); }
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
      await Escrita.grande(g, T.grande);
      await Escrita.pequeno(p, T.pequeno);
      host.classList.add('pronto');
    }
    function zerar() { escrito = false; host.classList.remove('pronto'); Escrita.zerar(g); Escrita.zerar(p); }
    function focar() { try { campo.focus({ preventScroll: true }); } catch (e) { campo.focus(); } }
    return { escrever, zerar, focar, modo };
  }

  window.LandingAcesso = { montar };
})();
