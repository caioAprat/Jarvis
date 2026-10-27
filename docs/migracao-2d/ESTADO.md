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

### Etapa 2 — batimento, fios e pacotes (⚠️ em andamento)
- Batimento "tum-tum" analítico (sem sine): período 0,95 s ±3% por ciclo (0,82 s com avisos novos via `nucleo.ritmo(true)`), tum 1 (ataque 70 ms power3.out, escala 1,07) e tum 2 (0,6×, em +0,20 s). Medido em 3 s: picos 1,070 e 1,042 espaçados ~0,19 s, período 0,92–0,95 s.
- `fios-2d.js`: 2 a 5 fios Bézier por projeto + 2 fios secundários entre vizinhos (44 fios, antes 7); extremidades pela posição atual do planeta a cada quadro; pool de 160 pacotes com rastro de cometa.
- Nó recebe flash ao chegar um pacote; evento real via `MV.evento` (ainda não ligado ao pc.html).
