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
