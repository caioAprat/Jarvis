# Base para a refatoração visual do Jarvis

Análise em 26/10/2026, a partir do commit `f2e11e69e435e4b9394f69f35fea9acc03e51ad0`.
Branch de trabalho: `visual/jarvis-refatoracao`. Nesta etapa apenas regras e documentação foram acrescentadas; o aplicativo não foi modificado nem publicado.

## Como o projeto funciona

O Jarvis tem duas telas que consultam um servidor no Google Apps Script. O servidor monitora os projetos e guarda os resultados na conta Google. As telas apresentam esses resultados e enviam comandos quando você usa determinados botões.

| Parte | Responsabilidade |
| --- | --- |
| `index.html` | App do celular: acesso, situação geral, mapa, dinheiro, clientes, projetos, avisos, notificações e ações rápidas. |
| `pc.html` | Central com oito seções: visão geral, clientes, pedidos, publicações e versões, assistente, mapa dos projetos, avisos e registro, ajustes. |
| `mapa-vivo.js` | Marca, ícones e núcleo animado com projetos em órbita; usado pelas duas telas. Usa Three.js para desenhar em 3D e GSAP para animar. |
| `sw.js` | Service worker: programa do navegador que guarda telas para uso sem internet e recebe notificações, mesmo com a tela fechada. |
| Manifests e `icons/` | Nome, ícones e aparência do aplicativo instalado no celular ou PC. |
| `apps-script/Codigo.gs` | Monitoramento, estados, permissões, avisos, assinatura e envio de push, entradas das requisições. |
| `apps-script/Google.gs` | Execuções da planilha, cópias no Drive, tamanho da planilha, rotina diária e versões do Apps Script. |
| `apps-script/Pc.gs` | Painel completo, pedidos, ponte para configurações do assistente e consulta de publicações. |
| `testes/simulador.js` | Imitação local dos serviços Google e respostas externas. Não acessa os serviços reais. |
| `testes/testes.js` | 140 verificações das regras do servidor. |
| `testes/exemplo-pc.js` | Gera dados fictícios do painel em arquivo ignorado pelo Git. Não cria um servidor de demonstração. |
| `pedidos.py` | Utilitário para consultar e atualizar pedidos reais; precisa de `.chaves` local. Não executar para testar o visual. |
| `.github/workflows/publicar.yml` | Testa e publica o servidor em pushes elegíveis à main; também permite acionamento manual. |
| `.clasp.json` | Aponta para o projeto real no Google. Uma branch diferente não muda esse destino. |
| `privacidade.html` | Explicação pública sobre uso dos dados. |

Não há React, bundler, dependências npm da aplicação ou etapa de build. HTML define a estrutura; CSS define aparência; JavaScript define comportamento. Hoje os três estão juntos nas páginas. O servidor é separado, mas o visual e as ações de cada página estão bastante conectados.

## O que deve continuar funcionando

No celular: entrada pelo link, recusa de chave inválida, dados guardados quando falta conexão, atualização, prioridade para clientes, indicação de problema e atenção, resumo financeiro, disponibilidade, pausa do bot de atrasos, leitura do banco, avisos vistos e ativação/recuperação/teste de notificações.

No PC: navegação pelas oito seções, busca por Ctrl/Cmd+K, seleção de projetos, relatórios de disponibilidade, detalhes dos clientes e da planilha, criação e cancelamento de pedidos, filtros, rascunhos persistentes, versões, confirmações de retorno de versão, configurações do assistente, registros, tokens e ajustes. Preservar foco e texto digitado quando a tela se atualiza.

O monitoramento inclui Gabinete Chamados, Planilha J Hissnauer, Assistente financeiro, Painel Meu dinheiro, Pedalada do Delei, Bot de atrasos e Caçador de clientes. O mapa inclui ainda o próprio Jarvis e Print cropado. Os outros projetos aparecem como integrações; seus códigos completos não estão neste checkout.

Os estados têm significados diferentes: funcionando, atenção, problema, pausado, configurar e aguardando. Falta de resposta pode manter o último estado com indicação de dados antigos. A reformulação visual não pode confundir essas situações.

## Pontos que exigem cuidado

1. **Código separado não significa servidor separado.** Com um link de acesso real, uma cópia da tela pode criar pedidos, alterar configurações, disparar notificações e voltar versões reais. A demonstração deve simular essas respostas.
2. **Armazenamento do navegador.** As páginas guardam acesso e rascunhos; o service worker guarda configurações de push e telas. Uma demonstração no mesmo domínio/escopo pode compartilhar esse estado. Usar origem isolada e armazenamento próprio antes de testes visuais com interação.
3. **Redesenho das telas.** O JavaScript substitui o conteúdo da tela frequentemente. Botões usam identificadores e atributos para acionar funções. Trocar a estrutura exige manter ou adaptar essas conexões e preservar foco, formulários e seleção.
4. **Animação compartilhada.** O núcleo também produz marca e ícones. Ele possui modo leve no celular, redução de efeitos conforme desempenho e adaptação à preferência por menos movimento. A lista precisa continuar utilizável quando o 3D falha.
5. **Dependências externas.** Fontes vêm do Google Fonts; animações e 3D vêm de CDNs, com verificações de integridade nos scripts. Considerar falha de carregamento e telas menores; não remover verificações para resolver problemas de instalação.
6. **Atualização e offline.** O cache atual distingue a página de PC da de celular. Uma futura publicação visual precisa tratar versão do cache e arquivos novos para evitar misturar versões.
7. **Permissões.** O servidor distingue administrador, PC, leitura, aviso e batida. O nome “leitura” também permite ações rápidas específicas. A refatoração não deve ampliar ou restringir esses contratos por acidente.

## Observações existentes, sem correções nesta etapa

- O README descreve menos recursos que o código atual e fala em chave de batida para avisos; o código/testes exigem chave de aviso ou de administrador para esse envio.
- Alguns comentários de monitoramento descrevem limites diferentes da implementação atual. Para a refatoração, preservar o comportamento testado, sem alterar regras de alarme por causa desses comentários.
- O painel considera backup ligado quando a propriedade não é `nao`, mas a rotina só copia quando ela é `sim`. Com propriedade ausente, a indicação e a execução podem divergir. É um ponto funcional separado, não uma mudança visual a fazer silenciosamente.
- A política de privacidade afirma que o conteúdo das planilhas não é copiado, enquanto o código permite cópia integral quando o backup é habilitado. Esse texto merece revisão específica antes de habilitar ou apresentar essa opção em um novo fluxo.

## Sequência recomendada

1. Preparar uma demonstração isolada com dados fictícios e ações simuladas, aproveitando o simulador existente. Isso permite clicar e experimentar sem atingir produção.
2. Definir a organização das informações: o que é mais importante, o que aparece primeiro e como navegar no celular e no PC.
3. Definir um conjunto coerente de cores, tamanhos, espaçamentos, botões e estados. Isso é o sistema visual: regras comuns que deixam as telas consistentes.
4. Aplicar a nova aparência por partes, preservando os contratos de dados e os comportamentos. Decidir separadamente a evolução do núcleo animado, sem presumir que deve ser removido.
5. Validar telas pequenas e grandes, teclado, foco, contraste, movimento reduzido, carregamento, ausência de dados, erro de acesso e desconexão. Conferir as ações contra o simulador.
6. Manter o resultado na branch paralela. As regras atuais proíbem alteração da main; não planejar merge ou publicação sobre a versão principal.

## Evidências e limites desta leitura

Foram lidos todos os arquivos textuais rastreados, incluindo configurações ocultas e testes; os três ícones PNG também foram inspecionados. A suíte passou com Node 22.23.4: 140 verificações, zero falhas. Nenhum arquivo anterior foi modificado.

Isso não comprova comportamento no navegador, funcionamento real em iPhone ou disponibilidade de produção. Não foram acessadas contas Google, dados privados, tokens, configuração remota do Pages ou os códigos dos demais projetos. Esses acessos não são necessários para começar a refatoração visual isolada. Quando uma etapa realmente depender deles, identificar a necessidade e conferir o acesso existente sem expor segredos.
