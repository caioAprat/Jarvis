# Estado da migração — passagem para Claude Code

Branch: `visual/jarvis-refatoracao`. Produção e `main` intactas; nenhum push autorizado.
Checkpoint inicial: `79a3350`, tag `checkpoint-pre-fechamento`.

| Critério | Estado | Evidência / limite |
|---|---|---|
| A — retirada do 3D | ⚠️ parcial | `validacao-3d.md`: zero nas fontes próprias; remoção isolada em `e9d00a4`; busca global zero e JS menor não atingidos. |
| B — núcleo em camadas | ✅ pronto | `cena-2d.js/start/draw`: rede, respiração, corona, glow e faíscas; julgamento estético reservado ao usuário/Claude. |
| C — fios reais | ✅ pronto | `rebuild/drawConnections` usa projetos e posições correntes; teste adiciona/remove itens. |
| D — fundo com parallax | ✅ pronto | `start/draw`: 12 planetas, 3 profundidades; cinco visíveis no celular por qualidade. |
| E — câmera e relógio | ✅ pronto | Uma master/ticker; callback corrigido para atualizar durante toda a suavização do scrub, conforme documentação GSAP. |
| F — textos sem cartões | ✅ pronto | `capturas/layout.json`: 33 pontos, zero texto fora da viewport, sobreposição textual ou interseção com núcleo; sem etapas vazias. |
| G — robustez | ⚠️ parcial | Fallback, PNG, pausa e reduced-motion inicial passam; teste de alternância em tempo real não retomou loop. |
| H — funções existentes | ✅ pronto | `verificar-ui.cjs`: busca, oito seções, conferência e API simulada; servidor com 140 verificações. |

## Concluído nesta sessão
- ✅ Checkpoint e diagnóstico curto; sem regenerar assets ou instalar bibliotecas.
- ✅ Medição inicial: textos dentro da viewport e sem colisão entre textos; encontrou núcleo sobre texto (20/40/50%), vazio em 60% e fechamento mobile oculto.
- ✅ Primeira correção F validada: coluna por órbita, cena elevada no mobile, conteúdo contínuo e tolerância de 2px no fechamento.
- ✅ G: fallback agora destrói Lenis; scroll nativo após perda de contexto, ocultação após a jornada e DPR passaram em teste separado. Onze regressões de UI passaram novamente.
- ✅ CLAUDE.md aponta para este registro; temporários ignorados; exportação HTML antiga retirada do Git (gerador preservado). Créditos mantidos, sem regenerar assets.

## Pendências
- ✅ Geometria medida nas três viewports; console tem somente erro externo de certificado das fontes.
- ✅ Relatório final em `relatorio.md`: FPS/frame/CPU/heap/JS/primeiro render; build/lint/typecheck inexistentes, sintaxe e testes verificados.
- ⚠️ CPU, heap e download não diminuíram; 60 fps em hardware real não comprovados.
- ✅ Fontes Google: o erro de certificado era só do proxy do sandbox do Codex. No Chrome real (27/10/2026) o CSS do Google Fonts carrega e Saira (300/400/700), Michroma e JetBrains Mono (400/500) ficam `loaded`; console limpo. Falta apenas conferir no Safari/iPhone.
- ✅ Retomada após movimento reduzido: NÃO reproduzida no Chrome real (Claude Code, 27/10/2026). Alternando reduce → normal com `matchMedia` simulado, em 1024 e 390 px: `loop` volta a true, Lenis é recriado, há 1 ScrollTrigger, rolar move a câmera (progress 0,44) e os textos trocam. A falha do Codex parece ser do teste/ambiente (Chromium headless por software), não do código; o `verificar-robustez.cjs` completo não foi rodado aqui (Playwright só existia no sandbox do Codex).
- ✅ CLAUDE.md e exclusões prontos; entrega identificada pela tag local `handoff-claude-code`, sem push.

- ✅ JavaScript (27/10/2026): `vendor/pixi.min.js` agora é build enxuto só-WebGL: 843→536 KB (gzip 237→158 KB); total das páginas ~983→~676 KB (gzip ~300→~220 KB, GitHub Pages comprime). Validado no Chrome real: renderer webgl, 7 projetos/fios, planetas, rolagem e console limpos; 140 testes do servidor passam. Corte maior exigiria importar módulos internos do Pixi um a um (risco maior, não feito). Se o WebGL falhar o fallback PNG continua (não há mais canvas/WebGPU do Pixi).

- ✅ Passo C (27/10/2026): o medidor do Codex só olhava o texto da jornada, não os rótulos dos nós (`.cena-label`), por isso não viu colisão em 1024 px. Agora, na abertura, a órbita encolhe e se desloca para a área livre à direita do texto (volta ao normal até 12,5% do scroll). Medido no Chrome real com rótulos × texto: 0 colisões, 0 cortes e 0 rótulos sobrepostos em 1024, 1366 e 1920 px; celular não muda (só leitura do código, não reexecutado). Limite: o núcleo fica menor na abertura em telas estreitas (~73–78% do tamanho antigo em 1366).

- ✅ Passo D (27/10/2026): nós com anel de status (verde no ar, âmbar aguardando, apagado pausado), gema 55→68 e halo maior; planetas de fundo mais visíveis (alpha 0,16–0,27 → 0,30–0,44). Sem assets novos. Verificado no Chrome real a 1366 px: 0 colisões/cortes, console sem erros próprios. Celular 390×844 (index.html?demo, Chrome real, 27/10/2026): abertura e etapa 'Painel Meu dinheiro' sem colisão rótulo×rótulo, rótulo×núcleo ou corte; anéis visíveis; nada corrigido. Observação: o painel do navegador entrega rAF em rajadas, então capturas logo após carregar podem mostrar rótulos defasados dos nós; medir só após estabilizar. Não verificado: Safari/iPhone reais. Julgamento estético final é do Caio.

## Rodar e verificar (na raiz do projeto)
`python3 -m http.server 8001 --bind 127.0.0.1`
Abrir `http://127.0.0.1:8001/demo.html` (dados fictícios, sem produção).
`/workspace/.jarvis-tools/node_modules/.bin/node testes/testes.js`
`node scripts/migracao-2d/verificar-ui.cjs`
`node scripts/migracao-2d/verificar-offline.cjs`
`node scripts/migracao-2d/verificar-fontes.cjs`
`node scripts/migracao-2d/medir-layout.cjs` (33 pontos e capturas, sem abrir imagens)
`JARVIS_NO_CAPTURES=1 node scripts/migracao-2d/medir-depois.cjs` (FPS, frame, CDP)
`JARVIS_ROBUST_CASE=scroll node scripts/migracao-2d/verificar-robustez.cjs` (passa)
`node scripts/migracao-2d/verificar-robustez.cjs` (inclui pendência de troca de preferência)
Nesta sessão foi usada porta 8002 com `JARVIS_TEST_URL=http://127.0.0.1:8002`; offline mantém 8001.
Ferramentas já instaladas em `/workspace/.jarvis-audit-tools`; não reinstalar.

## Arquivos-chave
- `cena-2d.js`: sprites, conexões, câmera, ticker e fallback.
- `cena-2d.css` / `jornada.js`: composição e texto acessível.
- `pc.html` / `index.html`: integração com funções existentes.
- `demo.js` / `assets/demo.json`: demonstração isolada.
- `sw.js`: cache offline e push preservado.
- `baseline.json` / `depois.json`: métricas antes/depois, com metodologia.
- `relatorio.md` / `validacao-3d.md`: resultados e limites explícitos; sem alegar aceite integral.
- `CREDITS.md`: procedência e licenças; assets finais já aprovados tecnicamente.

## Riscos / próximos passos
1. Corrigir G: retomada na troca de preferência, mantendo acesso nativo e fallback.
2. Certificado das fontes exige autorização externa; console zero ainda não cumprido.
3. A: reduzir JS; não apagar histórico nem adulterar Pixi para zerar palavras. FPS melhorou, CPU/heap/JS não.
4. Claude/usuário: polimento estético e teste em GPU/Safari reais antes de publicar.

## Polimento desktop 2 (missão autônoma, 27/10/2026)
Checkpoint: tag `checkpoint-polimento-1` (árvore limpa em `3d35c9f`). Harness de validação: Chrome headless via playwright-core (fora do projeto, no scratchpad); alvo visual: `referencias/pc-1920x1080.png` (o `referencia-pc.png` não existe).

### Etapa 0 — diagnóstico (✅)
1. Núcleo: `AnimatedSprite` 'rede' com 96 quadros avançados a 12/s (`gotoAndStop(floor(elapsed*12)%96)`): rotação em degraus de 12 fps, não contínua.
2. Quadros de 384 px esticados para 440 (×1,15, ×2 em DPR 2) e atlas `nucleo-1` de 1024 px desenhado a 480–720 px CSS (>1,0× em DPR 2): borrão.
3. "Pulmão": `breathTween` sine.inOut yoyo 2,8 s em escala 1→1,045.
4. Renderer 'webgl', resolution = min(DPR,2) = 2 (canvas 3840×2160 em 1920×1080 DPR 2). A qualidade adaptativa (`slow>3000`) reduz `renderer.resolution` e esconde estrelas/primeiro plano: derruba a nitidez do núcleo — deve passar a reduzir só partículas/glow.
5. Fios: 1 curva de 32 segmentos por projeto (7 no total) + um ponto pulsante; não há pacotes de dados.
6. Partículas: 3×850 estrelas, 90 faíscas, 60 de primeiro plano; sem brasas em arco, sem poeira junto aos fios, sem detritos orbitais.
7. Barra superior (`.hud`), busca e dock existem no DOM de `pc.html`, mas a barra rola junto com a página (não é fixa) e some da vista durante a jornada.
8. O layout de desktop reutilizava a jornada de coluna única pensada no celular (texto pequeno à esquerda, seções de baixo como cartões em coluna): causa de a versão desktop parecer o app de celular.
9. Medição: headless com SwiftShader a DPR 2 roda ~1,7 fps; FPS real só em GPU de verdade. Custo do núcleo será medido em CPU (JS) com `performance.now`.

### Decisões
- O app não usa bundler: a nova cena será JS puro em arquivos novos (`nucleo-2d.js`, etc.) carregados antes de `cena-2d.js`.

### Etapa 1 — núcleo procedural (✅, commits 19b00bc e seguintes)
- `nucleo-2d.js`: halo (3 sprites aditivos + flare), corpo em gradiente 2048 + 2 camadas de plasma em contra-rotação, rede geodésica (frequência 12 = 1442 vértices, 4320 arestas, jitter 3%) girada a cada quadro (eixo Y + precessão X) e projetada em 2D com Mesh `line-list` (trás α≈0,25, frente α≈0,9, cópia deslocada 0,5 px), icosaedro e dodecaedro internos em contra-rotação, anel de limbo, 3 anéis tracejados com 7 satélites, nós luminosos (190) e onda de choque vetorial. Sem Three.js, sem sequência de quadros; tudo usa deltaTime.
- Medido (Chrome headless, 120 quadros a 60 Hz simulados): desvio máximo do delta de rotação 8e-14 (critério ±10%); custo JS do núcleo 0,2–0,45 ms/quadro (critério ≤3 ms; não inclui GPU).
- Texturas: gradientes/plasma gerados em canvas de 2048 px (1024 no celular), sem esticar assets de 1024.
- Pixi enxuto reconstruído para exportar Mesh/MeshGeometry/Texture.

### Etapa 2 — batimento, fios e pacotes (✅; pacotes conferidos em captura com simulação determinística `MV.avancar`; em headless a 1,7 fps pacotes duram 1–2 quadros e parecem sumir)
- Batimento "tum-tum" analítico (sem sine): período 0,95 s ±3% por ciclo (0,82 s com avisos novos via `nucleo.ritmo(true)`), tum 1 (ataque 70 ms power3.out, escala 1,07) e tum 2 (0,6×, em +0,20 s). Medido em 3 s: picos 1,070 e 1,042 espaçados ~0,19 s, período 0,92–0,95 s.
- `fios-2d.js`: 2 a 5 fios Bézier por projeto + 2 fios secundários entre vizinhos (44 fios, antes 7); extremidades pela posição atual do planeta a cada quadro; pool de 160 pacotes com rastro de cometa.
- Nó recebe flash ao chegar um pacote; evento real via `MV.evento` (ainda não ligado ao pc.html).

### Etapa 3 — partículas (✅)
- `particulas-2d.js`: 150 brasas em arco saindo do núcleo (paleta branco→laranja→vermelho, rajada a cada tum), 8 detritos orbitando cada planeta (3 se pausado); `fios-2d.js`: 80 micro-partículas viajando junto aos fios; estrelas com cintilação (25% por camada). Poeira em parallax e primeiro plano mantidos. Contagens escalam por `qualidade` (adaptativa 0,65) e `densidade` (celular ≈0,45).
- Custo medido: 1,9 ms/quadro de CPU para toda a cena (240 quadros simulados, sem GPU).

### Etapa 4 — estrutura desktop e Visão geral (✅)
- A barra superior (Situação, Projetos no ar, Pedidos abertos, Avisos novos), a busca Ctrl K, "Conferir tudo" e o dock inferior já existiam no `pc.html` (barra sticky); o retângulo escuro atrás do cabeçalho era o fundo `.barra.rolou` com blur: removido durante a jornada.
- `.jornada` agora tem `pointer-events:none` (antes bloqueava cliques nos planetas/rótulos).
- Mapa de projetos (`.mapa-proj`, em `jornada.js`) substitui o rótulo vertical: um ponto de status por projeto (nome ao passar o mouse/foco), clique ou teclas 1–9 → `MV.irPara` (Lenis.scrollTo até a etapa); botão/tecla G = Visão geral (câmera recua, ScrollTrigger pausado, todos os rótulos visíveis, sem rolar); clique num planeta abre UM painel de detalhes (nome, status, disponibilidade 7/30 dias, detalhe, abrir) com linha-guia; Esc fecha painel e depois a visão geral; hover num planeta/rótulo acende o feixe de fios. Celular: o mapa vira faixa compacta no topo.
- Ritmo cardíaco acelera (0,82 s) com avisos novos; avisos/pedidos novos geram pacotes maiores (`MV.evento`) até o projeto.
- Testado headless: tecla 3 → etapa do 3º projeto (progress 0,444), G entra/sai, painel abre/fecha, clique no mapa leva à etapa.

### Etapa 5 — seções de baixo sem cartões em coluna (✅)
- Causa do "layout de celular": o `index.html` (app do iPhone, `max-width:560px`) é a página que abre em `/Jarvis/`; no PC as seções Notificações, Dinheiro, Clientes, Meus projetos e Avisos apareciam como cartões numa coluna estreita. O `pc.html` (central do PC) já usa 2–3 colunas largas (medido em 1920: main 1280 px, grades de 2–3 colunas) e não foi alterado nas abas.
- Decisão: em telas ≥1000 px o `index.html` ganha `desktop-2d.css/js`: duas colunas largas (Clientes + Meus projetos à esquerda; Notificações, Dinheiro e Avisos à direita), tipografia grande e leve, linhas-guia com marcador de luz, status como ponto luminoso (sem pílulas/ícones em caixa), Dinheiro com número gigante contando. No celular nada muda (wrappers `display:contents`).
- No desktop do app também: barra de indicadores (Situação, Projetos no ar, Pedidos abertos "—" com link para a central, Avisos novos), busca Ctrl K (projetos e seções) e dock inferior. Depois da jornada a cena vira fundo a 22% para não competir com o texto.
- Verificado headless 1920: 2 colunas (x=210 e x=1103), HUD/busca/dock presentes, paleta abre/filtra/fecha.

### Etapa 6 — desempenho e robustez (✅/⚠️)
- ✅ Movimento reduzido, perda de WebGL, celular 390 px e 140 testes do servidor passam; qualidade adaptativa nunca reduz a resolução nem a nitidez do núcleo.
- ⚠️ 60 fps em GPU real não comprovados (headless por software: ~3,7 fps). Números e limites em `relatorio.md`.
- ✅ 1024 px: sobreposição de rótulos corrigida (`separaRotulos` afasta rótulos para o lado, ou para baixo; medido em 1024, 1100, 1365, 1920 e 390 px: 0 sobreposições, 0 cortes, 0 colisões com texto/mapa). ⚠️ Em 800 px (fora da faixa desktop) o rótulo da Planilha ainda toca o mapa lateral. Pendências do Codex: retomada após movimento reduzido ✅ (já no passo anterior), fontes ✅, JS 983→751 KB.

### Decisões
- `index.html` (app do iPhone) é a página aberta em `/Jarvis/`; recebeu composição de desktop ≥1000 px em vez de redirecionar ao `pc.html` (que exige o link privado da central).
- Pedidos abertos no app mostra "—" (o endpoint do app não traz pedidos) com link para a central do PC.
- Frequência da rede geodésica = 12 (V=1442) por leitura de referência; "frequência 4/5" do pedido daria 162–252 vértices, esparso demais.
- As 10 visualizações de imagem permitidas foram usadas (referência, recortes do núcleo/fios/pacotes e quadros da cena/seções); o resto foi medição.

## Rodada 2 (27/10/2026) — checkpoint `checkpoint-polimento-2`
### Marca (✅)
- Nova identidade: emblema = globo geodésico (a rede do núcleo) com núcleo incandescente que bate e órbita com satélite; logotipo JARVÃO desenhado em traço contínuo, com o núcleo dentro do "O". Fonte única: `scripts/marca/marca.cjs`; geração: `scripts/marca/gerar-icones.cjs` (usa playwright-core + Chrome; variáveis `PW_CORE` e `CHROME`).
- Aplicada em: cabeçalhos de `pc.html`/`index.html` (`MapaVivo.logo()`/`marca()` em `mapa-2d.js`, emblema animado), aba (`icons/jarvis.svg`, `favicon.ico`, `favicon-32.png`), iOS (`apple-touch-icon.png` 180), instalação (`icon-192/512.png`, `icon-maskable-512.png`, manifestos), notificações (`icon-192`), `demo.html`, `privacidade.html`, cache offline (`sw.js` v7). Michroma deixou de ser usada no logotipo.
- Não há skill de ícones instalada no ambiente (só as listadas); o desenho é próprio.
- Pendente: o ícone do app já instalado no iPhone/PC só muda ao reinstalar; as mensagens do Telegram/Apps Script não usam este ícone.
### A — batimento lento (✅)
- Constantes em `window.BATIMENTO_CONFIG` (topo de `nucleo-2d.js`): período 1,6 s (alerta 1,35 s, mínimo 1,3 s, ±3%), tum 1 (ataque 110 ms power2.out, escala 1,06, decaimento 320 ms expo.out), tum 2 em +300 ms (0,65×, 90/280 ms), brilho residual na diástole, onda de choque só no tum 1 (1,1 s, α 0,3→0). Aparência do núcleo intocada.
- Medido (8 s, passo 1/240 s): 2 picos por ciclo (1,060 e 1,039), gap 279–284 ms, períodos 1,563–1,646 s; em alerta 1,316–1,358 s. Movimento reduzido: pico 1,024 e nenhuma onda.
### B — máquina de estados única (✅)
- Causa confirmada: 3 donos da câmera ao mesmo tempo (scrub suave da master com `scrub:1`, tweens do modo G com `st.disable`, painel) e Lenis parado + overflow oculto em G; rolagem livre parava entre poses, e o texto trocava de repente no meio da transição.
- Agora: estados JORNADA / VISAO / TRANSICAO em `cena-2d.js` (um único dono da câmera; tweens soltos da câmera são mortos ao trocar de estado, sem matar os da timeline). Um gesto de rolagem (wheel, toque, PageUp/Down, setas, espaço, Home/End) = uma etapa, por rolagem animada do Lenis (1,1 s, easeInOutCubic) até a pose de repouso; parada no meio faz snap para a pose mais próxima (140 ms de ociosidade, 0,6 s); inércia de trackpad não gera passos extras (detecção de novo gesto); em VISAO qualquer rolagem fecha painel, anima a câmera de volta à pose e enfileira 1 gesto; durante TRANSICAO só 1 gesto fica na fila. `scrub:true` (o Lenis já suaviza), Lenis `lerp:.09`. Decisão: gesto→etapa por Lenis em vez de ScrollTrigger snap/Observer (o Observer não está nos vendors e o snap brigaria com o Lenis).
- Textos com crossfade (visíveis só a ±0,1–0,34 de uma pose): nunca dois textos juntos, nenhum sobre o núcleo em movimento. Painel de detalhes escolhe um canto livre (sem cobrir rótulos, mapa ou dock).
- Medido (1920 e 1365): wheel 30/80/120/240/500 → sempre 1 etapa, repouso a 0,000 do alvo (limite ±0,4%); trackpad de 70 eventos/1434 px → 1 etapa, e inverso volta; inversão e interrupção no snap OK; 6 sequências do modo G sem sobreposição e sem erros; 10 poses + 45 pontos intermediários: 0 sobreposições texto/rótulo/painel/mapa e 0 textos sobre o núcleo.
- Marca v2 (referências minimalistas enviadas pelo Caio: barras de pulso + JARVIS espaçado/leve, e emblema geométrico com ponto de cor): emblema = 5 barras de pulso (alturas irregulares) com o núcleo aceso sobre a mais alta; logotipo em traço mais fino (4,6) e mais espaçado, sem ornamentos no "O" (só o ponto do núcleo). No cabeçalho as barras respiram em onda e o núcleo bate no ritmo de 1,6 s. Ícones regenerados.
### C — veias (✅, `fios-2d.js` reescrito)
- Cada projeto: 1 vaso principal (raiz na SUPERFÍCIE da rede, ponto distinto por vaso; tubo 8→1,8 de espessura com bulbo na raiz ×1,35 e flare no planeta ×1,5; mede 9,7 na raiz × 2,7 no planeta = 3,6×), 2–4 ramos, 4–8 sub-ramos e 7–13 capilares (3 níveis) + 7 vasos que ligam projetos vizinhos (135 caminhos no total, antes 44 fios). PAUSADO: 1 ramo, fino, sem sub-ramos nem onda.
- Splines Catmull-Rom recalculadas a cada quadro da posição ATUAL dos planetas, com balanço de ruído; 1 Mesh de triângulos por projeto (buffers reaproveitados, sem alocação por quadro), textura de tubo por status (miolo claro + halo, laranja→cor do status, pontas mais escuras), blend add. Capilares somem na qualidade adaptativa; os vasos principais nunca.
- Onda de dilatação a cada primeiro tum: largura ×1,6 percorrendo o vaso do núcleo para fora, velocidade = extensão do ramo mais longo / 1,2 s (medido: picos em +0,08, +0,20 e +0,32 s a 20/50/80% do vaso principal). Rótulos ficam acima das veias com sombra de legibilidade.
- Custo medido das veias: ~1 ms/quadro (orçamento 3 ms). Recorte visual conferido (núcleo + 2 veias).
### D — arquivos reais nas veias (✅)
- Os pulsos viraram ícones de arquivo (glifos desenhados em atlas de 96 px, nítidos em DPR 2): planilha, documento, imagem, PDF, dados `{ }` e recibo, com cor própria, leve inclinação, halo e rastro curto de 3 pontos. O tipo combina com o projeto (planilha→planilha/dados; assistente→recibo/PDF; gabinete→documento/PDF; pedalada→imagem/documento…), 20% de sorteio livre.
- Emissão NÃO sincronizada com o batimento: processo de Poisson por veia (intervalos exponenciais, taxa própria sorteada por faixa de status), rajadas ocasionais de 2–4 (14%), arquivos grandes raros (6%, maiores e 45% mais lentos), velocidade com ruído, paradas aleatórias (30% dos arquivos) e caminho aleatório (vaso principal ou principal+ramo). O coração só modula: +10% de taxa/velocidade e +brilho durante a dilatação. NO AR vai e volta; AGUARDANDO poucos e lentos; PAUSADO nenhum.
- Chegada: flash no planeta, o glifo se dissolve em 6 fagulhas. Eventos reais (`MV.evento`): 2 arquivos grandes de cor diferente (documento amarelo p/ aviso, recibo azul p/ pedido) do projeto ao núcleo. Pool de 24 arquivos (14 na qualidade reduzida); movimento reduzido: velocidade ×0,35, sem rajadas/paradas/grandes.
- Estatística (60 s simulados, 191 arquivos): CV dos intervalos por veia 0,87–1,32 (>0,5); média 1,2–2,5 s nas veias ativas (atrasos, aguardando: 7,6 s); coincidências entre veias em ±60 ms: 21 observadas × 28,9 esperadas pelo acaso (em outra rodada 40 × 26 por causa das rajadas); tipos: recibo 47, imagem 46, documento 40, dados 30, pdf 15, planilha 13.
