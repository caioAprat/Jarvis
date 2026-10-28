# Entrega: núcleo exposto e colagem editorial

Atualização de 28/10/2026 na branch `visual/jarvis-2d`. Main e produção preservadas. A etapa anterior de Terra procedural foi concluída no commit `905cce0`; a direção mais recente substitui seus mini-planetas por UI/plasma.

## Resultado

- Canvas Three.js fixo atrás da interface. Lenis e ScrollTrigger compartilham o ticker GSAP, com entradas por fade, deslocamento, escala e diferentes composições de cartão.
- Jarvis com duas esferas: crosta NASA Blue Marble cortada por uma fenda larga, circuitos/veias em GLSL e energia interna simplex, com bloom.
- 18 fluxos curvos e 144 documentos instanciados, mais 576 pontos formando caudas. Arquivos orbitam e mergulham no núcleo. Este tráfego é decorativo e não representa execuções reais dos projetos.
- Projetos em HTML com plasma orgânico CSS, posições e larguras alternadas; sobreposição apenas decorativa. IDs, ações, dados, navegação e estados continuam na aplicação original.
- Novo SVG transparente de esfera fatiada, gradiente laranja/rosa/roxo. Paleta central em `scene-3d/design-tokens.json`, exportada para CSS e shaders.
- Recursos liberados na desmontagem, resolução adaptativa, modo de movimento reduzido, funcionamento offline e reserva visual sem WebGL.

Módulos, shaders e licenças: [scene-3d/README.md](../../scene-3d/README.md).

## Verificação

- Build e sintaxe passaram; 140 verificações do servidor em Node 22 passaram.
- Cena: desktop 1366×768 e celular 390×844 nas páginas PC/mobile; 11 posições por tamanho. Sem erro de shader, overflow ou multiplicação de controladores ao voltar pelo Geral. Testes de atualização de dados, pausa, preferências e perda de contexto passaram (`validacao.json`).
- Nove cenários da interface, incluindo oito seções e integração GET/POST com simulador, passaram (`testes-ui.json`). Nenhum teste usa produção.
- 33 posições em 1920×1080, 1366×768 e 390×844: sem texto fora da tela, sobreposição entre textos ou interseção com a caixa do núcleo; zero erros (`layout/layout.json`).
- Prévia exportada passou em 1366×768 e 390×844: âncora suave, abertura de Gabinete Chamados/Pedalada do Delei pelos caminhos originais, retorno pelo Geral, um canvas/controlador e nenhuma dependência externa (`preview.json`). Offline passou com dados do simulador.
- SVG e PNGs do novo logo preservam o fundo transparente; alfa dos PNGs verificado no build.

## Limites

O ambiente de teste renderiza por software com ANGLE/SwiftShader. A medição em `desempenho.json` usa seis segundos de aquecimento e seis de amostra; mede chamadas de render, não apresentação física. Resultados: **17,25 FPS / p95 67,2 ms em 1366×768** e **24,01 FPS / p95 59,4 ms em 390×844**, com qualidade adaptativa. Não comprova 60 FPS na GPU do usuário. Safari/iPhone real ainda requer validação no dispositivo. Awwwards/FWA é referência estética, não certificação.

Lenis, Three.js e os shaders de noise têm licenças abertas. GSAP/ScrollTrigger tem licença própria; não é apresentado como open-source OSI.

## Visualizar no Netlify

Com Git e Node.js instalados, PowerShell, para um computador novo:

```powershell
cd ([Environment]::GetFolderPath('Desktop'))
git clone --branch visual/jarvis-2d --single-branch https://github.com/caioAprat/Jarvis.git Jarvis-3D
cd Jarvis-3D
node scripts/migracao-2d/empacotar-preview.cjs
explorer.exe .\preview
```

Arraste a pasta **Área de Trabalho → Jarvis-3D → preview** para https://app.netlify.com/drop. A prévia usa dados fictícios e não publica nem altera o servidor real.

Se já tem a pasta, entre nela e use `git pull --ff-only origin visual/jarvis-2d` antes de rodar o exportador. O bundle já está versionado; não precisa instalar dependências para gerar a prévia.
