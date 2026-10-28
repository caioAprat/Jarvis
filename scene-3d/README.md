# Universo procedural Jarvão

Esta arquitetura substitui o renderer Pixi e seus atlas na aplicação. O nome da branch continua `visual/jarvis-2d` por continuidade do trabalho; o renderer atual é Three.js. Os arquivos 2D antigos permanecem como histórico e não são carregados por `pc.html`, `index.html` ou pelo novo cache offline.

## Módulos

| Módulo | Responsabilidade |
| --- | --- |
| `main.js` | WebGLRenderer, PerspectiveCamera, EffectComposer, UnrealBloomPass, OutputPass, único ticker GSAP, ciclo de vida e adaptação de resolução. |
| `world.js` | Três SphereGeometry para energia/crosta/fragmentos; planetas procedurais, RingGeometry, luas em Object3D, três camadas PointsMaterial e partículas Perlin. |
| `shaders.js` | Vertex/fragment shaders GLSL: deslocamento de superfície, fraturas por noise, energia pulsante, iluminação procedural, fluxo nas veias e campo de partículas. |
| `flow.js` | 3–5 CatmullRomCurve3 + TubeGeometry por projeto; raio/semente variáveis; Sprite com SVG Lucide PDF/DOC/CODE/DB; getPointAt e easing senoidal nos dois sentidos. |
| `interface.js` | ScrollTrigger dos capítulos, fade/Y=-50 do cabeçalho, entrada do dock depois da cena, acessibilidade e desmontagem ao trocar de seção. |
| `../cena-3d.css` | Glassmorphism, tipografia de sistema, header flutuante, estatísticas laterais/inferiores, responsividade e fallback CSS. |

O arquivo `cena-3d.js` na raiz é o bundle compilado. Ele preserva a API `CenaJarvis` consumida pela aplicação, de modo que dados, ações, autorização, busca e notificações existentes continuem usando os mesmos caminhos.

## Decisões de renderização

- As malhas dos tubos são construídas uma vez por atualização de projetos. O deslocamento do planeta é aplicado no vertex shader; os sprites aplicam a mesma transformação sobre `getPointAt(t)`. Não há reconstrução de TubeGeometry por frame.
- O núcleo usa noise por vértice para deslocamento e parte da aparência, reduzindo avaliações caras por fragmento. O fragment shader recorta a crosta para revelar a energia interna.
- O bloom tem alvos internos de menor resolução e limiar HDR. Ícones brancos ficam abaixo do limiar para não perder seus detalhes no glow.
- As partículas próximas usam Perlin no vertex shader e atração sutil aos segmentos núcleo–projetos. A poeira distante usa PointsMaterial em três profundidades e acompanha cursor/scroll.
- DPR máximo 1,5 e orçamento inicial de 1,1 milhão de pixels. Quadros persistentemente lentos reduzem o orçamento para 650 mil pixels. Trata-se de uma proteção adaptativa, não de garantia de FPS.
- Há um ticker GSAP para o renderer. Visibilidade da página, pausa e troca de seção suspendem o loop. Movimento reduzido preserva o conteúdo no fluxo HTML.
- Sem WebGL2 ou após perda de contexto, a cena usa uma reserva CSS e mantém os controles e textos. A reserva não tenta simular a experiência 3D completa.

## Compilar e visualizar

```sh
npm ci
npm run build
node scripts/migracao-2d/empacotar-preview.cjs
```

Para apenas baixar e visualizar a branch, não é necessário instalar as dependências: o bundle já está versionado. O exportador usa somente Node.js e produz `preview/index.html` pronto para Netlify, com bibliotecas, shaders, ícones e dados de demonstração embutidos.

Para desenvolver, servir a raiz por HTTP e abrir `demo.html`. Nenhum comando de build/exportação publica a produção.

## Referências e licenças

- Three.js 0.180.0, MIT; Lucide 0.468.0, ISC com partes Feather/MIT; esbuild 0.25.10, MIT.
- Perlin clássico adaptado de [Stefan Gustavson / webgl-noise](https://github.com/stegu/webgl-noise), MIT. Licença integral em `vendor/licenses/webgl-noise-MIT.txt`.
- Os efeitos próprios seguem a técnica de composição procedural por tempo, noise, smoothstep e mistura de cores usada no ecossistema ShaderToy: [convenções ShaderToy](https://www.shadertoy.com/howto), [FBM — Inigo Quilez](https://iquilezles.org/articles/fbm/). Não foi copiado código de shaders publicados por terceiros no ShaderToy; suas licenças não são presumidas.
- Os avisos completos de Three.js, Lucide e webgl-noise são incorporados também no bundle e na prévia.
- **Exceção ao requisito “exclusivamente open-source”:** GSAP/ScrollTrigger 3.15.0 foi mantido por exigência explícita da stack, mas usa licença própria GSAP, não uma licença open-source OSI. O requisito literal é incompatível com exigir GSAP.
- Não há chamada ao Google Fonts. A interface usa fontes de sistema, para funcionar offline sem o problema anterior de certificado.

Resultados e limites de teste em `docs/universo-3d/README.md`. O padrão Awwwards/FWA é uma direção estética; não há certificação ou aprovação desses prêmios.
