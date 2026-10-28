# BIBLIOTECAS.md — o que o Jarvão usa de fato

O projeto **não tem `package.json`** nem build: é HTML + JS puro, sem framework de interface. Todas as bibliotecas vêm por CDN, com SRI (`integrity`), nas tags `<script>`/`<link>` dos HTML. (Os testes em `testes/` rodam com Node puro, sem dependências.)

## 3D

| Biblioteca | Versão | Onde |
|---|---|---|
| Three.js (`three.min.js`, cdnjs) | r128 | `pc.html:187`, `index.html:117`; usada em `mapa-vivo.js` (cena, núcleo, planetas, shaders, estrelas, partículas) |
| `CopyShader.js` (three@0.128.0/examples, jsDelivr) | 0.128.0 | `pc.html:188` (base do pós-processamento) |
| `LuminosityHighPassShader.js` | 0.128.0 | `pc.html:189` (bloom) |
| `EffectComposer.js` | 0.128.0 | `pc.html:190`; `mapa-vivo.js:~216` |
| `RenderPass.js` | 0.128.0 | `pc.html:191` |
| `ShaderPass.js` | 0.128.0 | `pc.html:192` |
| `MaskPass.js` | 0.128.0 | `pc.html:193` |
| `UnrealBloomPass.js` | 0.128.0 | `pc.html:194`; `mapa-vivo.js:218` (brilho do núcleo) |

O iPhone (`index.html`) carrega só o Three.js base: sem pós-processamento, cena em modo `leve`.

## Animação

| Biblioteca | Versão | Onde |
|---|---|---|
| GSAP (`gsap.min.js`, cdnjs) | 3.12.5 | `pc.html:185`, `index.html:116`; `mapa-vivo.js` (hover, entrada, pulsos, câmera, bloom) e `pc.html` |
| GSAP ScrollTrigger | 3.12.5 | só `pc.html:186`; uso em `pc.html:653-667` (topo some com scrub; blocos sobem em lote) |

## Interface

| Recurso | Versão | Onde |
|---|---|---|
| Google Fonts: Saira (300–700), Michroma, JetBrains Mono (400–600) | CSS2 API | `pc.html:14`, `index.html:17` |
| Ícones | — | SVG próprios no código (`ico()` em `pc.html`, `MapaVivo.icone/logo` em `mapa-vivo.js`, `icons/`); nenhuma biblioteca de ícones |

Sem React/Vue/Tailwind/UI kit, sem biblioteca de gráficos (as barras de histórico são `<i>` com CSS).

## Fora da interface (para referência)

`sw.js` (service worker próprio, sem Workbox), Apps Script no servidor (`apps-script/`), `clasp` e GitHub Actions só para publicar.
