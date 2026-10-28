# Reformulação da rolagem e dos projetos

Implementada na branch local `visual/jarvis-2d`, a partir de `050fe9d`, sem publicar ou modificar a main.

## Experiência

- Lenis suaviza a roda uma única vez (0,65 s); a timeline acompanha diretamente a posição de scroll, eliminando o segundo atraso de 1 s.
- Cada capítulo ocupa 112% da altura no desktop e 105% no celular, com trecho estável de leitura, saída suave e entrada do próximo projeto. O mesmo comportamento funciona ao voltar.
- O núcleo permanece visível. O projeto ativo aproxima seu satélite do núcleo, enquanto os demais ficam discretos. A câmera faz apenas mudanças pequenas de escala.
- Satélites circulares vetoriais substituem as gemas quadradas: centro âmbar, anéis concêntricos e arco com a cor do estado. Os antigos atlas continuam preservados no repositório, mas não são mais carregados pela cena ou pelo cache novo.
- Cartões translúcidos âmbar, tipografia organizada, indicador de estado e ação preservada. A conexão sai da posição real do satélite e termina na borda do cartão.
- No celular, núcleo acima e cartão abaixo. Em movimento reduzido, os textos seguem o fluxo normal da página.

## Verificação

- `verificar-motion.cjs`: todos os capítulos, transições e retorno em desktop 1366×768 e celular 390×844; um capítulo interativo por vez, sem overflow horizontal. Evidência em `validacao.json`.
- `medir-layout.cjs`: 33 posições em 1920×1080, 1366×768 e 390×844; nenhuma colisão entre textos, corte ou interseção com a região central do núcleo. Resultados atualizados em `../capturas/layout.json`.
- 140 verificações do servidor passaram com Node 22.
- Onze cenários de interface passaram, incluindo busca, seções, ações simuladas, pausa, fallbacks e movimento reduzido inicial.
- Cache offline validado após a mudança para `jarvis-v6-motion2d`.
- Sete fontes próprias passaram na validação de sintaxe; não há build ou lint configurado.
- Prévia portátil inicializou sem erros JavaScript por HTTP, com as imagens e bibliotecas embutidas. O navegador gerenciado bloqueia URLs `file://`; abertura direta por duplo clique não foi validada neste ambiente.

## Limites conhecidos

- O teste de alternância rápida reduce → no-preference ainda falha na retomada, como já ocorria antes desta alteração. Duas tentativas nesta sessão; não foi declarado corrigido. Uma verificação separada, com 500 ms entre as preferências, retomou normalmente.
- O navegador do ambiente continua rejeitando o certificado das fontes Google; as capturas usam a fonte alternativa. Não foi desativada a verificação TLS.
- As métricas de desempenho anteriores não foram repetidas nem usadas como alegação de melhoria desta reformulação. A aprovação estética depende da revisão do usuário.

## Visualizar

Abra `preview/Jarvao-2D.html` no navegador, após baixar o arquivo. É uma demonstração com dados fictícios; não depende do servidor de produção. Para recriar: `node scripts/migracao-2d/empacotar-preview.cjs`.

No ambiente de desenvolvimento: servir a raiz do projeto e abrir `/demo.html`. Nesta sessão foi usada a porta 8003. A prévia gerada é ignorada pelo Git para evitar uma cópia desatualizada junto ao código.
