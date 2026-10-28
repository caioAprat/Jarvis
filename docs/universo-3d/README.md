# Entrega: ecossistema 3D procedural

Direção solicitada em 28/10/2026. Implementação na branch `visual/jarvis-2d`, com push autorizado; nenhuma alteração, merge ou publicação na main.

## Os cinco módulos

| Pedido | Implementação |
| --- | --- |
| Núcleo exposto | Três SphereGeometry, crosta recortada por Perlin, núcleo emissivo, deformação e pulsação senoidal, rotações X/Y independentes, UnrealBloomPass e OutputPass. |
| Veias orgânicas | 3–5 CatmullRomCurve3/TubeGeometry por projeto, raio/semente variáveis, ShaderMaterial com energia em movimento; campo Perlin atraído sutilmente às conexões. Com os sete projetos de demonstração são 27 veias. |
| Universo | Nenhum atlas/background PNG ou WebP requisitado. Poeira volumétrica em três camadas PointsMaterial, paralaxe de cursor/scroll, planetas com materiais procedurais individuais, RingGeometry e luas em Object3D. |
| Arquivos | Sprites com SVG Lucide PDF, DOC, CODE e DB. Movimento nos dois sentidos com getPointAt e easing senoidal; posições usam a mesma deformação das veias. Proteção contra sobreposição com HTML e entre ícones. Projetos pausados não transmitem. |
| Interface | Header em vidro sutil, fade de opacity 1→0 e Y 0→-50 ao começar a rolagem; estatísticas no dock lateral/inferior com entrada GSAP após inicialização; capítulos acessíveis e navegação existente preservada. |

Código separado em `scene-3d/main.js`, `world.js`, `shaders.js`, `flow.js`, `interface.js` e `cena-3d.css`. Arquitetura, técnicas e licenças: `scene-3d/README.md`.

## Verificações executadas

- Build esbuild e validação de sintaxe: passaram.
- Servidor, Node 22: **140 verificações passaram**, zero falhas.
- `scripts/verificar-3d.cjs`: Three.js/WebGL2, shaders, 27 veias, 12 sprites de arquivo, ausência de atlas/Pixi na rede, paralaxe, 11 posições por viewport, header invisível após iniciar a rolagem, retorno pelo Geral, um único controlador/canvas, busca, criação/remoção de projetos, liberação de geometrias, pausa, movimento reduzido e retomada, perda/ausência de WebGL. Passou nas centrais 1366×768 e 390×844 e na página móvel 390×844. Evidência: `validacao.json`.
- `scripts/migracao-2d/verificar-ui-3d.cjs`: nove cenários de regressão dos controles e integração GET/POST com simulador; passou. Evidência: `testes-ui.json`.
- `scripts/migracao-2d/medir-layout.cjs`: 33 posições em 1920×1080, 1366×768 e 390×844; nenhum texto visível fora da tela, colisão entre textos ou interseção com a caixa do núcleo. Zero erros de console nas três execuções. Evidência: `layout/layout.json`.
- `scripts/verificar-offline-3d.cjs`: reload sem rede carregou cena, shaders, SVG embutido, interface e dados salvos do simulador.
- Prévia `preview/index.html` validada por HTTP em 1366×768 e 390×844: inicialização sem erros de shader, retorno pelo Geral em scroll zero, um controlador e nenhuma dependência externa requisitada. Capturas finais: `preview-final-1366.png` e `preview-final-390.png`.
- A troca reduce→no-preference passou no novo renderer. Não se reutiliza o loop antigo que apresentava essa pendência.

## Desempenho e limites

Medição isolada: seis segundos de aquecimento e seis segundos de amostra; GPU identificada como **ANGLE/SwiftShader**, renderização por software. FPS é a frequência de chamadas de renderização, não comprovação de apresentação física. Resultados em `desempenho.json`:

| Tela | FPS medido | Frame p95 | Qualidade |
| --- | ---: | ---: | --- |
| 1366×768 | 13,29 | 98,6 ms | Adaptativa |
| 390×844 | 23,73 | 51,9 ms | Adaptativa |

Esses números **não comprovam 60 fps ou alta fluidez no hardware do usuário**. A implementação evita reconstrução de malhas por frame, reduz o trabalho do shader de crosta, limita pixels, usa bloom em resolução menor e libera recursos ao atualizar projetos. Falta validar FPS e qualidade no navegador/GPU reais do usuário, especialmente Safari/iPhone. Não houve deploy na produção.

O pedido “exclusivamente open-source” é incompatível com a exigência simultânea de GSAP: Three.js, Lucide e noise usam licenças abertas; GSAP/ScrollTrigger usa licença própria. Essa exceção foi informada e documentada, não ocultada. “Awwwards/FWA” é referência estética, sem certificação ou aprovação desses prêmios.

## Baixar em outro computador e visualizar

Com Git e Node.js instalados, no PowerShell:

```powershell
cd ([Environment]::GetFolderPath('Desktop'))
git clone --branch visual/jarvis-2d --single-branch https://github.com/caioAprat/Jarvis.git Jarvis-3D
cd Jarvis-3D
node scripts/migracao-2d/empacotar-preview.cjs
explorer.exe .\preview
```

Arrastar **Área de Trabalho → Jarvis-3D → preview** para o Netlify Drop ou para a publicação manual do site de demonstração. O `index.html` é gerado automaticamente e inclui dados fictícios. O bundle já está no Git; `npm ci`/`npm run build` só são necessários para recompilar depois de editar os módulos.
