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

Falha (exit code 1) se média <50 fps, energia não passar de 1 após 2,8 s da timeline, veias não energizarem, erro de console/página, amostragem insuficiente ou perda de foco/visibilidade. Não exige mínimo instantâneo de 50 fps.

Resultado detalhado: `.playwright-mcp/p2b/resultado.json` (ignorado pelo Git). Inclui quadros, amostras, tarefas longas, chamadas WebGL e construção de geometria, com causas sustentadas pelas sondas para os cinco maiores engasgos. Distingue espera de shader, upload e geometria; não atribui o tempo restante sem evidência.

Para investigar CPU:

```powershell
node testes/ignicao-browser.cjs --profile
```

Gera também `ignicao.cpuprofile`, que abre em Chrome DevTools → Performance → Load profile. O profiler acrescenta custo: compare fps entre execuções equivalentes. O diagnóstico identifica operações que contribuem para os engasgos, sem prometer atribuição exata de pausas de GPU/driver nem de uma medição histórica sem perfil.

Regressão geral: `node testes/testes.js`.
