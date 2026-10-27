'use strict';
/** Chrome de desktop do app (index.html) em telas largas: barra de indicadores, busca Ctrl K e dock inferior. */
window.DesktopJarvo = (() => {
  const larga = () => matchMedia('(min-width:1000px)').matches;
  const reduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const IC = {
    geral: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    clientes: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3 3 0 0 1 0 6M18 14c2 .6 3 2.6 3 6"/>',
    dinheiro: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M15 15h3"/>',
    avisos: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21h4"/>',
    push: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  };
  const svg = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
  let info = null, pal = null, sel = 0;

  function irA(alvo) {
    const smooth = reduz() ? 'auto' : 'smooth';
    if (alvo === 'geral') { if (typeof MV !== 'undefined' && MV && MV.irPara && document.getElementById('jornada')) MV.irPara(0); else scrollTo({top: 0, behavior: smooth}); return; }
    const el = typeof alvo === 'string' ? document.querySelector(alvo) : alvo;
    if (el) el.scrollIntoView({behavior: smooth, block: 'start'});
  }
  function montar() {
    const header = document.querySelector('header'); if (!header || document.getElementById('d-hud')) return;
    const hud = document.createElement('div'); hud.id = 'd-hud'; hud.className = 'd-hud'; header.insertBefore(hud, header.children[1]);
    const busca = document.createElement('button'); busca.type = 'button'; busca.id = 'd-buscar'; busca.className = 'd-buscar'; busca.setAttribute('aria-label', 'Buscar e navegar (Ctrl K)');
    busca.innerHTML = svg('buscar') + '<span>Buscar</span><kbd>Ctrl K</kbd>'; busca.onclick = abrirPaleta; header.insertBefore(busca, document.getElementById('atualizar'));
    const dock = document.createElement('nav'); dock.id = 'd-dock'; dock.className = 'd-dock'; dock.setAttribute('aria-label', 'Seções');
    dock.innerHTML = [['geral', 'Visão geral'], ['clientes', 'Clientes'], ['dinheiro', 'Dinheiro'], ['avisos', 'Avisos'], ['push', 'Notificações']].map(([id, n]) => `<button type="button" data-d="${id}" aria-label="${n}" title="${n}">${svg(id)}<span class="rot">${n}</span></button>`).join('');
    dock.onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; const id = b.dataset.d; irA(id === 'geral' ? 'geral' : id === 'clientes' ? '.desk-l' : id === 'dinheiro' ? '.dinheiro' : id === 'avisos' ? '#avisos-mobile' : '.desk-r1'); };
    document.body.appendChild(dock);
  }
  function atualizar(d) {
    info = d; if (!larga()) return; montar();
    const ativos = d.projetos.filter(p => p.status !== 'pausado'), noAr = ativos.filter(p => p.status === 'ok').length;
    const cor = {ok: 'var(--ok)', erro: 'var(--er)', atencao: 'var(--av)'}[d.sit[0]] || 'var(--tx)';
    document.getElementById('d-hud').innerHTML = `<div><small>Situação</small><b style="color:${cor}">${esc(d.sit[1])}</b></div><div><small>Projetos no ar</small><b>${noAr}/${ativos.length}</b></div><a href="pc.html${window.JarvisDemo?.ativo ? '?demo' : ''}#pedidos" title="Abrir a central do PC"><small>Pedidos abertos</small><b>—</b></a><div><small>Avisos novos</small><b>${d.avisosNovos}</b></div>`;
    // números contando
    if (!reduz() && window.gsap) document.querySelectorAll('.dinheiro .v').forEach(el => {
      const txt = el.textContent, v = parseInt(txt.replace(/[^\d]/g, ''), 10); if (!isFinite(v) || el.dataset.contado === txt) return; el.dataset.contado = txt;
      const sinal = /^[−-]/.test(txt) ? '−' : '', o = {n: 0}; gsap.to(o, {n: v, duration: 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = sinal + 'R$ ' + Math.round(o.n).toLocaleString('pt-BR'); }});
    });
  }
  // ---- busca / navegação (Ctrl K)
  function itens() {
    if (!info) return [];
    const proj = info.projetos.map((p, i) => ({nome: p.nome, dica: 'projeto · ' + (p.status === 'ok' ? 'no ar' : p.status), ir: () => { const j = document.getElementById('jornada'); if (j && scrollY < j.offsetHeight && typeof MV !== 'undefined' && MV.irPara) MV.irPara(i + 2); else irA('#p-' + p.id); }}));
    return [{nome: 'Visão geral', dica: 'seção', ir: () => irA('geral')}, {nome: 'Clientes', dica: 'seção', ir: () => irA('.desk-l')}, {nome: 'Dinheiro', dica: 'seção', ir: () => irA('.dinheiro')}, {nome: 'Avisos', dica: 'seção', ir: () => irA('#avisos-mobile')}, {nome: 'Notificações', dica: 'seção', ir: () => irA('.desk-r1')}, ...proj];
  }
  function fecharPaleta() { if (pal) { pal.remove(); pal = null; document.getElementById('d-buscar')?.focus(); } }
  function abrirPaleta() {
    if (pal || !larga()) return;
    pal = document.createElement('div'); pal.className = 'pal d-pal'; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-label', 'Buscar e navegar');
    pal.innerHTML = '<div class="d-pal-c"><input type="text" id="d-pal-q" placeholder="Ir para… projeto ou seção" autocomplete="off" spellcheck="false" aria-label="Buscar"><ul id="d-pal-l" role="listbox"></ul></div>';
    document.body.appendChild(pal);
    const q = pal.querySelector('input'), ul = pal.querySelector('ul'); let lista = [];
    const desenhar = () => { const t = q.value.trim().toLowerCase(); lista = itens().filter(i => !t || i.nome.toLowerCase().includes(t)); sel = Math.min(sel, Math.max(0, lista.length - 1)); ul.innerHTML = lista.map((i, k) => `<li role="option" aria-selected="${k === sel}" data-k="${k}"><b>${esc(i.nome)}</b><small>${esc(i.dica)}</small></li>`).join('') || '<li class="vazio">Nada encontrado.</li>'; };
    const ir = k => { const i = lista[k]; if (!i) return; fecharPaleta(); i.ir(); };
    q.oninput = () => { sel = 0; desenhar(); };
    q.onkeydown = e => { if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(lista.length - 1, sel + 1); desenhar(); } else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); desenhar(); } else if (e.key === 'Enter') { e.preventDefault(); ir(sel); } };
    ul.onclick = e => { const li = e.target.closest('li[data-k]'); if (li) ir(+li.dataset.k); };
    pal.addEventListener('mousedown', e => { if (e.target === pal) fecharPaleta(); });
    sel = 0; desenhar(); q.focus();
  }
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { if (!larga()) return; e.preventDefault(); pal ? fecharPaleta() : abrirPaleta(); }
    else if (e.key === 'Escape' && pal) { e.preventDefault(); fecharPaleta(); }
  });
  return {atualizar, abrirPaleta};
})();
