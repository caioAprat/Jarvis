# Regressão do Jarvão

Inicie `node scripts/visualizar-local.cjs`. Em outro terminal, configure Playwright conforme `README-ignicao.md` e rode `node testes/tudo.cjs`. Chrome instalado, internet e janela em primeiro plano são necessários. Nenhum serviço real é usado. A execução inclui 181 testes, três rodadas de desempenho, jornada/regressões e descarte. Limites de desempenho não são ignorados em caso de falha.

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
