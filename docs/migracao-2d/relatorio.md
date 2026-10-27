# Fechamento da migração 2D

A cena 2D e a jornada estão integradas na branch `visual/jarvis-refatoracao`. O servidor, os testes originais e os workflows não mudaram em relação a `f2e11e6`. Não houve push, troca de branch ou publicação. A retirada do motor anterior já estava isolada no commit `e9d00a4`; não foi refeita.

## Medições antes × depois

Dados completos: [baseline.json](baseline.json) e [depois.json](depois.json). Chromium headless com renderização por software, DPR inicial 1, 5 s de aquecimento e 10 s de coleta com trace. FPS conta chamadas completas do renderizador, não apresentação física. CPU é ocupação da thread principal via CDP; memória é heap JS, excluindo GPU e memória total do processo.

| Medida | Desktop 1920 antes | Desktop 1920 depois | Mobile 390 antes | Mobile 390 depois |
|---|---:|---:|---:|---:|
| Renderizações/s | 7,28 | 18,94 | 23,08 | 47,09 |
| Intervalo médio entre quadros (ms) | 137,36 | 52,78 | 43,26 | 21,23 |
| Intervalo p95 (ms) | 164,20 | 63,60 | 50,50 | 24,40 |
| CPU da thread principal | 98,7% | 99,9% | 29,0% | 99,7% |
| Heap JS utilizado (MiB) | 5,58 | 22,35 | 5,92 | 12,58 |
| JavaScript transferido (KiB) | 222,9 | 983,1 | 198,0 | 983,1 |
| Primeiro render concluído (ms) | 788,6 | 703,2 | 612,1 | 686,8 |

Desktop 1366×768, sem baseline anterior: **19,39 renderizações/s**, intervalo médio **51,52 ms**, p95 **59,70 ms**, CPU **99,8%**, heap **20,10 MiB**, JS **983,1 KiB**, primeiro render **682,0 ms**.

**Limites de comparação:** a rodada atual encontrou erro de certificado ao buscar fontes Google e usou as fontes de sistema; a baseline carregou as fontes externas. A resolução adaptativa reduz o canvas após quadros lentos. O servidor local entrega JS sem compressão, enquanto a baseline usava CDN; bytes transferidos não equivalem a um bundle compilado. Não há bundler no projeto. As requisições de imagens feitas pelos workers do Pixi não aparecem integralmente na sessão CDP da página: `total_encoded_transfer_bytes` é observação parcial e não foi usado como tamanho total dos assets.

O FPS observado aumentou, mas **não houve redução comprovada de CPU, heap ou JavaScript transferido**, e **60 fps não foram atingidos neste ambiente**. Não declarar o critério A integralmente concluído nem prometer desempenho em GPU real a partir desses números.

## Layout e movimento

`scripts/migracao-2d/medir-layout.cjs` mediu 0%, 10%, …, 100% em 1920×1080, 1366×768 e 390×844. Resultado: **33/33 pontos sem texto visível da jornada fora da viewport, colisão entre textos, interseção com o núcleo brilhante ou etapa vazia**. Uma master em cada ponto; 12 planetas criados, 12 visíveis no desktop e cinco no mobile; posições de fundo mudaram com a rolagem. DPR observado ≤ 1, abaixo do limite 2.

As caixas vêm de `Range.getClientRects`; conteúdo intencionalmente invisível é excluído. A região incandescente usa caixa conservadora de raio 90 unidades da cena, sem incluir corona transparente. Isto é uma verificação geométrica com a fixture, não aprovação estética nem garantia para nomes/detalhes arbitrariamente longos. Textos alternam de coluna conforme a órbita; no mobile a câmera sobe para reservar a área de leitura. A troca de conteúdo prioriza leitura contínua; o refinamento estético das transições fica para Claude/usuário.

Capturas salvas, sem abrir imagens nesta sessão: [capturas/](capturas/), incluindo `layout.json`. Não foram regenerados atlas, frames ou planetas. A validação anterior dos assets registrou 180 frames, dois atlas de núcleo e 5.811.598 bytes incluindo PNG/WebP/fallback, dentro de 6 MB.

## Verificações

- `node testes/testes.js` com Node 22: **140 verificações passaram**.
- `verificar-fontes.cjs`: **7 fontes próprias com sintaxe válida**, scripts locais presentes, páginas sem carregamento do motor anterior. Build/lint/typecheck não estão configurados; não foram inventadas etapas equivalentes.
- `verificar-ui.cjs`: **11 cenários passaram**, incluindo oito seções, Ctrl K, conferência, API simulada, adição/remoção de projetos, PNG e falhas de contexto/atlas.
- `JARVIS_ROBUST_CASE=scroll ... verificar-robustez.cjs`: passou para scroll após perda de contexto, saída da jornada e DPR.
- Modo reduzido desde a abertura: passou. **Alternância reduce → no-preference em tempo real: teste adicional falhou em duas tentativas; pendência preservada, sem loop de novas tentativas.**
- Offline: teste anterior passou com HTML, scripts, atlas e dados guardados; lógica de cache/push não foi alterada no fechamento. O script de offline usa a porta 8001.
- Nenhum erro de JavaScript nas regressões. Console da varredura: um erro de certificado das fontes por viewport; não suprimido nem contornado.

## Arquivos e dependências

- Cena e interface: `cena-2d.js`, `cena-2d.css`, `mapa-2d.js`, `jornada.js`, `pc.html`, `index.html`, `sw.js`.
- Demonstração segura: `demo.html`, `demo.js`, `assets/demo.json`; dados fictícios e armazenamento separado.
- Arte final: `assets/scene/`; procedência e licenças em `CREDITS.md`.
- Distribuições locais já existentes: PixiJS **8.22.0**, GSAP/ScrollTrigger **3.15.0**, Lenis **1.3.27**. Nenhuma dependência instalada no fechamento.
- Auditoria e passagem: `scripts/migracao-2d/`, `docs/migracao-2d/`, `CLAUDE.md`, `.gitignore`.
- Removidos: motor antigo em `e9d00a4`; exportação portátil gerada e desatualizada no fechamento. Seu gerador permanece disponível; `demo.html` é a prévia atual.

## Próximos passos

1. Investigar a retomada após mudança da preferência de movimento (teste adicional reproduzível).
2. Com autorização para configuração externa ao projeto, corrigir a confiança no certificado do proxy; não desativar TLS.
3. Reduzir distribuição JS/avaliar carregamento e medir em GPU real e Safari; não modificar dependência só para zerar uma busca textual.
4. Polimento estético pelo Claude/usuário, usando as capturas; publicar somente após autorização própria.

Comandos e estado resumidos em [ESTADO.md](ESTADO.md).


## Polimento desktop 2 (27/10/2026)

Branch `visual/jarvis-2d`, sem push. Núcleo, batimento, fios, pacotes, partículas, mapa de projetos e composição de desktop novos. Detalhes por etapa em [ESTADO.md](ESTADO.md).

### O que mudou
- **Núcleo** (`nucleo-2d.js`): rotação contínua por matemática 2D (1442 vértices/4320 arestas projetados a cada quadro em Mesh `line-list`), corpo de plasma procedural, icosaedro e dodecaedro internos, limbo, 3 anéis com 7 satélites; texturas geradas a 2048 px (1024 no celular) — nenhuma camada é esticada acima de 1,0× do asset. Sem Three.js, sem sequência de quadros. Os atlas `nucleo-0` (96 quadros) deixaram de ser carregados.
- **Batimento** tum-tum analítico (0,95 s ±3%; 0,82 s com avisos novos), onda de choque vetorial, glow com decaimento.
- **Fios** (`fios-2d.js`): 44 fios (antes 7) seguindo a posição atual dos planetas; 160 pacotes com rastro de cometa (ida laranja, volta verde, âmbar lentos, vermelho em erro; nenhum em pausado), flash no planeta ao chegar; eventos reais (`MV.evento`) viram pacotes grandes de outra cor.
- **Partículas** (`particulas-2d.js`): 150 brasas em arco, 80 micro-partículas nos fios, 8 detritos por planeta, cintilação de estrelas.
- **Estrutura**: mapa de projetos (pontos de status, 1–9, G = Visão geral, painel único de detalhes com linha-guia, hover acende o feixe), barra/busca/dock no app, seções de baixo em duas colunas largas sem cartões, retângulo escuro do cabeçalho removido.
- **Nitidez**: a qualidade adaptativa agora só esconde halos extras/plasma B/nós e partículas; a resolução do renderer nunca é reduzida.

### Medições (Chrome headless, software, 1920×1080)
| Critério | Resultado |
|---|---|
| Delta de rotação em 120 quadros | desvio máx. 8e-14 (exigido ±10%) |
| Custo JS do núcleo | 0,2–0,45 ms/quadro (exigido ≤ 3 ms) |
| CPU JS de toda a cena (sem GPU) | 1,9–2,8 ms/quadro |
| Batimento (3 s, passo 1/240 s) | 2 picos por ciclo (1,070 e 1,042), espaçados ~0,19 s; período 0,92–0,95 s |
| Fios | 44 (antes 7), 61 pacotes simultâneos medidos |
| JavaScript raw | 751 KB (antes 983 KB); ~230 KB com gzip |
| Movimento reduzido | loop parado, batimento suave (0,4×), sem erros |
| Perda de contexto WebGL | fallback ativo, scroll nativo, sem erro de JS |
| Celular 390 px | sem erros; 33 fios, densidade de partículas ≈45% |
| Testes do servidor | 140 passam |

**Não medido / limites:** FPS em GPU real. O Chrome headless usa renderização por software (SwiftShader), onde esta cena mais pesada roda a ~3,7 fps a DPR 1 (antes, 18,9 fps com a cena simples); o gargalo é preenchimento de pixels dos halos aditivos de 2048 px, barato em GPU, mas **60 fps não estão comprovados** — precisa de teste na máquina do Caio (e Safari/iPhone). Rótulos sem sobreposição em 1024, 1100, 1365, 1920 e 390 px (afastamento automático); em 800 px o rótulo da Planilha ainda toca o mapa lateral. Os scripts de auditoria do Codex (`verificar-ui.cjs` etc.) não foram executados (dependem do Playwright do sandbox dele); a validação usou um harness equivalente fora do projeto.


## Rodada 2 (27/10/2026): marca, batimento, máquina de estados, veias e arquivos

Comparação com a rodada anterior (mesmo método: Chrome headless por software, 1920×1080):

| Medida | Rodada 1 | Rodada 2 |
|---|---|---|
| Período do batimento | 0,92–0,95 s | 1,56–1,65 s (alerta 1,32–1,36 s) |
| Picos por ciclo / gap entre eles | 2 / ~190 ms | 2 / 279–284 ms |
| Custo JS do núcleo | 0,2–0,45 ms | 0,26 ms |
| Custo JS das veias + arquivos | (fios+pacotes) ~1 ms | 0,9 ms (orçamento 3 ms) |
| CPU JS da cena inteira (sem GPU) | 1,9–2,8 ms | 4,3 ms (veias densas, glifos, partículas) |
| Caminhos de veia/fio | 44 fios | 135 (55 no celular) |
| JavaScript raw | 751 KB | 776 KB |
| FPS (software, adaptativa em 0,65) | 3,7 | 3,9 |
| Testes do servidor | 140 | 140 |

- **Snap (1920 e 1365)**: wheel 30/80/120/240/500 → 1 etapa cada, repouso a 0,000 do alvo (limite ±0,4%); trackpad de 70 eventos (1434 px) → 1 etapa, inverso volta; inversão no meio e interrupção no snap OK.
- **Modo G**: 6 sequências (G→rolar, G→G, G→Esc, G→planeta→rolar, rolar→G→rolar, G→PageDown) sem sobreposição e sem erros; 10 poses + 45 intermediárias: 0 sobreposições e 0 textos sobre o núcleo.
- **Veias**: 1 principal, 2–4 ramos, 4–8 sub-ramos e 7–13 capilares por projeto; afunilamento 9,7 → 2,7 (3,6×); onda atinge 20/50/80% do vaso em +0,08/+0,20/+0,32 s.
- **Arquivos (60 s)**: CV dos intervalos 0,87–1,32; 191 arquivos, 6 tipos; coincidências entre veias 21 (esperado 28,9).
- **Limites**: sem GPU real o FPS não é conclusivo (a cena ficou mais pesada em pixels: halos, glifos, ~135 malhas finas); Safari/iPhone não testados; lint inexistente (`node --check` + testes do servidor).
