# Créditos dos assets da migração 2D

Nenhuma imagem de banco de assets ou pacote artístico de terceiros foi usada.

| Arquivos / frames | Origem | Licença / direitos |
| --- | --- | --- |
| `assets/scene/nucleo*.{png,webp,json}`: rede, núcleo, anéis | Captura autorizada da arte procedural do próprio Jarvis, commit f2e11e6; script `capturar.cjs`. Glow e corona gerados por SVG neste trabalho. | Arte do projeto e derivações para uso no próprio projeto; nenhuma licença de terceiros atribuída. A distribuição do original permanece sob decisão do titular do Jarvis. |
| `assets/scene/gemas*` | Geometria original do Jarvis, capturada em 64 ângulos; cor neutra para aplicação de status no renderer. | Mesmos direitos da arte original do projeto. |
| `assets/scene/universo*` | 12 planetas, 3 nebulosas e poeira gerados por `gerar-assets.cjs`, semente 7026. | Arte original produzida para este projeto; sem imagem externa incorporada. |
| `assets/scene/fallback-nucleo.webp` | Composição capturada do núcleo original. | Mesmos direitos da arte original do projeto. |
| `docs/migracao-2d/amostras/*` | Capturas e pranchas produzidas pelos scripts desta migração. | Derivações da arte acima. |

Ferramentas de geração, instaladas fora da aplicação: Sharp 0.35.5 (Apache-2.0), free-tex-packer-core 0.3.9 (MIT), simplex-noise 4.0.3 (MIT), Playwright 1.61.1 (Apache-2.0). A captura executa as bibliotecas já usadas pelo original: Three.js 0.128.0 (MIT) e GSAP 3.12.5 (licença própria GSAP). Não são redistribuídas como parte dos atlas. Nenhum plugin Pixi foi instalado nesta etapa.
