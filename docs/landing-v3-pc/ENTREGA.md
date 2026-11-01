# Jornada contínua — PC

Escopo final: versão de PC. O polimento específico de celular foi adiado por orientação do Caio durante a execução.

## Implementação

- GSAP/ScrollTrigger/ScrambleTextPlugin/SplitText 3.13.0, Lenis 1.3.11; Three.js preservado em 0.128.0. Integridade SHA-384 nos scripts externos.
- Unbounded nos títulos e Manrope nas explicações da landing; JetBrains Mono nos rótulos. Saira preservada na central. Paleta original de laranja, creme e estados.
- Câmera única em caminho CatmullRom e timeline mestra `narrativa` com scrub .65; Lenis compartilha o ticker. Sem portal/card com render target ou câmera secundária.
- Fragmentos triangulares instanciados, atributos de origem/destino, interpolação e campo de rotacional calculados no vertex shader. Avançar e voltar o scroll usa o mesmo progresso.
- Cabos físicos com MeshStandardMaterial, luz ambiente/direcional, TubeGeometry/CatmullRom, faixas procedurais, quatro filamentos de cores de estado/laranja e poeira GPU usando uma textura de trajetos. Uma mudança de uniform move milhares de partículas; não há atualização individual delas em JavaScript por frame.
- Textos reais reservam o espaço; a camada visual usa SplitText e ScrambleTextPlugin. Somente caracteres/opacidade mudam. Textos acessíveis e modo sem decodificação para movimento reduzido.
- Quantidade adaptativa de partículas, pixel ratio limitado pelo renderer existente, pausa em aba oculta e liberação de recursos da apresentação ao sair.
- Acesso por link/PIN e APIs da central preservados. Nenhuma alteração em `apps-script/`, `app.html`, credenciais ou lockfiles.
- Cache offline atualizado para scripts, estilos, bibliotecas e fontes. O iniciador local serve CSS e oferece `--rede` para prévia simulada na rede doméstica.

## Verificação

- 140 verificações do servidor passaram antes e depois, com Node 22.
- `node testes/landing-movimento.cjs`: limites de acesso, reversão do scroll e redução da quantidade de partículas passaram.
- Sintaxe dos scripts revisada com `node --check`; projeto sem build ou lint configurado.
- Chromium PC 1366×768: avanço/retorno da narrativa, um canvas, um ScrollTrigger mestre, ausência de overflow, saída para central e ausência de erros JavaScript/shader.
- PIN incorreto rejeitado; PIN correto desbloqueou o fluxo original. Movimento reduzido usa texto em fluxo sem timeline de scroll.
- Limite do ambiente: Chromium/SwiftShader por software. A meta de 60 FPS requer medição no notebook real; o resultado não é uma certificação Awwwards.

## Localização dos módulos

`landing-roteiro.js`: apresentação/dados/acesso. `landing-cinema.js`: caminho da câmera. `landing-particulas.js`: fragmentos e morph GPU. `fios.js`: cabos e poeira GPU. `landing-escrita.js`: tipografia/decodificação. `landing-scroll.js`: Lenis. `landing-movimento.js`: lógica testável. `landing.css`: estilos da apresentação. `mapa-vivo.js`: renderer compartilhado.

## Medição e evidências finais

Na amostra isolada de cinco segundos no Chromium/SwiftShader, foram medidos **11,42 FPS**, com adaptação de qualidade nível 2. Esta medição por software não atingiu 60 FPS e não substitui teste na GPU do notebook. A validação offline passou após instalar o cache de 55 recursos, incluindo bibliotecas e fontes. Capturas de PC foram comparadas com a main obtida apenas por leitura, sem checkout ou alteração.
