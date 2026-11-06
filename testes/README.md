# Regressão do Jarvão

Inicie `node scripts/visualizar-local.cjs`. Em outro terminal, configure Playwright conforme `README-ignicao.md` e rode `node testes/tudo.cjs`. Chrome instalado, internet e janela em primeiro plano são necessários. Nenhum serviço real é usado. A execução inclui 181 testes, três rodadas de desempenho, jornada/regressões e descarte. Limites de desempenho não são ignorados em caso de falha.

Bug novo: reproduza; acrescente primeiro um teste com o nome do bug; confirme que falha; só então corrija e rode tudo. Não transforme gosto em teste. As sondas HTTP falham se o marcador mudar; não alteram o disco nem a lógica da aplicação.

Provas negativas, sem modificar os arquivos: `node testes/regressao-browser.cjs --mutacao=declaracao` injeta declaração duplicada; `--mutacao=saudacao` oculta a saudação. Ambos devem terminar com código 1. A saudação é cronometrada após montagem da narrativa; downloads CDN não entram nos 1,2 s. Visibilidade é amostrada a cada 500 ms por 10 s.

Hook opcional local: crie `.git/hooks/pre-commit` com:

```sh
#!/bin/sh
node testes/tudo.cjs
```

Configure `PLAYWRIGHT_MODULE` no ambiente e deixe a prévia ligada antes de commitar. Hooks não são distribuídos pelo Git. Não instalado automaticamente para não bloquear outros fluxos sem prévia.
