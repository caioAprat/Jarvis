'use strict';
/** HTML acessível e independente do canvas; valores vêm do estado da aplicação. */
window.JornadaJarvis = (()=>{
  const esc=t=>String(MapaVivo.limpar(t??'')).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function html(ps,{titulo='Tudo certo',pedidos=0,avisos=0,tarefas=[]}={}){
    const active=ps.filter(p=>p.status!=='pausado'),ok=ps.filter(p=>p.status==='ok').length;
    const section=(name,content,extra='')=>`<section class="viagem-etapa ${extra}" aria-label="${esc(name)}"><div class="viagem-texto">${content}</div></section>`;
    return `<div class="jornada" id="jornada"><div class="viagem-regua" aria-hidden="true">SISTEMAS CONECTADOS <span>01 — ${String(ps.length).padStart(2,'0')}</span></div>`+
      section('Seu universo sob controle',`<p class="viagem-kicker"><span aria-label="Jarvão">${[...'JARVÃO'].map(c=>'<span class="viagem-letra" aria-hidden="true">'+c+'</span>').join('')}</span> / NÚCLEO DE CONTROLE</p><h2>Seu universo.<br><em>Sob controle.</em></h2><p class="viagem-intro">Cada projeto, um mundo.<br>Uma inteligência conectando tudo.</p><a class="viagem-cta" href="#viagem-nucleo">Explore o núcleo <span>↓</span></a>`,'viagem-abertura')+
      section('Situação geral',`<span id="viagem-nucleo"></span><p class="viagem-kicker">01 / O CENTRO DE TUDO</p><h2>${esc(titulo)}</h2><p class="viagem-intro">A energia que mantém<br>seus projetos conectados.</p><p class="viagem-numero"><span data-contar="${ok}">${ok}</span><small> / ${active.length}</small></p><p class="viagem-nota">PROJETOS NO AR</p>`)+
      ps.map((p,i)=>section(p.nome,`<p class="viagem-kicker">${String(i+2).padStart(2,'0')} / ${p.cliente?'SISTEMA DO CLIENTE':'MEU PROJETO'}</p><div class="viagem-status" data-status="${esc(p.status)}">${esc(CenaJarvis.nomes[p.status]||p.status)}</div><h2>${esc(p.nome)}</h2><p class="viagem-intro">${esc(p.detalhe||'Conectado ao núcleo de controle.')}</p>${p.disp7!=null?`<p class="viagem-numero"><span data-contar="${Number(p.disp7)||0}">${Number(p.disp7)||0}</span><small>%</small></p><p class="viagem-nota">DISPONIBILIDADE NOS ÚLTIMOS 7 DIAS</p>`:''}${p.disp30!=null?`<p class="viagem-nota">30 DIAS · ${esc(p.disp30)}% NO AR</p>`:''}<button class="viagem-cta" type="button" data-jornada-projeto="${esc(p.id)}">Explorar projeto <span>↗</span></button>`,'viagem-projeto')).join('')+
      section('Próximos passos',`<p class="viagem-kicker">DE VOLTA AO NÚCLEO</p><h2>O próximo passo<br><em>é seu.</em></h2><div class="viagem-totais"><button data-aba="pedidos"><strong data-contar="${pedidos}">${pedidos}</strong><span>pedidos abertos ↗</span></button><button data-aba="avisos"><strong data-contar="${avisos}">${avisos}</strong><span>avisos novos ↗</span></button></div><p class="viagem-intro">${tarefas.length?tarefas.map(t=>esc(t[1])).join(' · '):'Tudo em órbita. Você pode seguir em frente.'}</p>`,'viagem-final')+'</div>';
  }
  return {html};
})();
