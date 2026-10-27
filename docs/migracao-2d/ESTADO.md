# Estado da migração — passagem para Claude Code

Branch: `visual/jarvis-refatoracao`. Produção e `main` intactas; nenhum push autorizado.
Checkpoint inicial: `79a3350`, tag `checkpoint-pre-fechamento`.

| Critério | Estado | Evidência / limite |
|---|---|---|
| A — retirada do 3D | ⚠️ parcial | `e9d00a4` removeu motor antigo isoladamente; referências históricas e biblioteca 2D impedem busca literal zero; JS transferido aumentou. |
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

## Pendências
- ✅ Geometria medida nas três viewports; console tem somente erro externo de certificado das fontes.
- ⚠️ Relatório final com métricas medidas; não há build/lint/typecheck configurados.
- ⚠️ CPU, heap e download não diminuíram; 60 fps em hardware real não comprovados.
- ⚠️ Fontes Google: Chromium rejeita CA atual do proxy; corrigir NSS exige acesso fora do projeto, proibido nesta sessão. Não desativar TLS.
- ⚠️ Após duas tentativas, teste novo `verificar-robustez.cjs` falha na troca reduce → no-preference (timeout na retomada). Não insistido; priorizar no Claude. Demais casos testados separadamente.
- ⚠️ Preparar CLAUDE.md, exclusões de temporários e tag final `handoff-claude-code`.

## Rodar e verificar (na raiz do projeto)
`python3 -m http.server 8001 --bind 127.0.0.1`
Abrir `http://127.0.0.1:8001/demo.html` (dados fictícios, sem produção).
`/workspace/.jarvis-tools/node_modules/.bin/node testes/testes.js`
`node scripts/migracao-2d/verificar-ui.cjs`
`node scripts/migracao-2d/verificar-offline.cjs`
`node scripts/migracao-2d/medir-depois.cjs`
Ferramentas já instaladas em `/workspace/.jarvis-audit-tools`; não reinstalar.

## Arquivos-chave
- `cena-2d.js`: sprites, conexões, câmera, ticker e fallback.
- `cena-2d.css` / `jornada.js`: composição e texto acessível.
- `pc.html` / `index.html`: integração com funções existentes.
- `demo.js` / `assets/demo.json`: demonstração isolada.
- `sw.js`: cache offline e push preservado.
- `baseline.json` / `depois.json`: métricas antes/depois, com metodologia.
- `CREDITS.md`: procedência e licenças; assets finais já aprovados tecnicamente.

## Riscos / próximos passos
1. Medir e corrigir F/G; registrar falhas após duas tentativas sem insistir.
2. Fechar A honestamente: não apagar histórico nem adulterar Pixi para zerar palavras.
3. Claude/usuário: polimento estético e teste em GPU/Safari reais antes de publicar.
