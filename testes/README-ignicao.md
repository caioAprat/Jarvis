# Teste da ignição (P2b)

Requer Node, Google Chrome instalado, internet para os CDNs e Playwright como ferramenta de teste. Não usa PIN nem serviços reais.

Em um terminal, na raiz do projeto:

```powershell
node scripts/visualizar-local.cjs
```

Em outro terminal, instale a ferramenta numa pasta temporária e rode:

```powershell
npm install --prefix "$env:TEMP\jarvao-playwright" playwright
$env:PLAYWRIGHT_MODULE = "$env:TEMP\jarvao-playwright\node_modules\playwright"
node testes/ignicao-browser.cjs
```

Se Playwright já estiver em `node_modules`, basta o último comando. `PLAYWRIGHT_MODULE` aponta para a pasta do pacote Playwright. A aplicação não ganha dependência nova.

Mantenha a janela do Chrome do teste em primeiro plano, sem interagir até terminar (~15 s mais carregamento). O teste usa 1366×768, vai ao acesso e digita `12345678`. `IGNICAO_URL` permite outra porta local; `IGNICAO_OUTPUT` muda a pasta de relatório.

Grava energia do núcleo, opacidade e uniform de energização das quatro malhas de veias e fps em intervalos nominais de 100 ms por 7 s. O instante real também é registrado: uma pausa do navegador pode atrasar a amostra. As veias têm opacidade 1 por desenho; sua luminosidade varia por `uLuz`/`uCarga`. FPS médio usa todos os intervalos de requestAnimationFrame; o mínimo é o inverso do maior intervalo, sem suavização. As sondas são inseridas na resposta HTTP e não modificam os arquivos da aplicação.

P2c: falha (exit code 1) se média <55 fps ou pior quadro ≥50 ms, energia não passar de 1 após 2,8 s da timeline, veias não energizarem, erro de console/página, amostragem insuficiente ou perda de foco/visibilidade. Mede também cada uma das dez paradas B por 2 s, após 2,5 s de assentamento da câmera, exigindo os mesmos limites e conferindo o ID da cena. Os intervalos de viagem não entram nessa medida das paradas.

`--ignition-only` limita o diagnóstico à ignição; não substitui a execução completa. `--screenshots` salva um PNG de 1366×768 por parada no diretório de saída. `--trace` salva `trace.json` do Chrome (acrescenta custo, usar só para diagnóstico). Execute uma janela de teste por vez: duas cenas WebGL simultâneas invalidam a comparação de desempenho.

Resultado detalhado: `.playwright-mcp/p2b/resultado.json` (ignorado pelo Git). Inclui quadros, amostras, tarefas longas, chamadas WebGL e construção de geometria, com causas sustentadas pelas sondas para os cinco maiores engasgos. Distingue espera de shader, upload e geometria; não atribui o tempo restante sem evidência.

Para investigar CPU:

```powershell
node testes/ignicao-browser.cjs --profile
```

Gera também `ignicao.cpuprofile`, que abre em Chrome DevTools → Performance → Load profile. O profiler acrescenta custo: compare fps entre execuções equivalentes. O diagnóstico identifica operações que contribuem para os engasgos, sem prometer atribuição exata de pausas de GPU/driver nem de uma medição histórica sem perfil.

Regressão geral: `node testes/testes.js`.


Triagem P6: a execução padrão abre três sessões sequenciais independentes e aplica os limites à mediana dos três fps médios e à mediana dos três piores quadros, para a ignição e cada parada. Não descarta rodadas lentas. Erros funcionais, foco, energia e identidade da cena devem passar em TODAS as rodadas. `--round` executa uma rodada de diagnóstico, sem aplicar os limites de desempenho. Cada rodada salva `rodada-N/resultado.json`; `mediana.json` conserva o agregado e as três medições. A navegação espera o fim do portal e do bloqueio do Lenis; a chegada é confirmada pelo ID antes dos 2,5 s de assentamento. As sondas `entry` incluem viagem/entrada e `diagnostic` cobre os 2 s da parada. Nenhuma meta foi relaxada.

Ciclo de vida: com a mesma prévia e `PLAYWRIGHT_MODULE`, rode `node testes/ciclo-vida-browser.cjs`. Verifica encerramento idempotente, remoção de listeners, descarte único de recursos e memória GPU estável em três montagens/desmontagens de protótipo e planeta.
