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

## Bibliotecas da aplicação 2D

- PixiJS **8.22.0**, MIT: `vendor/pixi.min.js`, licença em `vendor/pixi.js-LICENSE.txt`. [Projeto](https://pixijs.com/).
- GSAP e ScrollTrigger **3.15.0**, licença padrão gratuita GSAP: `vendor/gsap.min.js`, `vendor/ScrollTrigger.min.js`. Aviso de licença preservado nos arquivos; termos em https://gsap.com/standard-license/ . Não se trata de licença MIT. Uso comercial gratuito conforme https://gsap.com/pricing/ .
- Lenis **1.3.27**, MIT: `vendor/lenis.min.js`, `vendor/lenis.css`; licença em `vendor/lenis-LICENSE.txt`.
- Saira, Michroma e JetBrains Mono: fontes já usadas pelo projeto, fornecidas pelo Google Fonts, sob SIL Open Font License. Sem conexão, continuam disponíveis as fontes de sistema declaradas no CSS.
  Licenças oficiais: [Saira](https://github.com/google/fonts/blob/main/ofl/saira/OFL.txt), [Michroma](https://github.com/google/fonts/blob/main/ofl/michroma/OFL.txt), [JetBrains Mono](https://github.com/google/fonts/blob/main/ofl/jetbrainsmono/OFL.txt).

Sem plugin de filtro ou emissor externo: partículas usam a API nativa do PixiJS. A demonstração usa exclusivamente o simulador local do Jarvis e não contém credenciais de produção.
