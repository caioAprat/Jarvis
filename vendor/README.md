# Dependências locais

Distribuições oficiais, versões exatas, sem CDN em tempo de execução:

- pixi.js 8.22.0, **build enxuto** (`vendor/pixi.min.js`): só WebGL (sem WebGPU e sem canvas), gerado com esbuild a partir do pacote oficial; receita em `scripts/migracao-2d/pixi-enxuto/` (`npm i pixi.js@8.22.0 esbuild` e `node build.mjs`). 843 KB → 536 KB (237 → 158 KB com gzip). O original oficial continua no histórico do Git.
- gsap 3.15.0 / dist/gsap.min.js e dist/ScrollTrigger.min.js
- lenis 1.3.27 / dist/lenis.min.js e dist/lenis.css

Obtidas via npm em instalação de ferramentas fora da raiz. Nenhum framework foi adicionado; páginas continuam JavaScript puro sem etapa de build. Licenças MIT em arquivos locais; GSAP mantém cabeçalho de copyright e URL da licença padrão gratuita. Veja CREDITS.md.

`versions.json` contém tamanho e SHA-256 para conferir os arquivos distribuídos. Source maps opcionais não são distribuídos.
