# Regressão do Jarvão

Inicie `node scripts/visualizar-local.cjs`. Em outro terminal, configure Playwright conforme `README-ignicao.md` e rode `node testes/tudo.cjs`. Chrome instalado, internet e janela em primeiro plano são necessários. Nenhum serviço real é usado. A execução inclui 181 testes, três rodadas de desempenho, jornada/regressões e descarte. Limites de desempenho não são ignorados em caso de falha.

Instalação da ferramenta de teste (não acrescenta biblioteca à aplicação), no PowerShell:

```powershell
npm install --prefix "$env:TEMP\jarvao-playwright" playwright
node testes/tudo.cjs
```

Todos os testes procuram o pacote local `playwright` e depois a instalação temporária acima. Para outra pasta, defina `$env:PLAYWRIGHT_MODULE = 'C:\caminho\node_modules\playwright'`. Se essa variável estiver definida mas incorreta, o teste falha com instrução de instalação; não usa outra versão silenciosamente. Não é necessário baixar Chromium: usamos o Google Chrome instalado no Windows (`CHROME_PATH` permite outro executável).

O runner usa `spawnSync`: cada teste termina e fecha seu Chrome em `finally` antes de iniciar o próximo; as três rodadas também são sequenciais. Execute apenas um runner/diagnóstico por vez e feche outras prévias 3D. Não interaja durante a execução. O monitor registra perda de foco/visibilidade mesmo que a janela volte ao primeiro plano depois; a mensagem `AMBIENTE INVALIDO` reprova a execução. Foco inválido não é tratado como regressão de desempenho nem conta como rodada aprovada.

O Chrome é iniciado com perfil exclusivo em `.playwright-mcp/p8s/chrome-*` (a PWA usa seu perfil `p7c/perfil-*`) e porta CDP aleatória em loopback. Playwright se conecta com `noDefaults:true`, usando só o contexto persistente padrão: seu launch normal emula foco e pode fazer `hasFocus()` mentir sobre uma aba inativa. Desligar a emulação em uma segunda sessão CDP não remove o override da sessão interna original. A regressão do ambiente troca de aba de verdade e exige falha inclusive depois de voltar. `Browser.close` encerra o Chrome exclusivo antes do próximo teste; nenhum perfil pessoal é acessado. Os perfis de diagnóstico permanecem na pasta ignorada.

O arquivo de porta pode aparecer ainda bloqueado/parcial no Windows: somente sua leitura tolera `EBUSY`/`ENOENT`/`EPERM` por até 10 s. Não há repetição automática para aprovar perda de foco, erro funcional ou desempenho. A amostragem tem watchdog independente de RAF e prazo externo de 12 s, para não ficar pendurada quando a aba é oculta. `--diagnostico-sem-saida` exige `--round --ignition-only`, remove a saída do PIN só na resposta HTTP e nunca é aceito como execução completa.

As opções de automação/isolamento do launcher Playwright 1.65.0 foram preservadas (atualizações, extensões e rede de fundo desativadas), sem trocar GPU ou reduzir a cena. Antes de digitar link/PIN, os testes aguardam `NARR.cenaEm(...) === 'acesso'`, opacidade >0,5 e ausência de `aria-hidden=true`; `locator.visible` sozinho aceita opacidade zero e permitia disputar teclas com a saudação durante a viagem. O foco automático continua sendo verificado sem clique nem `focus()` no teste de regressão.

P8s: comparação sem trocar branch, usando o mesmo teste e bootstrap simulado: `node testes/ignicao-browser.cjs --round --revision=b685238` (também `1e2d9aa` e `ec51f86`). Use `IGNICAO_OUTPUT` diferente por revisão. `--round` é diagnóstico sem aceite dos limites; o aceite continua sendo a mediana de três na suíte completa. A comparação substitui as versões históricas de `pc.html`/`landing-roteiro.js` só nas respostas HTTP (únicos arquivos do produto alterados entre esses commits).

Bug novo: reproduza; acrescente primeiro um teste com o nome do bug; confirme que falha; só então corrija e rode tudo. Não transforme gosto em teste. As sondas HTTP falham se o marcador mudar; não alteram o disco nem a lógica da aplicação.

P7b: `node testes/atalhos-browser.cjs` compara os destinos com a função de abertura lida de `origin/main:pc.html`, sem trocar de branch. Usa cliques reais nas telas por projeção 3D, Ctrl K e dock; intercepta `window.open` para não acessar projetos reais. Testa também a proteção do PIN e URL insegura. Já faz parte de `tudo.cjs`.

P7c: `node testes/pwa-v3-browser.cjs` gera o pacote estático e o serve em loopback, sem o bootstrap da prévia. Usa perfil temporário persistente isolado em `.playwright-mcp/p7c/perfil-*` (o Chrome bloqueia instalação no modo anônimo). Valida manifesto e instalabilidade por CDP, escopo do worker, cache alheio, ausência de API/chave no cache, ícones 192/512, primeiro link seguido de PIN após recarga e armazenamento legado em outra origem. Compara hashes dos arquivos legados antes/depois. Não instala app, não publica e não usa o perfil pessoal do Chrome. Incluído em `tudo.cjs`. Lighthouse não é dependência.

Provas negativas, sem modificar os arquivos: `node testes/regressao-browser.cjs --mutacao=declaracao` injeta declaração duplicada; `--mutacao=saudacao` oculta a saudação. Ambos devem terminar com código 1. A saudação é cronometrada após montagem da narrativa; downloads CDN não entram nos 1,2 s. Visibilidade é amostrada a cada 500 ms por 10 s.

Hook opcional local: crie `.git/hooks/pre-commit` com:

```sh
#!/bin/sh
node testes/tudo.cjs
```

Configure `PLAYWRIGHT_MODULE` no ambiente e deixe a prévia ligada antes de commitar. Hooks não são distribuídos pelo Git. Não instalado automaticamente para não bloquear outros fluxos sem prévia.
