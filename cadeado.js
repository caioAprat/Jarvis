'use strict';
/**
 * JARVÃO · cadeado — PIN local deste aparelho (não é a chave de verdade).
 *
 * A chave real (o link #k=...&u=... que vem pelo Telegram) continua sendo o que autoriza este
 * aparelho a falar com o Jarvão — isso não muda. O cadeado só tranca a TELA depois que a chave
 * já está guardada aqui, pra não precisar colar o link de novo toda vez nem deixar a tela já
 * destravada (ex.: aparelho emprestado) mostrando dado sem pedir nada. Pedido do Caio: um PIN
 * curto, fácil de lembrar, em vez do link — ele sabe que isso é conveniência, não segurança forte
 * (o PIN está no código, visível pra quem abrir a página; a chave real continua escondida).
 *
 * Sem build: carregado por <script> em pc.html e index.html (landing). Não guarda a chave real,
 * só um carimbo de "destravado até quando" neste navegador.
 */
(function () {
  const PIN = '12345678';
  const LS_ATE = 'jarvis.pin.ate';
  const VALIDADE_H = 12;      // depois disso, pede o PIN de novo neste aparelho

  function destravado() { const t = Number(localStorage.getItem(LS_ATE) || 0); return Date.now() < t; }
  function destravar() { try { localStorage.setItem(LS_ATE, String(Date.now() + VALIDADE_H * 36e5)); } catch (e) {} }
  function travar() { try { localStorage.removeItem(LS_ATE); } catch (e) {} }
  /** A conferência do PIN (a mesma de sempre): acertou → destrava por 12 h e devolve true. Usada pela tela antiga e pela cena da narrativa. */
  function tentar(valor) { if (String(valor) === PIN) { destravar(); return true; } return false; }

  if (!document.getElementById('cadeado-css')) {
    const s = document.createElement('style'); s.id = 'cadeado-css';
    s.textContent = `
      .cadeado-tela{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;
        background:rgba(8,7,6,.86);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
      .cadeado-caixa{width:min(320px,100%);border:1px solid var(--linha,rgba(255,170,100,.1));border-radius:14px;padding:26px 24px;
        background:rgba(18,14,11,.7);text-align:center;font-family:var(--disp,"Saira",sans-serif);color:var(--tx,#f6eadb)}
      .cadeado-titulo{font:500 11px var(--mono,ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--di,#9a8670);margin-bottom:4px}
      .cadeado-sub{font-size:13px;color:var(--mu,#b09c86);margin-bottom:16px}
      .cadeado-campo{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--linha,rgba(255,170,100,.1));
        background:var(--card2,#1b1510);color:var(--tx,#f6eadb);font:600 20px var(--mono,ui-monospace,monospace);letter-spacing:.35em;text-align:center}
      .cadeado-campo:focus{outline:2px solid var(--pri,#ff9a4d);outline-offset:2px}
      .cadeado-btn{margin-top:14px;width:100%;min-height:38px;border-radius:10px;border:0;background:var(--pri,#ff9a4d);color:#0b0f17;font-weight:700;font-size:13px;cursor:pointer}
      .cadeado-btn:active{transform:scale(.97)}
      .cadeado-erro{margin-top:10px;color:var(--er,#ff4d5e);font:500 12px var(--mono,ui-monospace,monospace);min-height:1.2em}`;
    document.head.appendChild(s);
  }

  /** Mostra a tela de PIN dentro de `el` (substitui o conteúdo dele). Chama aoEntrar() quando o PIN bate. */
  function pedir(el, aoEntrar) {
    el.innerHTML = `<div class="cadeado-tela"><div class="cadeado-caixa">
      <div class="cadeado-titulo">Jarvão</div>
      <div class="cadeado-sub">Digite o PIN deste aparelho</div>
      <form id="cadeadoForm" autocomplete="off">
        <label class="sr" for="cadeadoPin">PIN</label>
        <input class="cadeado-campo" id="cadeadoPin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="••••••••">
        <button type="submit" class="cadeado-btn">Entrar</button>
      </form>
      <div class="cadeado-erro" id="cadeadoErro" aria-live="polite"></div>
    </div></div>`;
    const campo = el.querySelector('#cadeadoPin'), erro = el.querySelector('#cadeadoErro'), form = el.querySelector('#cadeadoForm');
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (tentar(campo.value)) aoEntrar();
      else { erro.textContent = 'PIN errado.'; campo.value = ''; campo.focus(); }
    });
    setTimeout(() => campo.focus(), 30);
  }

  window.Cadeado = { destravado, destravar, travar, tentar, pedir, tamanho: PIN.length };
})();
