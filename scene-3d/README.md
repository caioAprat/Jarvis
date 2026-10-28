# Jarvão — núcleo e colagem de plasma

A branch mantém o nome `visual/jarvis-2d`. A direção atual usa um canvas Three.js fixo atrás de uma interface HTML independente. Projetos não são objetos 3D: o pedido mais recente substitui os mini-planetas por plasma e cartões editoriais. Rotas, IDs, dados e ações permanecem nos módulos da aplicação.

## Módulos

| Arquivo | Responsabilidade |
| --- | --- |
| `design-tokens.json` / `DesignTokens.js` | Origem única da paleta, bloom e densidade. Gera `design-tokens.css`, variáveis CSS e uniforms GLSL. |
| `SceneSetup.js` | Câmera, renderer, UnrealBloomPass, OutputPass, resolução adaptativa e dispose. |
| `JarvisEntity.js` | Duas esferas: fotografia NASA na crosta recortada e núcleo elétrico. |
| `shaders/earth.frag.glsl` | Abertura estrutural larga, fraturas menores, circuitos e veias pulsantes na superfície. |
| `shaders/energy.frag.glsl` | Energia elétrica com simplex noise baseado em tempo. |
| `Connections.js` | 18 curvas CatmullRom/TubeGeometry, 144 documentos Lucide em um InstancedMesh e 576 pontos de cauda. Fluxos orbitam e mergulham no núcleo, independentes do estado dos projetos. |
| `BackgroundParallax.js` | Cinco planetas decorativos distantes; dois com TorusGeometry achatado. Opacidade protege núcleo e leitura. |
| `Particles.js` | Poeira em três camadas e campo simplex reagindo ao cursor e scroll. |
| `SmoothScroll.js` | Lenis integrado ao ticker GSAP, touch nativo, exclusão de modais e dispose. |
| `GSAPAnimations.js` | Capítulos, composição assimétrica, fade/escala/deslocamento, núcleo acompanhando a leitura e header. |
| `../jornada.js`, `../cena-3d.css` | HTML acessível, cartões alternando posição e largura, plasma CSS e glassmorphism. |
| `../mapa-2d.js` | Logo vetorial de esfera fatiada, gradiente laranja/rosa/roxo, fundo transparente e IDs únicos. `scripts/build-icons.cjs` gera também o favicon e PNGs de instalação com alfa. |

`main.js` preserva a API CenaJarvis. Nenhum sistema solar de projetos ou hit-test de planeta permanece. O próprio botão HTML abre o projeto pelo ID original.

## Ciclo de vida e leitura

Geometrias são construídas na inicialização/atualização de dados, nunca a cada frame. Documentos compartilham textura, geometria e material; caudas usam um BufferGeometry. Os recursos têm dispose explícito. Lenis usa o ticker existente e é destruído ao recriar os capítulos. O modo de movimento reduzido usa rolagem nativa e conteúdo no fluxo HTML. Contexto WebGL perdido mantém a interface funcional com reserva CSS.

As sobreposições da colagem são decorativas (plasma/cartão); somente o capítulo visível recebe cliques e foco. Os arquivos são mascarados perto de textos e docks. O núcleo muda de lado suavemente para acompanhar a composição. Sem vídeo, GIF ou atlas 2D de cena.

## Build e prévia

```sh
npm ci
npm run build
node scripts/migracao-2d/empacotar-preview.cjs
```

O bundle compilado é versionado. Para apenas visualizar, basta executar o último comando com Node.js: gera `preview/index.html` com dados fictícios, fotografia, bibliotecas e estilos embutidos, pronto para Netlify. Nenhum destes comandos publica produção.

## Créditos

Three.js 0.180.0 MIT; Lucide 0.468.0 ISC; Lenis 1.3.11 MIT; simplex Ashima/Stefan Gustavson MIT. Licenças integrais em `vendor/licenses/` e no bundle. Fotografia NASA Blue Marble: `assets/earth/README.md`. GSAP/ScrollTrigger 3.15.0 usa licença própria, não OSI. Técnicas de noise, smoothstep e composição temporal são inspiradas no ecossistema ShaderToy; nenhum shader de terceiro daquele site foi copiado.

Resultados e limites estão em `docs/universo-3d/README.md`. 60 FPS depende da GPU e não é garantido. Awwwards/FWA é referência estética, sem certificação.
