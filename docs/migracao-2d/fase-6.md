# Retirada do motor anterior

Removido mapa-vivo.js (648 linhas) e todos os dez carregamentos CDN de motor e pós-processamento nas páginas. Não há modelo, câmera perspectiva, shader de cena ou dependência do motor anterior no aplicativo. Identidade SVG isolada em mapa-2d.js.

A busca literal em todo o repositório não dá zero: os registros de auditoria e scripts de reprodução histórica citam o motor antigo; PixiJS inclui internamente o nome WebGLRenderer para seu renderizador **2D**. Essas ocorrências não são 3D em execução. Apagar a trilha de auditoria ou adulterar a biblioteca apenas para zerar palavras seria incorreto.

As dependências novas e as imagens aumentam o download inicial sem compressão. Não há bundler neste projeto. A redução relevante é retirar geometria, shaders e bloom em tempo real; a medição final informa os bytes reais sem afirmar redução inexistente.
