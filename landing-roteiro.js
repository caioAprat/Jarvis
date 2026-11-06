'use strict';
/**
 * JARVÃO · narrativa — UMA história só, no mesmo canvas e na mesma câmera do pc.html:
 *   abertura → (link) → PIN → portal → momentos dos dados reais → projetos (portal por planeta) → anatomia → fecho
 *
 * Mora em #narrativa (fora do #raiz, que o pc.html redesenha a cada atualização). Não valida nada: o
 * link e o PIN são conferidos pelo código de sempre (pc.html colarLink() e Cadeado.tentar()), recebidos em `api`.
 *
 * Trechos (cada um tem sua trilha de rolagem com ScrollTrigger pin/scrub e sua tabela de câmera):
 *   A (antes dos dados)        ola · prototipo · acesso — sem números de dados
 *   B (depois do portal)       núcleo · sete painéis · ponte · clientes · retorno · fecho
 *
 * Parte D4 — câmera determinística; comprimentos em E, órbitas em radianos.
 * Uma CatmullRom centrípeta de posição e outra de alvo em cada lado do PIN.
 * LUT de arco por controle (128 amostras): velocidade uniforme nas viagens;
 * platôs >=60% por cena com parada. Ponte/retorno são viagens sem platô.
 * Pesos de rolagem proporcionais ao comprimento, não ao número de cenas.
 * Câmera: rampa cosseno C1, cruzeiro, pouso (o ease assimétrico .2,0,0,1
 * concentraria a aceleração espacial). Lenis .08 + scrub 1s amortecem o scroll.
 * Reverter o progresso refaz o mesmo arco. Sem filtro XYZ dependente do tempo.
 * F: B0 é a pose corrente do acesso (17E desktop / 22E mobile no platô).
 * Ao liberar, A permanece no mesmo trilho e é reversível; só o resto do platô é encurtado.
 *
 * | Cena | Alvo / texto existente | 1366 dist/alt/órbita/fov | 390 | parada/viagem |
 * | A ola | núcleo / Olá, Caio + data | 20/.12/-.5/36 | 22/.12/-.5/36 | >=60/<=40 |
 * | A prototipo | estrutura / Núcleo · ROLE PARA ENTRAR | 18/.18/-.25/36 | 21/.18/-.25/36 | >=60/<=40 |
 * | A acesso | núcleo / Seu link ou Seu PIN | 17/.12/0/36 | 22/.12/0/36 | >=60/<=40 |
 * | B situacao | núcleo / situação + conferência | 17/.1/.05/36 | 22/.1/.05/36 | 60/40 |
 * | B gabinete | painel Gabinete / disponibilidade e resposta | 4.2/.02/normal/36 | 5.85/.08/normal/36 | 60/40 |
 * | B planilha | painel Planilha / execuções e problemas | 4.2/.02/normal/36 | 5.85/.08/normal/36 | 60/40 |
 * | B assistente | painel Assistente / livre até, conta, status | 4.2/.02/normal/36 | 5.85/.08/normal/36 | 60/40 |
 * | B painel | painel Meu dinheiro / disponibilidade e status | 4.2/.02/normal/36 | 5.85/.08/normal/36 | 60/40 |
 * | B pedalada | painel Pedalada / disponibilidade e status | 4.2/.02/normal/36 | 5.85/.08/normal/36 | 60/40 |
 * | B atrasos | painel Bot / disponibilidade e status | 4.2/.02/normal/36 | 5.85/.08/normal/36 | 60/40 |
 * | B cacador | painel Caçador / disponibilidade e status | 4.2/.02/normal/36 | 5.85/.08/normal/36 | 60/40 |
 * | B ponte | ponte completa até clientes / sem texto | passagem larga | própria | 0/100 |
 * | B planeta | planeta + chegada da ponte / Mundo dos clientes, clientes no ar | 18/.12/.4/36 | 20/.12/.4/36 | 60/40 |
 * | B retorno | ponte de volta / sem texto | passagem larga | própria | 0/100 |
 * | B fecho | conjunto / Buscar, Conferir tudo e dock | 18/.3/-.45/36 | 21/.3/-.45/36 | 60/40 |
 *
 * Avisos/pedidos/base/fios perderam as paradas: não há objeto próprio de dados
 * para avisos/pedidos e a anatomia repetia o núcleo. As métricas seguem na barra.
 * Cada projeto tem sua parada, sem retornar ao centro entre as telas.
 * Theatre é ferramenta das IAs; o Caio só assiste/aprova. Poses no JSON.
 *

 * Sem build: carregado por <script> em pc.html. Não guarda dados nem chaves.
 */
(function () {
  const reduzido = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const PLANO = { 0: { op: 1, bl: 0, sc: 1 }, 1: { op: .55, bl: 1.5, sc: .92 }, 2: { op: .25, bl: 4, sc: .85 } };
  const ESTADO_PALAVRA = { ok: 'Tudo certo', atencao: 'Atenção', erro: 'Problema' };
  const COR_STATUS = { ok: 'var(--ok)', atencao: 'var(--av)', erro: 'var(--er)' };

  //            p      dist   alt   fov  giro   gelo distorção
  const CAM_A = [
    { p: 0,    d: 1.6,  a: .42, f: 40, o: -.3,  g: 0, x: 0 },
    { p: .23,  d: 1.45, a: .38, f: 40, o: -.05, g: 0, x: 0 },
    { p: .45,  d: 1.25, a: .3,  f: 40, o: .4,   g: 0, x: 0 },
    { p: .7,   d: .9,   a: .13, f: 36, o: .05,  g: 0, x: 0 },
    { p: 1,    d: .86,  a: .12, f: 36, o: 0,    g: 0, x: 0 },
  ];
  const CENAS_A = [['ola', 1], ['prototipo', .35], ['acesso', 1.2]];   // protótipo virou só passagem: depois da saudação vem o PIN
  const PROJETOS_CAMERA = ['gabinete', 'planilha', 'assistente', 'painel', 'pedalada', 'atrasos', 'cacador'];
  const CENAS_B = ['situacao', ...PROJETOS_CAMERA, 'ponte', 'planeta', 'retorno', 'fecho'].map(id => [id, 1]);
  const ROTULO = { ola: 'Abertura', prototipo: 'Protótipo', acesso: 'Acesso', situacao: 'Situação', planeta: 'Clientes', fecho: 'Visão geral',
    gabinete:'Gabinete',planilha:'Planilha J Hissnauer',assistente:'Assistente financeiro',painel:'Painel Meu dinheiro',pedalada:'Pedalada do Delei',atrasos:'Bot de atrasos',cacador:'Caçador de clientes',ponte:'Até os clientes',retorno:'De volta ao núcleo' };
  const ESTADO_TXT = { ok: 'no ar', atencao: 'atenção', erro: 'problema', pausado: 'pausado', config: 'configurar', aguardando: 'aguardando' };


  // Saudação do "estagiário" (pedido do Caio, 05/11): informal, com apelido e zoeira, mas sempre lembrando que ele é o dono e o chefe.
  // Sem números de dados antes do PIN. Toda abertura pergunta; uma resposta e a conversa fica visível, travada.
  let saudacaoFeita = null;
  const PERGUNTAS = [
    { q: 'Dormiu bem, chefe?', sim: ['Boa! Patrão descansado é empresa no lucro.', 'Show. Então hoje o senhor tá liberado pra cobrar resultado de mim.'], nao: ['Xii. Vou segurar as pontas hoje, chefe. Só me cobra o essencial.', 'Anotado. Café reforçado e eu não te encho a paciência hoje.'], meio: ['Dormiu meia-boca, então. Hoje eu faço o trabalho pesado, combinado?'] },
    { q: 'Já tomou um café hoje?', sim: ['Aí sim. Agora dá pra encarar o dia, big boss.', 'Cafeína em dia, CEO operante. Bora.'], nao: ['Sem café? Chefe, assim não dá. Vai lá que eu espero.', 'Primeiro o café, depois a empresa. Regra da casa.'], meio: ['Meio café conta. Mas não conta pro RH, hein.'] },
    { q: 'Como tá a faculdade, Caio?', sim: ['Mandando bem, hein. Dono de empresa e ainda estudante exemplar.', 'Orgulho do estagiário aqui, chefe.'], nao: ['Puxado, né? Respira. Os projetos eu seguro por aqui.', 'Calma, patrão. Um dia de cada vez, a faculdade passa.'], meio: ['Vai indo, né? Normal. Qualquer coisa eu te lembro dos prazos.'] },
    { q: 'Qual é a meta de hoje, chefe?', sim: ['Meta registrada. Vou cobrar do senhor no fim do dia, com todo respeito.', 'Gostei. Bora fazer acontecer, chefe.'], nao: ['Sem meta também é meta: dia de manutenção. Eu confiro tudo pra você.'], meio: ['Anotado, chefe. Eu fico de olho pra isso sair do papel.'] },
    { q: 'Muito container rodando na Nautilus hoje?', sim: ['Dia corrido, então. A Planilha da J Hissnauer tá firme aqui, pode ficar tranquilo.', 'Haja container. Aqui no núcleo tá tudo sob controle, chefe.'], nao: ['Dia calmo na Nautilus? Aproveita, patrão, que é raro.'], meio: ['Ritmo normal, então. Melhor assim.'] },
    { q: 'Algum projeto novo na cabeça, chefe?', sim: ['Opa! Quando quiser, a gente transforma isso em ficha e bota a equipe pra rodar.', 'Esse é o meu chefe. Me conta mais depois, que eu já separo um cantinho no núcleo.'], nao: ['Justo. Foco no que já tá rodando, que dá dinheiro.'], meio: ['Ideia meio pronta já é ideia. Guarda que a gente lapida.'] },
    { q: 'Tirou um tempo pra você essa semana?', sim: ['Muito bem. Dono descansado toma decisão melhor.', 'Aprovado pelo estagiário. Continua assim, chefe.'], nao: ['Chefe, assim o senhor quebra. Tira uma tarde, eu seguro tudo aqui.', 'Anotado na sua agenda: descansar. Ordem do estagiário (com todo respeito).'], meio: ['Um pouquinho já ajuda. Mas dá pra mais, hein.'] },
  ];
  function saudacao() {
    if (saudacaoFeita) return saudacaoFeita;
    const d = new Date(), h = d.getHours(), dia = d.getDay();
    const sorteio = (lista) => lista[Math.floor(Math.random() * lista.length)];
    const periodo = h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
    const titulos = {
      madrugada: ['Ainda acordado, chefe?', 'Madrugada, patrão?', 'Insônia, CEO?'],
      manha: ['Bom dia, chefe.', 'Bom dia, patrão.', 'Fala, big boss.', 'Bom dia, Caio.', 'Opa, CEO.'],
      tarde: ['Boa tarde, chefe.', 'Fala, Caio.', 'E aí, patrão.', 'Boa tarde, big boss.'],
      noite: ['Boa noite, chefe.', 'Boa noite, patrão.', 'Fala, Caio.', 'Opa, CEO.'],
    };
    const data = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const frases = [
      'Deixei tudo arrumado por aqui. Só falta o seu PIN pra eu ligar o núcleo.',
      'A Planilha da J Hissnauer e o Gabinete ficaram de olho comigo. Passa o PIN que eu te mostro.',
      'O núcleo tá em espera, aguardando o dono. Digita o PIN e eu acendo tudo.',
      'Tudo desligado e no lugar, do jeito que o senhor deixou. É só o PIN.',
      'Seu estagiário favorito no aguardo. Também sou o único, mas isso é detalhe.',
      'Café passado, sistemas conferidos, chefe. Falta só o senhor dar o ok.',
    ];
    if (h >= 5 && h < 8) frases.push('Chegou cedo hoje, hein? Vou anotar no RH como ponto positivo.');
    if (dia === 1) frases.push('Segunda-feira, chefe. Bora começar a semana com tudo conferido.');
    if (dia === 5) frases.push('Sexta, patrão. Confere os projetos e depois descansa, que o senhor merece.');
    if (dia === 0 || dia === 6) frases.push('Trabalhando no fim de semana? Dono de empresa é assim mesmo, né.');
    if (periodo === 'madrugada') frases.push('Trabalhando até essa hora? Eu seguro as pontas, mas vai dormir, chefe.');
    let ultima = null;
    try {
      ultima = localStorage.getItem('jarvis.saudacao.ultimaPergunta');
    } catch (e) {}
    const pergunta = sorteio(PERGUNTAS.filter(p => p.q !== ultima));
    try { localStorage.setItem('jarvis.saudacao.ultimaPergunta', pergunta.q); } catch (e) {}
    const corpo = data.charAt(0).toUpperCase() + data.slice(1) + ' · ' + sorteio(frases);   // a pergunta vai para a conversa, em linha própria
    return saudacaoFeita = { g: sorteio(titulos[periodo]), p: corpo, pergunta };
  }
  // Resposta do Caio: ele só digita (sem caixa, sem cursor). Cada letra entra decodificando; Enter envia e o estagiário responde.
  function responderComo(perg, texto) {
    const t = ' ' + texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + ' ';
    const tem = (l) => l.some(w => t.includes(' ' + w) || t.includes(w + ' '));
    const NAO = ['nao', 'nem', 'nada', 'mal', 'ruim', 'pessim', 'cansad', 'pouco', 'nunca', 'zero', 'puxad', 'corrid'];
    const MEIO = ['mais ou menos', 'meio', 'medio', 'normal', 'razoavel', 'ok', 'vai indo', 'tanto faz'];
    const SIM = ['sim', 'bem', 'otim', 'top', 'bora', 'claro', 'tranquil', 'de boa', 'ja', 'show', 'demais', 'muito', 'massa', 'bom', 'boa', 'aham', 'uhum', 'isso'];
    const sorteio = (l) => l[Math.floor(Math.random() * l.length)];
    if (tem(MEIO)) return sorteio(perg.meio || perg.sim);
    if (tem(NAO)) return sorteio(perg.nao);
    if (tem(SIM)) return sorteio(perg.sim);
    return sorteio(['Anotado, chefe. Fica entre a gente.', 'Entendido, patrão. Guardei aqui.', 'Justo. O senhor manda.']);
  }
  const GLIFOS_C = '01/\\|<>[]{}=+-_#ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function montarConversa(ola, ehAtiva) {
    const sd = saudacao(); if (!ola) return null;
    // A réplica aumenta o bloco ancorado embaixo no mobile; isso não é rolagem do usuário.
    ola.style.overflowAnchor = 'none';
    const caixa = document.createElement('div'); caixa.className = 'conversa';
    caixa.innerHTML = '<p class="conv-linha conv-pergunta" aria-live="polite"></p><p class="conv-linha conv-caio" aria-live="polite"></p><p class="conv-linha conv-jarvis" aria-live="polite"></p>';
    const alvo = ola.querySelector('.mom-bloco') || ola; alvo.appendChild(caixa);
    const linha = caixa.querySelector('.conv-caio'), resposta = caixa.querySelector('.conv-jarvis');
    let texto = '', respondido = false;
    const timers = new Set();
    const depois = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
    // Teclados virtuais/IME entregam input, não necessariamente keydown com uma letra.
    const entrada = document.createElement('input'); entrada.type = 'text';
    entrada.setAttribute('aria-label', 'Conversa com Jarvis'); entrada.autocomplete = 'off';
    entrada.setAttribute('autocapitalize', 'off'); entrada.spellcheck = false; entrada.maxLength = 90;
    entrada.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;caret-color:transparent;pointer-events:none;font-size:16px;border:0';
    caixa.appendChild(entrada);
    const decodificar = (el, ch, dur) => {
      const sp = document.createElement('span'); sp.textContent = ch; el.appendChild(sp);
      if (window.gsap && window.ScrambleTextPlugin && ch.trim() && !matchMedia('(prefers-reduced-motion: reduce)').matches)
        gsap.fromTo(sp, { scrambleText: { text: GLIFOS_C[Math.floor(Math.random() * GLIFOS_C.length)], chars: GLIFOS_C } }, { duration: dur, scrambleText: { text: ch, chars: GLIFOS_C, speed: 1 }, ease: 'none' });
      // A digitação não pode ficar esperando o ticker do 3D para resolver o glifo.
      if (dur === .08) setTimeout(() => { if (!sp.isConnected) return; if (window.gsap) gsap.killTweensOf(sp); sp.textContent = ch; }, 80);
    };
    const falar = (frase, el) => { el = el || resposta; el.textContent = ''; [...frase].forEach((ch, i) => depois(() => decodificar(el, ch, .12), i * 12)); };
    if (sd.pergunta) falar(sd.pergunta.q, caixa.querySelector('.conv-pergunta'));   // o estagiário pergunta numa fala própria
    function campoVisivel(foco) {
      if (!foco || foco === entrada || !foco.matches('input,textarea,select,[contenteditable="true"]')) return false;
      const cenaFoco = foco.closest('.narr-cena,.narr-texto-camada');
      return !(cenaFoco && (+getComputedStyle(cenaFoco).opacity < .5 || cenaFoco.getAttribute('aria-hidden') === 'true'));
    }
    function atualizarTexto(valor) {
      if (respondido) return;
      valor = valor.slice(0, 90);
      let iguais = 0; while (iguais < texto.length && iguais < valor.length && texto[iguais] === valor[iguais]) iguais++;
      while (linha.childNodes.length > iguais) { const sp = linha.lastChild; if (window.gsap) gsap.killTweensOf(sp); sp.remove(); }
      for (const ch of valor.slice(iguais)) decodificar(linha, ch, .08);
      texto = valor; entrada.value = texto; caixa.classList.toggle('digitando', !!texto);
    }
    function enviarResposta() {
      if (respondido || !texto.trim()) return;
      respondido = true; entrada.readOnly = true; entrada.blur(); caixa.classList.add('enviada');
      depois(() => falar(responderComo(sd.pergunta, texto)), 350);
    }
    function receberEntrada() {
      if (respondido || !ehAtiva()) { entrada.value = texto; entrada.blur(); return; }
      atualizarTexto(entrada.value);
    }
    function tocar(ev) {
      if (respondido || !ehAtiva() || campoVisivel(ev.target) || ev.target.closest('button,a')) return;
      entrada.focus({ preventScroll: true });
    }
    entrada.addEventListener('input', receberEntrada);
    entrada.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.isComposing) ev.preventDefault(); });
    addEventListener('click', tocar);
    function tecla(ev) {
      if (respondido || !ehAtiva() || ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing) return;
      const foco = document.activeElement;
      if (campoVisivel(foco)) return;
      if (foco !== entrada && foco && foco.matches('input')) foco.blur();
      if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); enviarResposta(); return; }
      if (ev.key === 'Backspace') { ev.preventDefault(); atualizarTexto(texto.slice(0, -1)); return; }
      if (ev.key.length !== 1 || texto.length >= 90) return;
      ev.preventDefault(); atualizarTexto(texto + ev.key);
    }
    addEventListener('keydown', tecla, true);
    if (ehAtiva() && !matchMedia('(pointer: coarse)').matches && !campoVisivel(document.activeElement)) entrada.focus({preventScroll:true});
    return { ativa: () => ehAtiva(), focar() { if (!respondido && ehAtiva() && !matchMedia('(pointer: coarse)').matches) entrada.focus({preventScroll:true}); }, destruir() { timers.forEach(clearTimeout); removeEventListener('keydown', tecla, true); removeEventListener('click', tocar); caixa.remove(); } };
  }

  const CSS_CONVERSA = `
  .conversa{margin-top:14px;font:400 14px/1.6 var(--mono);max-width:min(440px,34vw)}
  .conv-caio{color:var(--tx)}
  .conv-linha:not(:empty)::before{content:'— ';color:var(--pri);opacity:.7}
  .conv-pergunta{margin:0;color:var(--pri)}
  .conv-caio{margin:6px 0 0}
  .conversa.enviada .conv-caio{color:var(--mu)}
  .conv-jarvis{margin:6px 0 0;color:var(--pri)}
  .conv-jarvis:empty{display:none}
  .conversa span{white-space:pre-wrap}
  @media(max-width:700px){.conversa{max-width:none;font-size:13px}}
  `;
  const CSS = `
  html.lenis,html.lenis body{height:auto}
  .lenis.lenis-smooth{scroll-behavior:auto!important}
  .lenis.lenis-stopped{overflow:hidden}
  .lenis.lenis-smooth iframe{pointer-events:none}
  #narrativa{position:relative;z-index:2;pointer-events:none}
  .narr-trilho{position:relative;pointer-events:none}
  .narr-fix{position:sticky;top:0;height:100vh;min-height:520px;overflow:hidden;pointer-events:none}
  :is(.narr-cena,.narr-texto-camada){position:absolute;inset:0;display:grid;grid-template-columns:1fr minmax(140px,24vw) 1fr;align-items:center;padding:0 clamp(64px,7vw,104px) 0 clamp(18px,4.5vw,64px);opacity:0;will-change:opacity,filter,transform}
  :is(.narr-cena,.narr-texto-camada) .mom-esq{grid-column:1;grid-row:1;justify-self:start;min-width:0}
  :is(.narr-cena,.narr-texto-camada) .mom-dir{grid-column:3;grid-row:1;justify-self:end;max-width:360px;min-width:0}
  :is(.narr-cena,.narr-texto-camada).inv .mom-esq{grid-column:3;justify-self:end;text-align:right}
  :is(.narr-cena,.narr-texto-camada).inv .mom-dir{grid-column:1;justify-self:start}
  .mom-g,.mom-g.medio{font:500 clamp(40px,5.271vw,72px)/1.08 'JetBrains Mono',var(--mono);letter-spacing:-.02em;text-transform:none;font-variant-numeric:tabular-nums;color:var(--tx);white-space:normal;overflow-wrap:normal;word-break:normal;hyphens:none;text-wrap:balance;text-shadow:0 0 8px #000;margin:12px 0 18px;overflow:hidden}
  .mom-p{font:400 14px/1.55 'JetBrains Mono',var(--mono);color:var(--mu);text-shadow:0 0 8px #000;margin:0;min-height:1.55em}
  .mom-rotulo{font:400 11px/1.5 'JetBrains Mono',var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--mu)}
  .narr-cena[data-cena="prototipo"] .mom-bloco{display:none}   /* protótipo virou só passagem: sem rótulo solto */
  .mom-bloco{position:absolute;width:min(400px,34vw);left:32px;top:42%;text-align:left}
  .mom-bloco .mom-p{max-width:52ch}
  .mom-g .esc-vis{opacity:1}
  @media(max-width:700px){.mom-bloco{left:18px!important;top:auto;bottom:116px;width:calc(100% - 36px)}.mom-g,.mom-g.medio{font-size:40px;margin:10px 0 14px}.mom-p{font-size:13px;line-height:1.5}}
  .mom-tela{display:block;width:min(220px,100%);height:58px;margin-top:16px;opacity:0;transition:opacity .4s}
  :is(.narr-cena,.narr-texto-camada).pronto .mom-tela{opacity:1}
  .acesso-campo{pointer-events:auto;position:relative;margin-top:22px;width:max-content;max-width:100%}
  .orbes{display:flex;gap:13px;padding:6px 2px}
  .orbes i{width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,170,100,.45);transition:background-color .15s,box-shadow .15s,transform .15s cubic-bezier(.2,0,0,1)}
  .orbes i.aceso{background:var(--pri);box-shadow:0 0 12px #ff8a3d;transform:scale(1.1)}
  .orbes i.erro{background:var(--er);box-shadow:0 0 10px #ff4d5e}
  .acesso-campo:focus-within .orbes{outline:2px solid var(--pri);outline-offset:8px;border-radius:999px}
  .pin-real{position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:16px;cursor:text;border:0}
  .link-real{display:block;width:min(360px,80vw);background:none;border:0;border-bottom:1px solid rgba(255,170,100,.4);color:var(--tx);font:500 13px var(--mono);padding:9px 0;outline:none}
  .link-real:focus{border-bottom-color:var(--pri)}
  .acesso-aviso{min-height:1.5em;margin-top:12px;font:500 11.5px var(--mono);letter-spacing:.08em;color:var(--di)}
  .acesso-aviso:empty{display:none}
  .acesso-aviso.erro{color:var(--er)}
  .treme .acesso-campo{animation:treme .4s}
  @keyframes treme{20%{transform:translateX(-6px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
  .ir-direto{position:fixed;z-index:36;top:18px;right:20px;pointer-events:auto;display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:8px 12px;border-radius:10px;
    font:500 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mu);box-shadow:inset 0 0 0 1px var(--linha);background:rgba(8,7,6,.55);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:color .15s}
  .ir-direto:hover{color:var(--tx)} .ir-direto kbd{font-size:10px}
  body.narr-b .ir-direto{display:none}
  .proj-sair{pointer-events:auto;margin-top:18px;font:500 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mu);box-shadow:inset 0 0 0 1px var(--linha);border-radius:10px;padding:9px 12px;min-height:36px}
  .proj-sair:hover{color:var(--tx)}
  body.narr-on .mv-fundo .mv-nucleo{opacity:0}
  body.narr-sem-rotulos .mv-fundo .mv-hud{opacity:0;transition:opacity .4s}
  body.narr-b #raiz .barra{position:fixed;top:0;left:0;right:0;margin:0;background:rgba(8,7,6,.55);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 1px 0 var(--linha);padding:10px 32px}
  body.narr-b #raiz .barra .marca{transform:scale(.7)}
  body.narr-b:not(.momentos-vistos) .hud-c{opacity:0;pointer-events:none}
  @media (max-width:700px){
    :is(.narr-cena,.narr-texto-camada){grid-template-columns:1fr;grid-template-rows:auto 1fr auto;align-items:start;padding:84px 18px 116px}
    :is(.narr-cena,.narr-texto-camada) .mom-esq,:is(.narr-cena,.narr-texto-camada).inv .mom-esq{grid-column:1;grid-row:1;justify-self:start;text-align:left}
    :is(.narr-cena,.narr-texto-camada) .mom-dir,:is(.narr-cena,.narr-texto-camada).inv .mom-dir{grid-column:1;grid-row:3;justify-self:start;align-self:end}
    .mom-g,:is(.narr-cena,.narr-texto-camada).inv .mom-g{-webkit-mask-image:none;mask-image:none}
    .ir-direto{top:12px;right:12px}
    body.narr-b #raiz .barra{padding:8px 18px}
  }
  .narr-estatico .narr-fix{position:relative;height:auto;min-height:0;overflow:visible}
  .narr-estatico :is(.narr-cena,.narr-texto-camada){position:relative;inset:auto;opacity:1 !important;filter:none !important;transform:none !important;min-height:62vh}
  .narr-estatico .narr-trilho{height:auto !important}`;

  function janela(p, ini, fim, m) {
    m = m || .014;
    if (ini <= 0 && p <= fim - m) return 1;            // a primeira cena já nasce inteira no topo
    if (fim >= 1 && p >= ini + m) return 1;            // a última fica inteira até o fim
    if (p < ini - m || p > fim + m) return 0;
    if (p < ini + m) return Math.max(0, Math.min(1, (p - (ini - m)) / (2 * m)));
    if (p > fim - m) return Math.max(0, Math.min(1, ((fim + m) - p) / (2 * m)));
    return 1;
  }
  /** Regra dos três planos: muda UM conjunto por vez, em .5 s (opacidade, desfoque e escala). */
  function aplicarPlano(c, n) {
    if (c.plano === n) return;
    c.plano = n;
    const a = PLANO[n];
    if (reduzido || !window.gsap) { c.pl.op = 1; return; }
    gsap.to(c.el, { filter: 'blur(' + a.bl + 'px)', scale: a.sc, duration: .5, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(c.pl, { op: a.op, duration: .5, ease: 'power2.out', overwrite: 'auto', onUpdate: () => { c.el.style.opacity = String(c.jan * c.pl.op); } });
  }
  function intervalos(lista) {
    const soma = lista.reduce((s, x) => s + x[1], 0); let acc = 0;
    return lista.map(([id, w]) => { const ini = acc / soma; acc += w; return { id, ini, fim: acc / soma }; });
  }
  const real = (v) => v == null ? '—' : 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const dm = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? m[3] + '/' + m[2] : ''; };

  /**
   * op: { host, mapa, api: { acesso()->'link'|'pin'|'livre', aoLink(t)->bool, aoPin(v)->bool, dados()->{P, fin},
   *        ha(iso)->'há X min', abrirPainel(id), aoEntrar(), aoTerminar() } }
   */
  function montar(op) {
    // Cada abertura começa pela saudação, inclusive após recarregar no PIN.
    history.scrollRestoration = 'manual';
    // ScrollTrigger também guarda esse modo e o restaura nos refreshes.
    if (window.ScrollTrigger) ScrollTrigger.clearScrollMemory('manual');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.getElementById('narr-css') == null) { const s = document.createElement('style'); s.id = 'narr-css'; s.textContent = CSS + CSS_CONVERSA; document.head.appendChild(s); }
    const host = op.host, mapa = op.mapa, api = op.api;
    const cine = window.LandingCinema && mapa ? LandingCinema.criar(mapa, reduzido, CAM_A) : null;   // as chaves de verdade vêm de chavesA()/chavesB(), montadas sobre o protótipo
    const passe = cine ? cine.passe() : null;
    const leve = innerWidth < 700, dep = mapa ? mapa.depurar() : null, E = dep ? dep.escala : 2.6;
    let particulas = null;
    if (mapa && window.LandingParticulas) {
      particulas = LandingParticulas.montar(dep.scene, { leve, camera: dep.camera, escala: E, renderer: dep.renderer });
    }
    // v5: protótipo do Jarvão + fios + telas vivas + planeta tech + fundo que muda + chamadas + navegação numerada
    let trecho = 'A', ativa = true;
    const D0 = api.dados() || {}, P0 = D0.P;
    const listaInicial = api.acesso() === 'livre' && P0 ? P0.estado.projetos : Array.from({ length: P0 ? P0.estado.projetos.length : 7 }, (_, i) => ({ id: 'm' + i, status: 'aguardando' }));
    const proto = mapa && window.Prototipo ? Prototipo.montar(mapa, { projetos: listaInicial, leve }) : null;
    const fios = proto && window.Fios ? Fios.montar(mapa, proto, { leve }) : null;
    const telas = proto && window.TelasVivas ? TelasVivas.criar(proto, { dados: api.dados, liberado: () => (trecho === 'B' || !!portalDados) && api.acesso() === 'livre', camera: () => dep.camera, qualidade: () => mapa.qualidade() }) : null;
    // Antes do PIN o núcleo fica quase morto: brilho baixo e um tremor irregular, como lâmpada fraca. Só a ignição o acende.
    const MORTO = .16;
    const ign = !reduzido && mapa && window.Ignicao ? Ignicao.criar(mapa, { E, pisoY: -3.2 * E, centro: () => new THREE.Vector3(0, 0, 0) }) : null;
    if (window.JarvisPreviewLocal) window.__ign = ign;
    // Geometria/material preparados antes do PIN; progresso zero mantém o campo oculto.
    let campo = !reduzido && mapa && window.Ignicao && Ignicao.campo ? Ignicao.campo(mapa, { E }) : null;
    const malhaVeias = mapa && window.Veias ? Veias.criar(mapa.depurar().scene, { E, pisoY: -3.2 * E }) : null;
    if (malhaVeias && mapa.aoQuadro) mapa.aoQuadro(() => { malhaVeias.quadro(); if (trecho === 'B' && !portalDados) { malhaVeias.acender(1.08); malhaVeias.pulso(.35); malhaVeias.carga(-1); } });
    // G2 (Caio, 05/11): depois da saudação o núcleo está TOTALMENTE desligado (quase sem luz, parado). Cada dígito do PIN
    // acende um pouco (luz e giro); só a ignição o deixa 100% vivo.
    let digitos = 0, acesoSuave = 0;
    const tirarMorto = mapa && mapa.aoQuadro ? mapa.aoQuadro(d => {
      if (!ativa || trecho !== 'A' || portalDados) { if (mapa.vida && trecho === 'B' && !portalDados) mapa.vida(1); return; }
      acesoSuave += ((digitos / 8) - acesoSuave) * Math.min(1, d * 6);
      mapa.energia(.03 + .2 * acesoSuave);
      if (mapa.vida) mapa.vida(reduzido ? 0 : .02 + .3 * acesoSuave);
    }) : null;
    const planeta = mapa && window.Planeta ? Planeta.montar(mapa, { posicao: new THREE.Vector3(-17 * E, 2.2 * E, -15 * E), raio: 2.6 * E, leve }) : null;
    const veias = mapa && window.VeiasCenario ? VeiasCenario.montar(mapa, planeta, { leve }) : null;
    const fundo = window.Fundo ? Fundo.montar(mapa, { particulas, chao: -3.2 * E }) : null;
    const rotulos = proto && window.RotulosLayout ? RotulosLayout.montar({ camera: () => dep.camera, proto, planeta, E }) : null;
    const chamadas = mapa && window.Chamadas ? Chamadas.montar({ camera: () => dep.camera, nucleoRaio: () => 2.1 * E, layout: rotulos }) : null;
    const nav = window.NavCenas ? NavCenas.montar() : null;
    if (mapa) { mapa.orbitas(false); mapa.ambienteEmCamadas(true); }
    // Three r128 compila também os materiais dos monitores ainda ocultos.
    // Evita bloquear a primeira renderização da ignição esperando o shader na GPU.
    if (dep) dep.renderer.compile(dep.scene, dep.camera);
    // ao sair/recarregar: devolve a memória de vídeo na hora (GPU integrada não recupera a tempo e a próxima carga fica a 1 quadro/s)
    addEventListener('pagehide', () => { try { if (dep && dep.renderer) { dep.renderer.dispose(); dep.renderer.forceContextLoss(); } } catch (e) {} });
    const intro = { v: reduzido ? 1 : 0 };                       // os fios do chão acendem sozinhos na chegada
    if (!reduzido && window.gsap) gsap.to(intro, { v: 1, duration: 3.2, delay: .6, ease: 'power1.inOut', onUpdate: () => { if (trecho === 'A' && atual.p < .05) aplicar(atual.p); } });
    let quadroNarrativa = null;
    if (mapa && window.gsap) {
      let t = 0, tp = 0, u = performance.now();
      gsap.ticker.add(quadroNarrativa = () => {
        if (!ativa || document.hidden) { u = performance.now(); return; }
        const n = performance.now(), d = Math.min(.05, (n - u) / 1000); u = n; t += reduzido ? 0 : d; tp += reduzido ? 0 : d * (fundo ? fundo.velocidade() : 1) * (portalDados ? (portalDados.tempo()<2.8?.35:1+1.2*Math.exp(-(portalDados.tempo()-2.8)*1.2)) : trecho==='A'&&atual.p>=cena('acesso').ini?.2:1);
        if (particulas) particulas.quadro(tp, d, Object.assign({ p: atual.p }, camAtual));
        if (portalDados && !reduzido && particulas) {
          // Na ignição a poeira é empurrada para FORA (sopro do núcleo ligando) e volta devagar; nada é sugado para dentro.
          const t = portalDados.tempo(), sopro = t < 2.8 ? 0 : Math.exp(-(t - 2.8) * 1.4) * (1 - Math.exp(-(t - 2.8) * 14));
          particulas.grupos.forEach(g => { const points = g.userData.pontos; if (points) { points.scale.x *= 1 + .22 * sopro; points.scale.y *= 1 + .22 * sopro; points.scale.z *= 1 + .22 * sopro; } });
        }
        if (proto) proto.quadro(t, reduzido ? 0 : d * (trecho === 'A' && !portalDados ? .05 + .35 * acesoSuave : 1));
        if (fios) fios.quadro(t, reduzido ? 0 : d);
        if (telas) telas.quadro(t, d);
        if (planeta) planeta.quadro(t, reduzido ? 0 : d);
        if (veias) veias.quadro(t, d);
        if (rotulos) rotulos.quadro(host);
        if (chamadas) chamadas.quadro();
      });
    }
    // clique/toque numa tela de módulo → portal → painel lateral do projeto
    addEventListener('pointerdown', (ev) => {
      if (window.editarCamera && ev.composedPath().some(el => el.id === 'theatrejs-studio-root')) return;
      if (!ativa || trecho !== 'B' || projeto || !proto || (ev.target.closest && ev.target.closest('button,a,input,.dock,.barra,.pal,.painel-sel'))) return;
      const id = proto.telaEm((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
      if (id && !/^m[0-9]+$/.test(id)) entrarProjeto(id);
    });
    const ir = document.createElement('button'); ir.type = 'button'; ir.className = 'ir-direto'; ir.innerHTML = 'Ir direto <kbd>D</kbd>'; ir.setAttribute('aria-label', 'Ir direto aos dados (tecla D)');
    ir.addEventListener('click', () => irDireto()); document.body.appendChild(ir);
    document.body.classList.add('narr-on', 'narr-sem-rotulos');

    let cenas = [], trigger = null, emPortal = false, projeto = null, voando = false, pulso = { v: 0 };
    const alvo = { p: 0 }, atual = { p: 0 }; let girando = false;
    let acesso = null, modoAcesso = '', conversa = null;
    let camAtual = { dist: 1, alt: .34, fov: 40, orbita: 0 };
    const porCamera = (c) => { camAtual = c; if (mapa) mapa.cinema(c); };
    // D3: um único relógio de rolagem; toque conserva a rolagem nativa.
    const lenis = !reduzido && window.Lenis && !matchMedia('(pointer: coarse)').matches
      ? new Lenis({lerp: .08, wheelMultiplier: .9, syncTouch: false,
        prevent: el => !!el.closest('.painel-sel,.pal,#theatrejs-studio-root')}) : null;
    const quadroLenis = t => lenis.raf(t * 1000);
    if (lenis) {
      lenis.on('scroll', l=>{
        ScrollTrigger.update();
        // Utiliza a posição fracionária do Lenis: o scroll DOM arredonda pixels.
        if(passeioAutomatico && trigger){alvo.p=atual.p=(l.animatedScroll-trigger.start)/(trigger.end-trigger.start);aplicar(atual.p);}
      });
      // O scroll atualiza a pose antes do render, evitando um quadro de atraso.
      gsap.ticker.add(quadroLenis,false,true);
    }
    let movimento = null, sheetCamera = null, passeioAutomatico = false;
    const objetosCamera = new Map(), desinscreverCamera = [];
    const perfilCamera = leve ? 'Mobile' : 'Desktop';
    const posicaoPose = v => {
      const d = v.d * camZ();
      return new THREE.Vector3(v.cx + Math.sin(v.o)*d, v.cy + d*v.a, v.cz + Math.cos(v.o)*d);
    };
    // D4: a câmera é função pura do progresso. Lenis + scrub já amortecem
    // a rolagem; filtrar XYZ depois disso cortava curvas e impedia o caminho inverso.
    function solicitarCamera(v) {
      porCamera({dist:v.d,alt:v.a,orbita:v.o,fov:v.f,cx:v.cx,cy:v.cy,cz:v.cz});
    }
    function objetoCamera(id, v) {
      if (!sheetCamera) return null;
      const nome = perfilCamera + '/' + id;
      if (!objetosCamera.has(nome)) {
        const p = posicaoPose(v), config = {position: {x:p.x/E,y:p.y/E,z:p.z/E}, target: {x:v.cx/E,y:v.cy/E,z:v.cz/E}, fov:v.f};
        const obj = sheetCamera.object(nome, config);
        objetosCamera.set(nome, obj);
        let primeiraEmissao = true;
        desinscreverCamera.push(obj.onValuesChange(() => {
          if (primeiraEmissao) { primeiraEmissao=false; return; }
          cacheCurva = null; if (ativa && !emPortal) aplicar(atual.p);
        }));
      }
      return objetosCamera.get(nome);
    }
    if (window.cameraEstadoPronto && window.Theatre) {
      window.cameraEstadoPronto.then(async state => {
        if (!ativa) return;
        if (window.editarCamera) await Theatre.studio.initialize();
        const project = Theatre.core.getProject('Jarvao Camera', {state});
        await project.ready;
        if (!ativa) return;
        sheetCamera = project.sheet('Camera');
        // B só é registrado depois de sincronizar os módulos com os projetos reais.
        // Antes do PIN, os monitores são placeholders sem os IDs dos projetos.
        prepararCurva(chavesA(), 'A');
        if (trecho === 'B') prepararCurva(chavesB(), 'B');
        cacheCurva = null;
        if (window.editarCamera) window.cameraEditor = {project, sheet:sheetCamera, parada: nome => objetosCamera.get(nome),
          exportar: () => {
            const state = JSON.parse(JSON.stringify(Theatre.studio.createContentOfSaveFile('Jarvao Camera')));
            const camera = state.sheetsById.Camera || (state.sheetsById.Camera = {staticOverrides:{byObject:{}}});
            camera.staticOverrides = camera.staticOverrides || {byObject:{}};
            objetosCamera.forEach((obj,nome) => { camera.staticOverrides.byObject[nome.split('/').map(s=>s.trim()).join(' / ')] = obj.value; });
            return state;
          }};
        aplicar(atual.p);
      }).catch(e => console.warn('Câmera: estado Theatre indisponível; roteiro D4 mantido.', e));
    }
    const mob = leve ? 1.85 : 1;                                   // tela alta e estreita: a câmera recua
    const camZ = () => (mapa && mapa.depurar().camZ) || 28;
    const K = (p, dw, a, f, o, c) => ({ p, d: dw * mob / camZ(), a, f, o, g: 0, x: 0, cx: c ? c.x : 0, cy: c ? c.y : 0, cz: c ? c.z : 0 });
    // Parte D: 40% viagem + 60% parada por alvo; distâncias em E.
    function pose(d, a, o, c, f = 36) {
      return K(0, d * E / mob, a, f, o, c || {x:0,y:0,z:0});
    }
    function painel(id) {
      const m = proto && proto.modulos.find(m => m.id === id);
      if (!m) return pose(17, .12, 0);
      m.g.updateWorldMatrix(true, false);
      const c = m.g.getWorldPosition(new THREE.Vector3());
      // A oscilação visual do monitor não pode reescrever a trilha ao atualizar dados.
      c.y=m.y;
      const n = new THREE.Vector3(0,0,1).transformDirection(m.g.matrixWorld);
      if (leve) c.y -= .4 * E;
      return pose(leve ? 5.85 : 4.2, leve ? .08 : .02, Math.atan2(n.x,n.z), c);
    }
    function paradasA() {
      return [pose(leve?22:20,.12,-.5,{x:0,y:leve?-.8*E:0,z:0}),
        pose(leve?21:18,.18,-.25,{x:0,y:(leve?-.8:.6)*E,z:0}),
        pose(leve?22:17,.12,0,{x:0,y:leve?-.8*E:0,z:0})];
    }
    function paradasB() {
      const pl = planeta.posicao, alvoPl=pl.clone();
      if(leve)alvoPl.y-=.7*E;
      return [pose(leve?22:17,.1,.05,{x:0,y:leve?-.8*E:0,z:0}),
        ...PROJETOS_CAMERA.map(painel),
        // Ponte e retorno são viagens, não paradas. Vistas largas intercaladas
        // seguem o corredor da ponte, fora da gaiola e dos painéis.
        pose(leve?27:22,.2,-.75,{x:pl.x*.5,y:pl.y*.5-(leve?2*E:0),z:pl.z*.5},40),
        pose(leve?20:18,.12,.4,alvoPl),
        pose(leve?27:22,.22,-.75,{x:pl.x*.5,y:pl.y*.5-(leve?2*E:0),z:pl.z*.5},40),
        pose(leve?21:18,.3,-.45,{x:leve?0:-2*E,y:(leve?-.6:0)*E,z:leve?0:-2*E},36)];
    }
    function trilha(lista, poses, inicial) {
      const controles=[{v:inicial,scene:-1}];
      poses.forEach((v,i)=>{
        const prev=controles[controles.length-1].v;
        // Um controle intermediário mantém a órbita do lado de fora dos monitores.
        if(PROJETOS_CAMERA.includes(lista[i][0]) && PROJETOS_CAMERA.includes(lista[i-1]?.[0])){
          const a=posicaoPose(prev),b=posicaoPose(v),ra=Math.hypot(a.x,a.z),rb=Math.hypot(b.x,b.z);
          let angA=Math.atan2(a.x,a.z),angB=Math.atan2(b.x,b.z);
          while(angB>angA)angB-=Math.PI*2;
          const ang=(angA+angB)/2,r=(ra+rb)/2;
          const c=new THREE.Vector3((prev.cx+v.cx)/2,(prev.cy+v.cy)/2,(prev.cz+v.cz)/2);
          const pos=new THREE.Vector3(Math.sin(ang)*r,(a.y+b.y)/2,Math.cos(ang)*r),delta=pos.clone().sub(c),d=Math.hypot(delta.x,delta.z);
          controles.push({v:pose(d/E,delta.y/d,Math.atan2(delta.x,delta.z),c),scene:i,passagem:true});
        }
        if(lista[i][0]==='ponte'){
          controles.push({v:pose(leve?26:21,.15,-.8,{x:0,y:leve?-2*E:0,z:0},40),scene:i,passagem:true});
        }
        controles.push({v,scene:i,passagem:['ponte','retorno'].includes(lista[i][0])});
      });
      const curve=new THREE.CatmullRomCurve3(controles.map(c=>posicaoPose(c.v)),false,'centripetal');
      // Mede cada arco, não a distância reta nem o número da cena.
      const lengths=[0];
      for(let i=1;i<controles.length;i++){
        let length=0,last=curve.getPoint((i-1)/(controles.length-1));
        for(let j=1;j<=64;j++){const q=curve.getPoint((i-1+j/64)/(controles.length-1));length+=q.distanceTo(last);last=q;}
        lengths.push(length);
      }
      const voyages=lista.map((_,i)=>controles.reduce((sum,c,j)=>sum+(c.scene===i?lengths[j]:0),0)/(9*E));
      const holds=lista.map(([id],i)=>['ponte','retorno'].includes(id)?0:Math.max(.65,voyages[i]*1.5));
      lista.forEach((c,i)=>c[1]=voyages[i]+holds[i]);
      const total=lista.reduce((sum,c)=>sum+c[1],0),L=[Object.assign({},inicial,{p:0,id:'Chegada'})];
      let time=0;
      controles.slice(1).forEach((c,j)=>{
        const i=c.scene;time+=lengths[j+1]/(9*E);
        const id=c.passagem?'Via-'+i+'-'+j:lista[i][0];
        L.push(Object.assign({},c.v,{p:time/total,id,passagem:c.passagem}));
        if(!c.passagem){time+=holds[i];L.push(Object.assign({},c.v,{p:time/total,id}));}
      });
      return L;
    }
    function chavesA() { const ps=paradasA();return trilha(CENAS_A,ps,pose(leve?28:26,.24,-.65,{x:0,y:leve?-1.7*E:0,z:0},40)); }
    function chavesB() {
      // F: a chegada é a própria pose do acesso; as demais poses da D permanecem.
      return trilha(CENAS_B,paradasB(),chegadaB || paradasA()[2]);
    }
    // Curvas espaciais únicas por trecho; platôs mantêm os 60% de parada da D2.
    // A curva centrípeta evita laços nas chaves de passagem e nos closes.
    let cacheCurva = null, curvaA = null, curvaB = null, chavesOriginaisA = null, chavesOriginaisB = null;
    let fracaoA = 0, corteA = 1, chegadaB = null;
    function prepararCurva(ks, parte) {
      const pontos=[];
      ks.forEach((v,i)=>{
        if(i && ks[i-1].id===v.id){pontos[pontos.length-1].fim=v.p;return;}
        const obj=objetoCamera(parte+'/'+v.id,v),valor=parte==='B'&&v.id==='Chegada'&&chegadaB?null:obj&&obj.value;
        pontos.push({ini:v.p,fim:v.p,v,position:valor?new THREE.Vector3(valor.position.x,valor.position.y,valor.position.z).multiplyScalar(E):posicaoPose(v),
          target:valor?new THREE.Vector3(valor.target.x,valor.target.y,valor.target.z).multiplyScalar(E):new THREE.Vector3(v.cx,v.cy,v.cz),fov:valor?valor.fov:v.f});
      });
      const position=new THREE.CatmullRomCurve3(pontos.map(p=>p.position),false,'centripetal');
      const target=new THREE.CatmullRomCurve3(pontos.map(p=>p.target),false,'centripetal');
      // LUT por trecho da MESMA curva: amostras de distância de arco na posição.
      // O alvo usa o mesmo parâmetro, preservando a correlação entre olhar e caminho.
      const arcos=[];
      for(let i=1;i<pontos.length;i++){
        const lut=[0];let last=position.getPoint((i-1)/(pontos.length-1));
        for(let j=1;j<=128;j++){const q=position.getPoint((i-1+j/128)/(pontos.length-1));lut.push(lut[j-1]+q.distanceTo(last));last=q;}
        arcos.push(lut);
      }
      return {ks,pontos,position,target,arcos};
    }
    function cameraEm(p) {
      let ks=cine.chaves(), parte=trecho;
      if(trecho==='B' && fracaoA){
        if(p<=fracaoA){p=p/fracaoA*corteA;ks=chavesOriginaisA;parte='A';cacheCurva=curvaA;}
        else {p=(p-fracaoA)/(1-fracaoA);ks=chavesOriginaisB;cacheCurva=curvaB;}
      }
      if(!cacheCurva || cacheCurva.ks!==ks)cacheCurva=prepararCurva(ks,parte);
      if(trecho==='B' && fracaoA){if(parte==='A')curvaA=cacheCurva;else curvaB=cacheCurva;}
      const {pontos,position,target,arcos}=cacheCurva;
      // Sequência Theatre é relógio/editor; leitura de poses só ao invalidar o cache.
      if(window.editarCamera && sheetCamera)sheetCamera.sequence.position=p*100;
      let i=1;while(i<pontos.length-1 && pontos[i].ini<p)i++;
      let primeiro=i-1,ultimo=i;
      while(primeiro>0 && pontos[primeiro].fim===pontos[primeiro].ini)primeiro--;
      while(ultimo<pontos.length-1 && pontos[ultimo].fim===pontos[ultimo].ini)ultimo++;
      const a=pontos[primeiro],b=pontos[ultimo];
      const u=reduzido?(p>=b.ini?1:0):p<=a.fim?0:Math.min(1,(p-a.fim)/(b.ini-a.fim));
      // Rampa curta cosseno nas pontas, cruzeiro constante no miolo. Só as
      // paradas zeram a velocidade; controles intermediários nunca freiam.
      const r=.18,normal=1-r;
      let dist=u;
      if(u<r)dist=(u-r/Math.PI*Math.sin(Math.PI*u/r))/2;
      else if(u>1-r){const q=1-u;dist=normal-(q-r/Math.PI*Math.sin(Math.PI*q/r))/2;}
      else dist=u-r/2;
      const s=reduzido?u:Math.max(0,Math.min(1,dist/normal));
      let comprimento=0;for(let j=primeiro;j<ultimo;j++)comprimento+=arcos[j][128];
      let wanted=s*comprimento;i=primeiro+1;
      while(i<ultimo && wanted>arcos[i-1][128]){wanted-=arcos[i-1][128];i++;}
      const lut=arcos[i-1];
      let lo=0,hi=128;while(lo+1<hi){const mid=(lo+hi)>>1;if(lut[mid]<wanted)lo=mid;else hi=mid;}
      const f=lut[hi]===lut[lo]?0:(wanted-lut[lo])/(lut[hi]-lut[lo]);
      const t=(i-1+(lo+f)/128)/(pontos.length-1),pos=position.getPoint(t),alvo=target.getPoint(t),delta=pos.clone().sub(alvo),d=Math.max(.001,Math.hypot(delta.x,delta.z));
      const fov=pontos[i-1].fov+(pontos[i].fov-pontos[i-1].fov)*(lo+f)/128;
      return {d:d/camZ(),a:delta.y/d,o:Math.atan2(delta.x,delta.z),f:fov,cx:alvo.x,cy:alvo.y,cz:alvo.z,g:0,x:0};
    }
    addEventListener('resize', () => {
      if(!cine||!ativa)return;
      if(trecho==='A')cine.trocar(chavesA());
      // Em B o trilho inclui o prefixo A; não substituí-lo pela tabela B isolada.
      cacheCurva=curvaA=curvaB=null;
    });
    function definirNav() {
      if (!nav) return;
      nav.definir(cenas.map((c, i) => ({ n: (trecho === 'B' ? CENAS_A.length : 0) + i + 1, rotulo: ROTULO[c.id] || c.id, ir: () => irCena(c) })));
    }
    function irCena(c) {
      const tr = host.querySelector('.narr-trilho'); if (!tr) return;
      const total = tr.offsetHeight - innerHeight;
      window.scrollTo({ top: host.offsetTop + total * (c.ini + (c.fim - c.ini) * .85), behavior: reduzido ? 'auto' : 'smooth' });
    }
    // projetos reais nos módulos (depois do PIN); refaz os fios se a quantidade mudou
    function sincronizarProjetos() {
      const P = (api.dados() || {}).P;
      if (!proto || !P || api.acesso() !== 'livre') return;
      const antes = proto.modulos.map(m => m.id).join('|');
      proto.atualizarStatus(P.estado.projetos);
      if (fios) { if (antes !== proto.modulos.map(m => m.id).join('|')) fios.refazer(); fios.status(P.estado.projetos); }
      // As poses já registradas não são reconstruídas durante a passagem de ignição.
    }

    // ------------------------------------------------------------ montagem dos trechos
    function construir(lista) {
      const ints = intervalos(lista), soma = lista.reduce((s, x) => s + x[1], 0);
      cenas.forEach(c => Escrita.liberar(c.el));
      host.innerHTML = `<div class="narr-trilho" style="height:${Math.round((soma + 1) * 100)}vh"><div class="narr-fix"></div></div>`;
      const fix = host.querySelector('.narr-fix');
      cenas = ints.map((c, i) => {
        const el = document.createElement('section'); el.className = 'narr-cena' + (i % 2 ? ' inv' : ''); el.dataset.cena = c.id;
        el.style.opacity = '0'; el.setAttribute('aria-hidden','true');fix.appendChild(el);
        return Object.assign(c, { el, escrito: false, tela: null, partes: {}, plano: 0, pl: { op: 1 }, jan: 0 });
      });
      return soma;
    }
    function cena(id) { return cenas.find(c => c.id === id); }

    function montarA() {
      trecho = 'A'; document.body.classList.remove('narr-b', 'momentos-vistos');
      const ks=chavesA(); construir(CENAS_A);
      cenaTexto(cena('ola'), '', '');
      cenaTexto(cena('prototipo'));
      if (cine) cine.trocar(ks);
      definirNav();
      montarAcesso();
      ligarTrilho();
    }
    function montarAcesso() {
      const c = cena('acesso'); if (!c) return;
      Escrita.liberar(c.el);
      modoAcesso = api.acesso();
      if (modoAcesso === 'livre') { c.el.innerHTML = ''; acesso = null; return; }
      const anelV = new THREE.Vector3(), anelD = new THREE.Vector3();
      acesso = LandingAcesso.montar(c.el, { modo: modoAcesso,
        // Posição do núcleo na tela, para o anel do PIN abraçar a esfera (raio ≈ 1,35E projetado).
        anel: () => {
          const cam = dep && dep.camera, el = mapa && mapa.el; if (!cam || !el) return null;
          const r = el.getBoundingClientRect(); if (!r.width) return null;
          anelV.set(0, 0, 0).project(cam); if (anelV.z > 1) return null;
          anelD.setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(2.1 * E).project(cam);
          const x = r.left + (anelV.x * .5 + .5) * r.width, y = r.top + (-anelV.y * .5 + .5) * r.height;
          const x2 = r.left + (anelD.x * .5 + .5) * r.width;
          return { x, y, r: Math.max(40, Math.abs(x2 - x)) };
        },
        aoLink: (t) => { const ok = api.aoLink(t); if (ok) setTimeout(() => { montarAcesso(); if (acesso) { acesso.escrever(); acesso.focar(); } }, 450); return ok; },
        aoDigitos: (k) => { digitos = k; },
        aoPin: (v) => { const ok = api.aoPin(v); if (ok) requestAnimationFrame(abrirPortalDados); return ok; } });
      // Reunir a apresentação do acesso sem alterar formulário ou validação.
      const esq=c.el.querySelector('.mom-esq'),dir=c.el.querySelector('.mom-dir');
      if(esq&&dir){esq.className='mom-bloco';esq.insertAdjacentHTML('afterbegin','<div class="mom-rotulo">Acesso</div>');while(dir.firstChild)esq.append(dir.firstChild);dir.remove();}
      acesso.escrever=async()=>{
        const g=c.el.querySelector('[data-g]'),p=c.el.querySelector('[data-p]');
        Escrita.grande(g,g._texto);
        await new Promise(r=>setTimeout(r,reduzido?0:250));
        if(c.el.getAttribute('aria-hidden')==='true')return;
        await Escrita.pequeno(p,p._texto);c.el.classList.add('pronto');if(acesso&&acesso.logar)acesso.logar();
      };
      c.escrito = false;
    }
    function cenaTexto(c, g, p) {
      c.el.innerHTML = `<div class="mom-bloco"><div class="mom-rotulo"></div><h2 class="mom-g" data-g></h2><p class="mom-p" data-p></p></div>`;
      c.partes = { g: c.el.querySelector('[data-g]'), p: c.el.querySelector('[data-p]') };
      if (c.temTela) c.tela = LandingTelas.criar(c.el.querySelector('.mom-tela'), c.temTela);
    }

    function montarB() {
      trecho = 'B'; document.body.classList.add('narr-b'); document.body.classList.remove('momentos-vistos');
      const ks=chavesB();
      chavesOriginaisB=ks;curvaB=null;
      const pesoA=CENAS_A.reduce((n,c)=>n+c[1],0),pesoB=CENAS_B.reduce((n,c)=>n+c[1],0);
      fracaoA=pesoA*corteA/(pesoA*corteA+pesoB);
      const prefixo=CENAS_A.map(c=>c.slice());prefixo[prefixo.length-1][1]-=pesoA*(1-corteA);
      construir(prefixo.concat(CENAS_B));
      for (const c of cenas) {
        if (['ponte','retorno'].includes(c.id)) { c.el.innerHTML=''; c.partes={}; }
        else if(c.id==='acesso'){c.el.innerHTML='';c.partes={};}
        else cenaTexto(c);
      }
      sincronizarProjetos();
      if (cine) cine.trocar(chavesOriginaisA.filter(k=>k.p<=corteA).map(k=>Object.assign({},k,{p:k.p/corteA*fracaoA})).concat(ks.map(k=>Object.assign({},k,{p:fracaoA+k.p*(1-fracaoA)}))));
      definirNav();
      ligarTrilho();
      preencherTelas();
    }

    // ------------------------------------------------------------ textos reais de cada momento (calculados na hora de escrever)
    function textos(id) {
      const D = api.dados() || {}, P = D.P, fin = D.fin;
      if (id === 'ola') { const sd = saudacao(); return { g: sd.g, p: sd.p }; }
      if (id === 'prototipo') return { g: '', p: '' };
      if (id === 'constroi') return { p: 'Núcleo de controle' };
      if (id === 'fecho') return {g:'Tudo à mão',p:'Ctrl K busca projetos. Use Conferir tudo para atualizar e o dock para navegar.'};
      if (!P) return { g: '—', p: api.erro && api.erro() ? 'sem dados agora · sem conexão com o Jarvão' : 'carregando os dados reais…' };
      const m = LandingDados.metricas(P), ps = P.estado.projetos;
      if(PROJETOS_CAMERA.includes(id)){
        const pr=ps.find(x=>x.id===id),d=(P.detalhes||{})[id]||{};
        if(!pr)return {g:'Sem dados',p:'Este projeto ainda não enviou uma leitura. Use Conferir tudo.'};
        const status=ESTADO_TXT[pr.status]||pr.status;
        let g=pr.disp7==null?status:(Math.round(pr.disp7*10)/10).toLocaleString('pt-BR')+'% no ar';
        let p='Disponibilidade em 7 dias · '+status+'. Clique na tela para abrir.';
        if(id==='planilha'&&d.planilha?.dias?.length){const u=d.planilha.dias.at(-1);g=(u.total||0)+' execuções';p=dm(u.d)+' · '+((u.falhas||0)+(u.travadas||0))+' com problema. Clique na tela para abrir.';}
        if(id==='planilha'){
          const detalhe=MapaVivo.limpar(pr.detalhe||''),normal=detalhe.match(/(\d+) execuç(?:ão|ões) na última hora/),falha=detalhe.match(/(\d+) de (\d+) execuções falharam/);
          const total=normal?Number(normal[1]):falha?Number(falha[2]):/Sem uso na última hora/.test(detalhe)?0:null,problemas=detalhe.match(/(\d+) com problema/);
          if(total!=null){g=total+' '+(total===1?'execução':'execuções');p='Na última hora · '+(problemas?problemas[1]+' com problema':falha?falha[1]+' com problema':status)+'. Clique na tela para abrir.';}
        }
        if(id==='assistente'||id==='painel'){
          const livre=fin&&fin.ok!==false&&fin.livre!=null?fin.livre:pr.extra?.livre;
          const ate=fin&&fin.ok!==false&&fin.diaMenor||pr.extra?.ate;
          if(livre!=null){g=real(livre);p=(ate?'Livre até '+dm(ate):'Saldo livre informado')+'. Clique na tela para ver as contas.';}
        }
        return {g,p};
      }
      if(id==='planeta'){const cl=ps.filter(x=>x.cliente);return {g:cl.filter(x=>x.status==='ok').length+'/'+cl.length+' no ar',p:'Projetos de clientes disponíveis agora. Acesse Clientes pelo dock para conferir.'};}
      switch (id) {
        case 'situacao': return { g: m.situacao[0] === 'erro' && /parado/i.test(m.situacao[1]) ? 'Parado' : ESTADO_PALAVRA[m.situacao[0]], cor: COR_STATUS[m.situacao[0]], p: m.situacao[1] + ' · conferido ' + api.ha(P.estado.verificadoEm) };
        case 'noar': return { g: m.projetosNoAr, p: 'projetos no ar · os pausados não contam' };
        case 'pedidos': { const ab = P.pedidos.filter(x => x.status === 'novo' || x.status === 'andamento'); return { g: String(ab.length), p: ab.length ? 'pedidos abertos · ' + ab.slice(0, 2).map(x => '#' + x.id + ' ' + x.titulo).join(' · ') : 'pedidos abertos · fila vazia' }; }
        case 'avisos': { const a = P.estado.avisos[0]; return { g: String(m.avisosNovos), p: 'avisos que você ainda não viu' + (a ? ' · último: ' + MapaVivo.limpar(a.titulo || '') : '') }; }
      }
      return { g: '', p: '' };
    }
    function preencherTelas() {
      const D = api.dados() || {}, P = D.P;
      cenas.forEach(c => {
        if (!c.tela) return;
        if (c.temTela === 'disp') c.tela.dados(P ? LandingTelas.dispTotal(P) : null);
      });
    }
    async function escrever(c) {
      if (c.escrito) return; c.escrito = true;
      const rodada = c.rodada = (c.rodada || 0) + 1;
      if (!c.escrito || c.rodada !== rodada || !c.el.isConnected) return;
      if (c.id === 'acesso') { if (acesso) { await acesso.escrever(); if (c.escrito && c.rodada === rodada && trecho === 'A' && !matchMedia('(pointer: coarse)').matches) acesso.focar(); } return; }
      const T = textos(c.id); c.vers = JSON.stringify(T);
      Escrita.preparar(c.partes.g, T.g); Escrita.preparar(c.partes.p, T.p);
      if (c.tela) {
        const tempoAnterior = reduzido ? 0 : 1.05 + Math.max(0, String(T.g || '').length - 1) * .055 + Math.min(1.1, .45 + String(T.p || '').length * .012);
        setTimeout(() => { if (c.escrito && c.rodada === rodada) c.el.classList.add('pronto'); }, tempoAnterior * 1000);
      }
      const rotulo=c.el.querySelector('.mom-rotulo');if(rotulo)rotulo.textContent=ROTULO[c.id]||c.id;
      if(c.partes.g&&T.g!==undefined){
        const el=c.partes.g;el.style.fontSize='';
        const css=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d');ctx.font=css.fontWeight+' '+css.fontSize+' '+css.fontFamily;
        const maior=Math.max(...String(T.g).split(/\s+/).map(w=>ctx.measureText(w).width));
        if(maior>el.clientWidth)el.style.fontSize=(parseFloat(css.fontSize)*el.clientWidth/maior*.98)+'px';
        Escrita.grande(el,T.g,{cor:T.cor});
      }
      await new Promise(r=>setTimeout(r,reduzido?0:250));
      if (!c.escrito || c.rodada !== rodada) return;
      if(c.partes.p)await Escrita.decodificar(c.partes.p,T.p);
      if (!c.tela) c.el.classList.add('pronto');
    }
    function zerar(c) {
      if (!c.escrito) return; c.escrito = false; c.rodada = (c.rodada || 0) + 1; c.el.classList.remove('pronto');
      if (c.id === 'acesso') { if (acesso) acesso.zerar(); return; }
      if (c.partes.g) Escrita.zerar(c.partes.g); if (c.partes.p) Escrita.zerar(c.partes.p);
    }

    // ------------------------------------------------------------ rolagem → cenas, planos, câmera
    function aplicar(p) {
      if (!ativa || emPortal) return;
      const ativas = [];
      for (const c of cenas) {
        const ch=cine&&cine.chaves(),hold=ch&&ch.find(k=>k.id===c.id&&!k.passagem);
        const inicio=c.id==='ola'?0:hold?hold.p:c.ini;   // a saudação aparece já ao abrir o app
        const v=!(trecho==='B'&&c.id==='acesso')&&!['ponte','retorno'].includes(c.id)&&p>=inicio&&p<=c.fim?1:0;
        if(v){ativas.push(c.id);if(!c.escrito){if(window.gsap)gsap.killTweensOf(c.el);c.el.style.opacity='1';c.el.setAttribute('aria-hidden','false');escrever(c);}}
        // Atualizações do intro/ScrollTrigger não são uma saída da cena.
        if(!v&&c.escrito){
          c.escrito=false;c.rodada=(c.rodada||0)+1;c.el.setAttribute('aria-hidden','true');
          const limpar=()=>{if(c.escrito)return;if(c.id==='acesso'){if(acesso)acesso.zerar();}else {if(c.partes.g)Escrita.zerar(c.partes.g);if(c.partes.p)Escrita.zerar(c.partes.p);}};
          if(window.gsap)gsap.to(c.el,{opacity:0,duration:reduzido?.2:.25,overwrite:true,onComplete:limpar});else {c.el.style.opacity='0';limpar();}
        }
        if(v&&c.id==='ola'&&conversa===null){conversa=false;setTimeout(()=>{if(ativa&&c.el.isConnected)conversa=montarConversa(c._textoCamada||c.el,()=>trecho==='A'&&c.escrito&&+getComputedStyle(c.el).opacity>.5)||false;},1800);}   // depois da escrita, para não atrapalhar a decodificação
        if(v&&c.id==='ola'&&conversa&&conversa.focar&&document.activeElement===document.body)conversa.focar();
        c.jan=v;
        if (c.tela) c.tela.ativar(v > .5 && c.escrito);
      }
      if (!voando && !projeto && cine) {
        const v = cameraEm(p);
        solicitarCamera(v);
        if (mapa) mapa.congelar(v.g);
        if (passe) passe.uniforms.uForca.value = Math.max(v.x, pulso.v);
      }
      cenasV5(p, ativas);
      // A visão geral D4 ainda mostra a máquina; os planetas normais só voltam
      // quando terminar() entrega o controle ao PC, com seus rótulos atualizados.
      document.body.classList.add('narr-sem-rotulos');
      if (trecho === 'B' && p > .9) document.body.classList.add('momentos-vistos');
      // liberado: na cena de acesso, o portal se abre com a rolagem
      if (trecho === 'A') {
        const c = cena('acesso');
        if (modoAcesso === 'livre' && c) {
          const hold=cine.chaves().find(k=>k.id==='acesso');
          const pp=p-(hold?hold.p:c.ini);
          if (pp > 0) abrirPortalDados();
        }
      }
    }
    const clamp = (x) => Math.max(0, Math.min(1, x));
    function emCena(id, p) { const c = cena(id); return c ? janela(p, c.ini, c.fim) : 0; }
    function sub(id, p) { const c = cena(id); return c ? (p - c.ini) / (c.fim - c.ini) : -1; }
    /** Protótipo, fios, planeta, fundo, ênfase, chamadas e navegação — tudo amarrado ao progresso (scrub). */
    function cenasV5(p, ativas) {
      const atualId = cenas.find(c=>p>=c.ini && p<c.fim) || cenas[cenas.length-1];
      if (nav && atualId) nav.ativa(cenas.indexOf(atualId));
      if (trecho === 'A') {
        const aguardando = p >= cena('acesso').ini;
        // energia/vida do trecho A ficam com o laço do núcleo desligado (tirarMorto)
        if (fios) fios.crescer(null);
        if(fios&&fios.energizar)fios.energizar(aguardando && proto ? proto.modulos.map(()=>0):null);
        if (telas) telas.ligar(aguardando && proto ? proto.modulos.map(() => 0) : null);
        if (fios) { fios.mostrar(true); fios.acenderChao(Math.max(intro.v * .55, clamp(sub('ola', p) * 1.15))); fios.acenderEsticados(0); fios.pacotes(0); }
        if (proto) proto.aparecer(clamp(sub('prototipo', p) * 1.6));
        if (mapa) mapa.deformar(.35 * emCena('prototipo', p));
        if (planeta) planeta.mostrar(0);
        if (fundo) fundo.estado(p < cena('prototipo').ini ? clamp(sub('ola', p)) : 1 + clamp(sub('prototipo', p)));
        if (proto) proto.enfatizar([]);
        if (mapa) mapa.fluxoIntensidade(1);
        chamadasDaCena(atualId ? atualId.id : '', p);
        return;
      }
      // A máquina permanece montada no fecho; viajar não desmonta o cenário.
      if (proto) proto.aparecer(1);
      if(!portalDados){if(mapa)mapa.energia(1);if(telas)telas.ligar(null);if(fios&&fios.energizar)fios.energizar(null);}
      if (fios) { fios.mostrar(true); fios.acenderChao(1); fios.acenderEsticados(1); fios.pacotes(1); }
      const inicioPonte=cena('ponte').ini,fimPlaneta=cena('retorno').fim;
      if(planeta)planeta.mostrar(1);
      if(mapa){mapa.orbitas(false);mapa.deformar(.2*emCena('situacao',p));mapa.fluxoIntensidade(1);}
      if(fundo)fundo.estado(p<inicioPonte?2:p<fimPlaneta?3:2);
      if(proto)proto.enfatizar(atualId && PROJETOS_CAMERA.includes(atualId.id)?[atualId.id]:[]);
      chamadasDaCena(atualId ? atualId.id : '', p);
    }
    let cenaChamadas = '';
    function chamadasDaCena(id, p) {
      if (!chamadas) return;
      if (projeto) { if (cenaChamadas !== '#proj') { chamadas.limpar(); cenaChamadas = '#proj'; } return; }
      chamadas.definir([]);
      cenaChamadas = id;
    }
    /** O que cada parte do protótipo explica — sempre dado real (ou "sem dados", nunca inventado). */
    function listaChamadas(id) {
      if (!proto) return [];
      if (trecho === 'A') return false ? [{ id: 'micro', ancora: () => proto.ancora('nucleo'), rotulo: 'Núcleo', grande: '', explica: '', marcador: 'circulo', micro: 'ROLE PARA ENTRAR' }] : [];
      const D = api.dados() || {}, P = D.P; if (!P) return [];
      const ps = P.estado.projetos, det = P.detalhes || {}, fin = D.fin && D.fin.ok !== false && D.fin.livre != null ? LandingDados.financeiro(D.fin) : null;
      const pct = (x) => x == null ? null : (Math.round(x * 10) / 10).toLocaleString('pt-BR') + '%';
      const modulo = (pid, i) => {
        const pr = ps.find(x => x.id === pid); if (!pr || !proto.modulos.find(m => m.id === pid)) return null;
        const d = det[pid] || {}; let g = pct(pr.disp7), ex = ESTADO_TXT[pr.status] || pr.status;
        if (pid === 'planilha' && d.planilha && d.planilha.dias && d.planilha.dias.length) { const u = d.planilha.dias[d.planilha.dias.length - 1]; g = (u.total || 0) + ' exec.'; ex += ' · ' + ((u.falhas || 0) + (u.travadas || 0)) + ' com problema em ' + dm(u.d); }
        else if (pid === 'gabinete' && d.ms && d.ms.site) { g = Math.round(d.ms.site) + ' ms'; ex += ' · site respondeu' + (d.ms.banco ? ' · banco ' + Math.round(d.ms.banco) + ' ms' : ''); }
        else if (pid === 'assistente' && fin) { g = real(fin.livre); ex += ' · livre até ' + dm(fin.diaMenor) + ' · conta ' + real(fin.conta); }
        if (pr.detalhe) ex += ' · ' + MapaVivo.limpar(pr.detalhe);
        if (pr.desde) ex += ' · desde ' + api.ha(pr.desde);
        return { id: pid, ancora: () => proto.ancoraFora(pid, dep.camera), rotulo: MapaVivo.limpar(pr.nome), grande: g || (ESTADO_TXT[pr.status] || '').toUpperCase(), explica: ex.slice(0, 150), marcador: 'circulo', micro: i === 0 ? 'CLIQUE NA TELA PARA ABRIR' : '' };
      };
      if(PROJETOS_CAMERA.includes(id))return [modulo(id,0)].filter(Boolean);
      if (id === 'base') {
        const hoje = new Date().toISOString().slice(0, 10), log = P.log || [], deHoje = log.filter(l => String(l.quando || '').slice(0, 10) === hoje).length;
        const ab = P.pedidos.filter(x => x.status === 'novo' || x.status === 'andamento'), m = LandingDados.metricas(P), av = P.estado.avisos[0];
        return [
          { id: 'base', ancora: () => proto.ancora('base'), rotulo: 'Base · fluxo de arquivos', grande: String(deHoje), explica: 'eventos no registro hoje' + (log[0] ? ' · último: ' + log[0].texto : ''), marcador: 'cruz' },
          { id: 'coroa', ancora: () => proto.ancora('coroa'), rotulo: 'Coroa · avisos', grande: String(m.avisosNovos), explica: 'avisos novos' + (av ? ' · último: ' + MapaVivo.limpar(av.titulo || '') : ''), marcador: 'cruz' },
          { id: 'trilho', ancora: () => proto.ancora('trilho'), rotulo: 'Trilhos · pedidos', grande: String(ab.length), explica: ab.length ? ab.slice(0, 2).map(x => '#' + x.id + ' ' + x.titulo).join(' · ') : 'fila de pedidos vazia', marcador: 'circulo' },
        ];
      }
      if (id === 'planeta' && planeta) {
        const cl = ps.filter(x => x.cliente), ok = cl.filter(x => x.status === 'ok').length;
        return [{ id: 'planeta', ancora: () => planeta.ancora(), zona: () => ({ centro: planeta.posicao, raio: planeta.raio * 1.15 }), rotulo: 'Mundo dos clientes', grande: ok + '/' + cl.length, explica: 'clientes no ar · ' + cl.map(x => MapaVivo.limpar(x.nome)).join(' · '), marcador: 'circulo', acao: { texto: 'Saiba mais', f: () => api.irClientes() } }];
      }
      return [];
    }

    const acordar = () => {
      if (girando) return;
      girando = true;
      requestAnimationFrame(() => { girando = false; atual.p = alvo.p; aplicar(atual.p); });
    };
    function ligarTrilho() {
      if (movimento) { movimento.kill(); movimento = null; }
      if (trigger) { trigger.kill(); trigger = null; }
      alvo.p = atual.p = 0;
      if (window.ScrollTrigger && window.gsap) {
        gsap.registerPlugin(ScrollTrigger);
        movimento = gsap.to(atual, {p:1, duration:1, ease:'none', paused:true, onUpdate:()=> {if(passeioAutomatico)return;alvo.p=atual.p; aplicar(atual.p);}});
        trigger = ScrollTrigger.create({ id: 'narrativa', animation:movimento, trigger: host.querySelector('.narr-trilho'), start: 'top top', end: 'bottom bottom', scrub: reduzido ? true : 1,
          snap:false });
      }
      aplicar(0);
    }

    // ------------------------------------------------------------ F: a porta libera o mesmo trilho, sem zerar scroll/câmera.
    let portalDados = null;
    function abrirPortalDados() {
      if (portalDados || trecho !== 'A' || !ativa) return;
      const ca=cena('acesso'),antes=camAtual;
      chavesOriginaisA=cine?cine.chaves():chavesA();
      // Corta apenas o restante do platô de acesso, preservando todo o caminho A.
      corteA=Math.max(ca.ini+.001,atual.p);
      chegadaB={d:antes.dist,a:antes.alt,o:antes.orbita,f:antes.fov,cx:antes.cx||0,cy:antes.cy||0,cz:antes.cz||0,g:0,x:0};
      curvaA=prepararCurva(chavesOriginaisA,'A');
      sincronizarProjetos();
      const pin=ca.el.querySelector('.mom-bloco');
      let saida=null;
      if(pin && !reduzido){
        // Só apresentação: formulário e autenticação continuam no LandingAcesso.
        saida=pin.cloneNode(true);saida.querySelectorAll('form,input,button').forEach(el=>el.remove());
        saida.setAttribute('aria-hidden','true');saida.inert=true;
        saida.style.pointerEvents='none';saida.style.position='fixed';saida.style.zIndex='30';document.body.append(saida);
        const box=pin.getBoundingClientRect();saida.style.left=box.left+'px';saida.style.top=box.top+'px';saida.style.width=box.width+'px';
        pin.style.visibility='hidden';
        gsap.to(saida,{clipPath:'inset(100% 0 0 0)',y:12,opacity:0,duration:.4,ease:'power2.in',onComplete:()=>saida.remove()});
      }
      const n=proto?proto.modulos.length:0;
      const onda=!reduzido&&mapa&&window.CenarioGeometria?CenarioGeometria.ondaPiso(mapa.depurar().scene,E):null;
      // Ignição (Caio, 05/11): núcleo quase morto → tropeça 3–4 vezes com faíscas → acende de vez (clarão, onda de choque,
      // raios, explosão de faíscas) → o fluxo corre pelos fios e cada painel liga soltando faísca → só então a câmera segue.
      // Ignição v4 (Claude, 05/11 — refs: circuito em veias de Horacio Velozo, cabos ArtStation, loader Active Theory):
      // 1 CARGA 0,4–1,7 s: luz entra pelas veias de fora para dentro e sobe pela base · 2 TRAVAMENTO 1,7–2,3 s: anéis aceleram e
      // param de uma vez (clique de faíscas) · 3 CONTRAÇÃO 2,3–2,8 s: o núcleo apaga quase todo (silêncio) · 4 DISPARO 2,8 s: clarão,
      // onda de choque, raios, explosão de faíscas e as veias acendem do centro para fora · 5 BATIMENTO 4,4–5,6 s: duas batidas,
      // as veias seguem o pulso · a câmera só sai em 5,6 s.
      const T=reduzido?.3:6.4, T_CAM=5.6, DISPARO=2.8;
      const bate=t=>Math.exp(-Math.pow((t-4.5)/.09,2))*.22+Math.exp(-Math.pow((t-5.05)/.09,2))*.16;
      const energiaEm=t=>{
        if(t<.4)return .03+.2*acesoSuave;
        if(t<1.7)return .23+.12*clamp((t-.4)/1.3);
        // a energia chega pelas veias e o núcleo bate como coração (3 batidas) — sem partículas subindo
        if(t<2.3)return .35+.32*Math.exp(-Math.pow((t-1.78)/.05,2))+.24*Math.exp(-Math.pow((t-1.98)/.05,2))+.4*Math.exp(-Math.pow((t-2.2)/.06,2));
        if(t<DISPARO)return .35*(1-clamp((t-2.3)/.25))+.015;
        return 1+.3*Math.exp(-(t-DISPARO)*4)+bate(t);
      };
      const vidaEm=t=>t<1.7?.3:t<2.25?1:t<DISPARO?0:Math.min(1,.4+.6*clamp((t-DISPARO)/1.2));
      const pos=new THREE.Vector3(),CENTRO=new THREE.Vector3(0,0,0);
      if(!campo&&window.Ignicao&&Ignicao.campo&&mapa)campo=Ignicao.campo(mapa,{E});
      const ligado=new Array(n).fill(false);
      let tempo=0,animacao=null,rolagem=null;
      const pd=portalDados={tempo:()=>tempo,progresso(p){
        tempo=p*T;
        // O HUD pode redimensionar o canvas: recalcula dist/camZ sem mover a pose no mundo.
        if(!reduzido && tempo<T_CAM)solicitarCamera(cameraEm(fracaoA));
        if(mapa)mapa.energia(reduzido?1:energiaEm(tempo));
        if(mapa&&mapa.vida)mapa.vida(reduzido?1:vidaEm(tempo));
        if(campo)campo.progresso(reduzido?1:clamp((tempo-DISPARO)/1.4));
        if(onda)onda.progresso(clamp((tempo-DISPARO)/1.3));
        if(malhaVeias){malhaVeias.carga(reduzido?-1:tempo>=.4&&tempo<1.75?1-clamp((tempo-.4)/1.3):-1);malhaVeias.acender(reduzido?1:clamp((tempo-DISPARO)/1.7)*1.08);malhaVeias.pulso(reduzido?0:Math.min(1,bate(tempo)*5));}
        if(mapa&&mapa.ignicaoTela&&!reduzido){
          const k=clamp((tempo-DISPARO)/.9);
          mapa.ignicaoTela({centro:CENTRO,raio:.05+k*1.1,onda:tempo<DISPARO?0:(1-k)*1.2,raios:tempo<DISPARO-.05?0:Math.max(0,1.4*Math.exp(-(tempo-DISPARO)*1.6))});
        }
        const fluxo=Array.from({length:n},(_,i)=>reduzido?1:clamp((tempo-(DISPARO+.25)-i*.12)/.5));
        if(fios&&fios.energizar)fios.energizar(fluxo);
        const telasV=fluxo.map((v,i)=>reduzido?1:clamp((tempo-(DISPARO+.6+i*.12))/.25));
        if(telas)telas.ligar(telasV);
        if(ign&&proto)telasV.forEach((v,i)=>{if(v>0&&!ligado[i]){ligado[i]=true;const m=proto.modulos[i];if(m&&m.g)ign.conector(m.g.getWorldPosition(pos.set(0,0,0)).clone());}});
      },destruir(){
        soltar(); // tambem libera wheel/touchmove quando a narrativa e interrompida
        if(animacao)animacao.kill();if(rolagem)rolagem.kill();
        if(saida)saida.remove();if(onda)onda.destruir();
        if(mapa)mapa.energia(1);if(mapa&&mapa.ignicaoTela)mapa.ignicaoTela({onda:0,raios:0});
        if(fios&&fios.energizar)fios.energizar(null);if(telas)telas.ligar(null);
      }};
      trocarParaB();
      const destino=cine.chaves().find(k=>k.id==='situacao'&&!k.passagem).p;
      const inicio=trigger.start+fracaoA*(trigger.end-trigger.start),fim=trigger.start+destino*(trigger.end-trigger.start);
      // Reconstruir DOM/ScrollTrigger mantém a mesma pose e coordenada de rolagem.
      if(trigger)trigger.scrubDuration(0);
      if(lenis)lenis.scrollTo(inicio,{immediate:true,force:true});else window.scrollTo({top:inicio,behavior:'instant'});
      movimento.progress(fracaoA);alvo.p=atual.p=fracaoA;aplicar(fracaoA);
      pd.progresso(0);
      // A rolagem fica presa durante a ignição: ninguém pula o momento sem querer.
      const segurar=e=>{if(e.cancelable)e.preventDefault();};
      if(!reduzido){if(lenis)lenis.stop();addEventListener('wheel',segurar,{passive:false});addEventListener('touchmove',segurar,{passive:false});}
      const soltar=()=>{removeEventListener('wheel',segurar);removeEventListener('touchmove',segurar);if(lenis&&ativa)lenis.start();};
      const concluir=()=>{
        soltar();
        if(!ativa)return;pd.destruir();portalDados=null;
        passeioAutomatico=false;
        if(trigger)trigger.scrubDuration(reduzido?0:1);
        if(ign)ign.viva(true);
        api.aoEntrar();
      };
      if(reduzido){
        // Fade da própria cena, sem movimento de câmera nem onda/partículas.
        const el=mapa&&mapa.el;if(el)gsap.fromTo(el,{opacity:0},{opacity:1,duration:.3});
        window.scrollTo({top:fim,behavior:'instant'});movimento.progress(destino);aplicar(destino);
      }
      const est={p:0};
      animacao=gsap.timeline({onComplete:concluir});
      animacao.to(est,{p:1,duration:T,ease:'none',onUpdate:()=>pd.progresso(est.p)},0);
      if(!reduzido){
        if(ign){
          animacao.call(()=>ign.explosao(null),null,DISPARO);
          animacao.call(()=>ign.explosao(null),null,DISPARO+.16);
          animacao.call(()=>ign.arranque(null,1),null,4.5);animacao.call(()=>ign.arranque(null,1),null,5.05);
        }
        animacao.call(()=>{
          passeioAutomatico=true;
          if(lenis)lenis.scrollTo(Math.ceil(fim),{duration:T-T_CAM+.6,easing:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,force:true,lock:true});
          else{const pz={y:inicio};rolagem=gsap.to(pz,{y:fim,duration:T-T_CAM+.6,ease:'power2.inOut',onUpdate:()=>{window.scrollTo({top:pz.y,behavior:'instant'});ScrollTrigger.update();alvo.p=atual.p=(pz.y-trigger.start)/(trigger.end-trigger.start);aplicar(atual.p);}});}
        },null,T_CAM);
      }
    }
    function trocarParaB() {
      if(trecho==='B')return;
      emPortal=true;
      montarB();
      if(window.ScrollTrigger)ScrollTrigger.refresh();
      emPortal=false;
    }
    let estiloRolagem = null;
    function travarRolagem(v) {
      if (lenis) { if (v) lenis.stop(); else { lenis.scrollTo(window.scrollY,{immediate:true,force:true}); lenis.start(); } }
      const raiz = document.documentElement;
      if (v && !estiloRolagem) {
        estiloRolagem = { overflow: raiz.style.overflow, gutter: raiz.style.scrollbarGutter, mapaWidth: mapa ? mapa.el.style.width : '' };
        if (mapa) mapa.el.style.width = mapa.el.getBoundingClientRect().width + 'px';
        raiz.style.scrollbarGutter = 'stable'; raiz.style.overflow = 'hidden';
      } else if (!v && estiloRolagem) {
        raiz.style.overflow = estiloRolagem.overflow; raiz.style.scrollbarGutter = estiloRolagem.gutter;
        if (mapa) mapa.el.style.width = estiloRolagem.mapaWidth;
        estiloRolagem = null;
      }
    }

    // ------------------------------------------------------------ portal 2: planeta → projeto
    function entrarProjeto(id) {
      if (!ativa || trecho !== 'B' || projeto || voando || !mapa || !mapa.portal) return false;
      let pose = null, ponto = null;
      const mod = proto && proto.modulos.find(m => m.id === id);
      if (mod) { ponto = mod.g.getWorldPosition(new THREE.Vector3()); pose = { dist: 2.4 * E * mob / camZ(), alt: .04, orbita: Math.atan2(ponto.x, ponto.z), fov: 34, cx: ponto.x, cy: ponto.y, cz: ponto.z }; }
      else { const pp = mapa.poseProjeto(id); if (pp) { ponto = pp.ponto.clone(); pose = { dist: pp.dist, alt: pp.alt, orbita: pp.orbita, fov: pp.fov }; } }
      if (!pose) return false;
      projeto = id; travarRolagem(true); mapa.congelar(1);
      const destino = pose;
      const fim = () => {
        porCamera(destino);
        if (pd) pd.destruir();
        if (passe && window.gsap && !reduzido) gsap.fromTo(pulso, { v: .8 }, { v: 0, duration: .6, ease: 'power3.out', onUpdate: () => { passe.uniforms.uForca.value = pulso.v; } });
        mostrarProjeto(id);
      };
      const pd = reduzido ? null : mapa.portal({ origem: () => ponto, pose: destino, tamanho: 1.2 * E });
      if (!pd) { fim(); return true; }
      const est = { p: 0 };
      gsap.to(est, { p: 1, duration: 1.4, ease: 'power2.inOut', onUpdate: () => pd.progresso(est.p), onComplete: fim });
      return true;
    }
    let camadaProj = null;
    function mostrarProjeto(id) {
      const D = api.dados() || {}, P = D.P, p = P && P.estado.projetos.find(x => x.id === id); if (!p) return sairProjeto();
      camadaProj = document.createElement('section'); camadaProj.className = 'narr-cena'; camadaProj.style.opacity = '1';
      camadaProj.innerHTML = `<div class="mom-lado mom-esq"><div class="mom-g" data-g></div></div><div class="mom-lado mom-dir"><p class="mom-p" data-p></p><button type="button" class="proj-sair">Voltar ao núcleo · Esc</button></div>`;
      host.querySelector('.narr-fix').appendChild(camadaProj);
      cenas.forEach(c => { c.el.style.visibility = 'hidden'; });
      const fin = D.fin && D.fin.ok !== false && D.fin.livre != null ? LandingDados.financeiro(D.fin) : null;
      const linhas = [MapaVivo.limpar(p.nome), p.detalhe ? MapaVivo.limpar(p.detalhe) : '', p.disp7 != null ? Math.round(p.disp7 * 10) / 10 + '% no ar em 7 dias' : ''];
      if ((id === 'painel' || id === 'assistente') && fin) linhas.push('livre ' + real(fin.livre) + ' até ' + dm(fin.diaMenor) + ' · conta ' + real(fin.conta));
      const est = { ok: 'No ar', atencao: 'Atenção', erro: 'Problema', pausado: 'Pausado', config: 'Configurar', aguardando: 'Aguardando' };
      Escrita.grande(camadaProj.querySelector('[data-g]'), est[p.status] || p.status, { cor: COR_STATUS[p.status] }).then(ok => { if (ok && camadaProj) Escrita.pequeno(camadaProj.querySelector('[data-p]'), linhas.filter(Boolean).join(' · ')); });
      camadaProj.querySelector('.proj-sair').addEventListener('click', sairProjeto);
      api.abrirPainel(id);
      addEventListener('keydown', escProjeto); addEventListener('wheel', sairProjeto, { once: true, passive: true }); addEventListener('touchmove', sairProjeto, { once: true, passive: true });
    }
    function escProjeto(ev) { if (ev.key === 'Escape') sairProjeto(); }
    function sairProjeto() {
      if (!projeto) return;
      removeEventListener('keydown', escProjeto); removeEventListener('wheel', sairProjeto); removeEventListener('touchmove', sairProjeto);
      projeto = null; if (camadaProj) { Escrita.liberar(camadaProj); camadaProj.remove(); camadaProj = null; }
      cenas.forEach(c => { c.el.style.visibility = ''; });
      api.abrirPainel('');
      if (!cine || !window.gsap) { voando = false; travarRolagem(false); if (mapa) mapa.congelar(0); aplicar(atual.p); return; }
      const v = cameraEm(atual.p), alvoC = { dist: v.d, alt: v.a, fov: v.f, orbita: v.o, cx: v.cx, cy: v.cy, cz: v.cz }, de = Object.assign({ cx: 0, cy: 0, cz: 0 }, camAtual);
      voando = true;
      const k = { t: 0 };
      gsap.to(k, { t: 1, duration: reduzido ? 0 : .9, ease: 'power2.inOut', onUpdate: () => porCamera({ dist: de.dist + (alvoC.dist - de.dist) * k.t, alt: de.alt + (alvoC.alt - de.alt) * k.t, fov: de.fov + (alvoC.fov - de.fov) * k.t, orbita: de.orbita + (alvoC.orbita - de.orbita) * k.t,
          cx: de.cx + (alvoC.cx - de.cx) * k.t, cy: de.cy + (alvoC.cy - de.cy) * k.t, cz: de.cz + (alvoC.cz - de.cz) * k.t }),
        onComplete: () => { voando = false; travarRolagem(false); if (mapa) mapa.congelar(0); aplicar(atual.p); } });
    }

    // ------------------------------------------------------------ fim da narrativa / ir direto
    function terminar() {
      if (movimento) movimento.kill();
      if (lenis) { gsap.ticker.remove(quadroLenis); lenis.destroy(); }
      desinscreverCamera.forEach(f=>f());
      if (!ativa) return; ativa = false;
      if (quadroNarrativa) gsap.ticker.remove(quadroNarrativa);
      if (projeto) { projeto = null; if (camadaProj) { Escrita.liberar(camadaProj); camadaProj.remove(); } }
      if (trigger) { trigger.kill(); trigger = null; }
      if (portalDados) { portalDados.destruir(); portalDados = null; }
      cenas.forEach(c => { zerar(c); Escrita.liberar(c.el); });
      if (particulas) particulas.destruir();
      if (veias) veias.destruir();
      host.innerHTML = ''; host.style.display = 'none'; ir.remove();
      if (chamadas) { chamadas.limpar(); chamadas.esconder(true); } if (nav) nav.remover(); if (fundo) fundo.remover();
      if (rotulos) rotulos.destruir();
      if (proto) proto.aparecer(0); if (fios) fios.destruir(); if (planeta) planeta.mostrar(0);
      if (mapa) { mapa.orbitas(true); mapa.deformar(0); mapa.ambienteEmCamadas(false); }
      document.body.classList.remove('narr-on', 'narr-b', 'narr-sem-rotulos'); document.body.classList.add('momentos-vistos');
      travarRolagem(false);
      if (mapa) { mapa.cinema(null); mapa.explodir(0); mapa.fluxoIntensidade(1); mapa.congelar(0); }
      if (passe) passe.uniforms.uForca.value = 0;
      cenas = [];
      window.scrollTo(0, 0);
      api.aoTerminar();
    }
    function irAoAcesso() {
      if (!ativa || trecho !== 'A') return;
      const c = cena('acesso'), tr = host.querySelector('.narr-trilho'); if (!c || !tr) return;
      const total = tr.offsetHeight - innerHeight, y = host.offsetTop + total * (c.ini + (c.fim - c.ini) * .85);
      window.scrollTo({ top: y, behavior: reduzido ? 'auto' : 'smooth' });
      setTimeout(() => { if (acesso) acesso.focar(); }, reduzido ? 0 : 900);
    }
    function irDireto() {
      if (!ativa) return;
      if (api.acesso() !== 'livre') { irAoAcesso(); return; }
      terminar();
    }
    addEventListener('keydown', (ev) => {
      if (!ativa || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
      if ((conversa === false && trecho === 'A' && cena('ola').escrito) || (conversa && conversa.ativa())) return;   // respondendo a pergunta da saudação: a tecla D é letra, não atalho
      if (ev.key === 'd' || ev.key === 'D') { ev.preventDefault(); irDireto(); }
    });

    // ------------------------------------------------------------ interface com o pc.html
    function atualizar() {
      if (!ativa) return;
      if (trecho === 'A') {
        const m = api.acesso();
        if (m !== modoAcesso) {
          if (m === 'livre' && modoAcesso !== 'livre' && acesso) return;   // acabou de acertar: o portal já está a caminho
          montarAcesso(); const c = cena('acesso'); if (c) { c.escrito = false; aplicar(atual.p); }
        }
        return;
      }
      preencherTelas(); sincronizarProjetos();
      cenas.forEach(c => { if (!c.escrito || c.id === 'fecho') return; const T = textos(c.id); if (JSON.stringify(T) !== c.vers) { c.escrito = false; escrever(c); } });
    }

    montarA();
    return {
      ativa: () => ativa, emB: () => ativa && trecho === 'B', acessoPendente: () => ativa && trecho === 'A' && api.acesso() !== 'livre',
      altura: () => (ativa ? host.offsetHeight : 0), atualizar, entrarProjeto, irDireto, irAoAcesso, terminar,
      progresso: () => atual.p, trecho: () => trecho, cenaEm: (p) => (cenas.find(c => p >= c.ini && p < c.fim) || {}).id,
    };
  }

  window.Narrativa = { montar };
})();
