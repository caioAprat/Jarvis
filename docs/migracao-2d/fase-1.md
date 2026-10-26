# Fase 1 — captura e preparação dos sprites

A captura executa a fonte original do commit f2e11e6 em Chromium headless. As alterações de visibilidade e transparência existem somente na resposta servida ao navegador de captura; os arquivos do aplicativo permanecem intactos.

Entregues: 96 frames da rede em uma volta completa, 64 frames de gema neutra para coloração por status, núcleo e anéis em camadas, glow e corona procedurais, 12 planetas de fundo, 3 nebulosas e poeira. A arte de fundo é original e determinística (semente 7026). Créditos em `CREDITS.md`.

Os frames da rede mantêm 384×384 pixels e usam máscara neutra com 16 níveis de transparência. A cor âmbar deve ser aplicada no renderer. Os gradientes e planetas ficam em atlas sem redução de paleta para evitar faixas visíveis. PNG de fallback e WebP sem perdas devem produzir pixels visíveis idênticos. Dois atlas para núcleo, um para gemas e um para universo. O manifesto registra o peso real incluindo os dois formatos.

Ferramentas externas à aplicação: Sharp 0.35.5, free-tex-packer-core 0.3.9 e simplex-noise 4.0.3 em `/workspace/.jarvis-asset-tools`; Playwright 1.61.1 em `/workspace/.jarvis-audit-tools`. Instalação com `npm install --prefix <diretório> --save-exact` e versões indicadas. O app continua JavaScript puro.

Reprodução, em `/workspace/Jarvis`, com Node 22:

1. Iniciar servidor HTTP local na porta 8000.
2. Executar `node scripts/migracao-2d/capturar.cjs`. Frames intermediários ficam em `/workspace/.jarvis-capture`.
3. Executar `node scripts/migracao-2d/gerar-assets.cjs`.
4. Executar `node scripts/migracao-2d/validar.cjs` para conferir contagem, transparência, retângulos, equivalência de formatos e limite de 6 MB.
5. Executar `XDG_CACHE_HOME=/workspace/.jarvis-cache node scripts/migracao-2d/amostra.cjs` para a prancha estática.

`amostras/composicao-2d.png` é estudo dos assets com dados fictícios. Não é a interface final nem prova de animação integrada. A integração PixiJS, o carregamento com sequência de boot, o scroll e a substituição do renderer original permanecem nas etapas seguintes. A documentação oficial PixiJS/GSAP está acessível após a atualização de rede.
