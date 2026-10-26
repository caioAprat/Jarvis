# Fase 0 — auditoria da migração 3D → 2D

Estado atualizado: **Fase 0 concluída no ambiente cloud**, com referências e medições da cena original. O usuário publicou a liberação de rede; os recursos e a documentação agora respondem normalmente. A seção de bloqueios abaixo mantém o histórico do diagnóstico anterior.

## Stack confirmada antes de instalar ferramentas

JavaScript puro, HTML e CSS, sem React/Vue/Svelte, `package.json`, lockfile, bundler, lint ou typecheck configurados. A aplicação carrega bibliotecas por CDN. O CI usa Node 22 para executar `node testes/testes.js`. Nenhum framework foi trocado e nenhuma dependência foi adicionada ao aplicativo.

Playwright **1.61.1** foi instalado somente como ferramenta de auditoria em `/workspace/.jarvis-audit-tools`, fora do checkout; Chromium **154.0.8037.57** já estava instalado. Node usado: **22.23.4**. A versão foi fixada no comando de instalação. PixiJS, Lenis e plugins não foram instalados: pertencem às fases seguintes e sua documentação/compatibilidade será verificada antes.

## Arquivos com 3D e pontos de integração

| Arquivo | Uso atual | O que preservar |
| --- | --- | --- |
| `mapa-vivo.js:117–180` | Código GLSL: ruído, plasma, fluxos, pulsos, partículas da casca e estrelas. | Aparência como referência para capturas, sem transportar shaders 3D ao resultado final. |
| `mapa-vivo.js:183–220` | `THREE.WebGLRenderer`, Scene, câmera em perspectiva, texturas canvas, composição e bloom. | API pública, opções leve/fundo e fallback quando não há renderizador. |
| `mapa-vivo.js:221–349` | Interação espacial, esfera/plasma, poliedros, malha, anéis, satélites, poeira, estrelas, pulsos e rastro. | Núcleo, paleta e hierarquia visual como referência antes de remover. |
| `mapa-vivo.js:350–440` | Nós por projeto, gemas, halos, órbitas, fios Bézier, rótulos HTML, seleção e varredura. | Uma ligação por projeto e identificação/status vindos dos dados. |
| `mapa-vivo.js:441–614` | Loop GSAP, projeção 3D → tela, movimento, pooling, qualidade adaptativa, resize, visibilidade e interação por raio. | Pausa, modo leve, adaptação de desempenho e movimento reduzido. |
| `mapa-vivo.js:616–648` | Interface `MapaVivo`: atualizar, varredura, selecionar, modo, rolagem, pausar, destruir, depurar; identidade logo/marca/ícones/limpeza. | Contratos usados por ambas as páginas. A identidade também vive neste arquivo; não simplesmente apagar o arquivo inteiro. |
| `pc.html:185–195` | Three.js **0.128.0**, sete scripts de pós-processamento da mesma versão, GSAP **3.12.5** e ScrollTrigger **3.12.5**; CDN com integridade. | Dependências originais intactas até terminar captura/validação. |
| `pc.html:262–263, 635–668` | Monta mapa fixo, sincroniza projetos, seleciona/abre sistemas, controla rolagem, modo palco/fundo e revelação de conteúdo. | Busca, navegação, indicadores, botões e ações. |
| `index.html:116–118, 167–173, 279–287` | Three.js **0.128.0**, GSAP **3.12.5** e mapa leve; seleção navega até a linha do projeto. | Uso mobile, rótulos, seleção e lista utilizável sem 3D. |

A busca percorreu os arquivos rastreados. Não há `@react-three/*`, modelos glTF, HDR, pacotes 3D npm ou outros renderizadores de aplicação. O canvas 2D de `textura()` gera texturas para o 3D atual; distinguir esse uso de desenho 2D futuro. `sw.js` não cria 3D, mas guarda páginas e precisa ser considerado na futura atualização de arquivos.

## Dados e controles

O código contém **sete projetos monitorados**, não seis: Gabinete, Planilha, Assistente financeiro, Painel, Pedalada, Atrasos e Caçador. Há mais duas entradas no mapa administrativo, Jarvis e Print cropado, que não são satélites monitorados. A nova cena deve acompanhar os dados, sem limitar a quantidade a seis.

O PC preservará oito seções, os quatro indicadores do topo, busca Ctrl/Cmd+K, Conferir tudo, dock inferior, pedidos e rascunhos, clientes e relatórios, publicações/versões, assistente, avisos e ajustes. O celular tem acesso, dados offline, resumo financeiro, projetos/clientes, avisos, ações rápidas e push. Estados adicionais existentes: problema, atenção e configurar. Não converter toda condição não verde em aguardando.

A branch isola código; `.clasp.json` continua apontando ao servidor real. Nada de publicar, importar chaves ou usar produção para capturas. O roteiro de diagnóstico usa o simulador existente para responder à API em uma origem local, com chave fictícia e contexto de navegador novo, sem service worker. Bibliotecas visuais não são substituídas ou interceptadas.

## Histórico do diagnóstico anterior à liberação

- Não há screenshot da tela atual na árvore rastreada: apenas três ícones PNG e um SVG. Capturas válidas da cena original ainda precisam ser produzidas em 1920×1080 e 390×844.
- `curl` e Chromium confirmaram bloqueio de acesso a `cdnjs.cloudflare.com` e `fonts.googleapis.com`. Sem GSAP e Three.js, não há canvas da cena.
- A documentação oficial `https://playwright.dev/docs/api/class-page` e `/class-tracing` retornou HTTP 403. Para o diagnóstico foram consultadas as declarações/documentação fornecidas pelo próprio pacote oficial Playwright instalado (newCDPSession, rotas, screenshots e eventos de requisição).
- O navegador inicialmente recusava o certificado do proxy ao carregar jsDelivr. Foi concedida escrita em `/home/agent/.pki/nssdb` e importada a CA **já fornecida pela plataforma**, usando certutil. Após isso, os sete scripts do jsDelivr carregaram sem falhas TLS. Nenhuma verificação TLS ou integridade foi desativada.
- Domínios necessários foram adicionados ao rascunho de rede: `cdnjs.cloudflare.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, `playwright.dev`. O preset de gerenciadores de pacotes e os demais campos foram preservados. O salvamento foi confirmado; não significa aplicação/publicação.
- As imagens em `diagnostico/*-incompleto.png` mostram o carregamento incompleto. **Não são referências visuais aprovadas** e não servem para comparar qualidade ou desempenho 3D.
- `baseline.json` registra tamanhos locais, ambiente, erros e diagnóstico CDP bruto. FPS, CPU, memória da cena, primeiro render e transferência completa permanecem `null`, pois a cena não executou. Uma medição da página sem 3D produziria uma comparação enganosa.

## Como reproduzir o diagnóstico

1. Instalação externa, se necessária: `npm install --prefix /workspace/.jarvis-audit-tools --cache /workspace/.npm-cache --no-save --package-lock=false playwright@1.61.1`.
2. Iniciar `python3 -m http.server 8000 --bind 127.0.0.1 --directory /workspace/Jarvis`.
3. Em `/workspace/Jarvis`: `/workspace/.jarvis-tools/node_modules/.bin/node docs/migracao-2d/scripts/diagnosticar.cjs`.
4. Conferir o status e os erros em `baseline.json`. O script é diagnóstico, não afirma que coletou uma linha de base válida mesmo se a página passar a carregar.

O proxy é usado para os destinos externos. Somente localhost é excluído dele para acessar o servidor local; nenhum destino externo é acessado por rota alternativa.

## Protocolo definido para a linha de base

Após a liberação de rede, verificar renderização e recursos sem erros, registrar GPU/renderizador efetivo e se a execução é por software. Capturar cena completa original em desktop 1920×1080 e celular 390×844, usando os mesmos dados e DPR na comparação futura. Deixar animações iniciais assentarem antes de amostrar.

Coletar trace DevTools com janela definida (proposta: 10 s após 5 s de aquecimento), FPS **de renderização da cena**, CPU pelo delta de TaskDuration/tempo da janela, heap JS por CDP e primeiro quadro da cena instrumentado antes de iniciar o renderizador. Registrar separadamente FCP, que pode mostrar apenas o acesso/loading. Somar bytes efetivamente transferidos via rede e distinguir fontes locais de dependências CDN: não existe bundle compilado. Repetir com o mesmo roteiro de scroll e ambiente antes/depois. Não usar FPS de requestAnimationFrame como prova de FPS do renderizador, nem heap JS como memória total de GPU/processo.

Se a máquina não oferecer renderização gráfica adequada, informar a limitação e solicitar o ambiente necessário ao usuário antes de afirmar desempenho em hardware modesto. Uma resolução de celular em Chromium desktop não valida Safari/iPhone real.

## Verificação e limite da entrega desta fase

`node testes/testes.js`: **140 verificações passaram; 0 falhas**. Nenhum arquivo anterior da aplicação foi alterado. Captura por camadas, novos sprites e migração ainda não começaram.

A pendência de autorização de rede foi resolvida. Nenhuma nova ação de liberação é necessária para concluir esta fase.


## Direção visual atualizada pelo usuário

A prioridade é deixar o Jarvão muito mais bonito. A troca do 3D em tempo real deve liberar recursos para investir em outros elementos: planetas de fundo, conexões, partículas e viagens pelo scroll. Reduzir o processamento total não é o objetivo principal. As medições são orçamento e referência, não motivo para empobrecer a cena. Essa orientação posterior atualiza a ênfase de desempenho do texto original da missão.

Sprites ilustrados ou pixel art estão autorizados; escolher o resultado mais bem acabado e consistente. A direção inicial é ilustrada, pela compatibilidade com malhas delicadas, luz intensa e anéis. As duas imagens enviadas no chat são a referência artística principal: núcleo branco-amarelo e malha âmbar, cristais verdes, fundo escuro; ao descer, cabeçalho compacto e conteúdo dos clientes aparecem, com o núcleo recuado e escurecido. As capturas cloud são referência técnica, não substituem a intenção visual das imagens fornecidas pelo usuário.

## Linha de base executada após liberação

Playwright abriu PC e celular com 7 projetos do simulador, sem erros de JavaScript, rede ou HTTP. Foram consultadas as páginas oficiais de Page e CDPSession em playwright.dev. Após a publicação, foi necessário registrar a CA atual do proxy no NSS do Chromium, com autorização de escrita; TLS e integridade permaneceram ativos.

Renderizador detectado automaticamente: **ANGLE / SwiftShader (software)**. Não foi forçada emulação nem desativada proteção para renderizar. Os números abaixo medem esta máquina, não o computador do usuário ou um iPhone. A qualidade adaptativa original pode reduzir efeitos durante a execução; isso faz parte da linha de base observada.

| Medida | PC 1920×1080 | Celular 390×844 |
| --- | ---: | ---: |
| Renderizações da cena por segundo | 7.28 | 23.08 |
| Ocupação da thread principal | 98.7% | 29.0% |
| Heap JavaScript utilizado | 5.58 MiB | 5.92 MiB |
| Primeiro render da cena concluído | 788.6 ms | 612.1 ms |
| Transferência total observada | 391.5 KiB | 316.3 KiB |
| Transferência de JavaScript | 222.9 KiB | 198.0 KiB |

Não há bundle compilado. O tamanho corresponde às transferências observadas pelo CDP, incluindo cabeçalhos; tamanhos locais também constam no JSON. Memória refere-se somente ao heap JavaScript. CPU refere-se à thread principal, não à CPU total/GPU. FPS conta chamadas completas da cena com câmera em perspectiva, não apresentação física na tela. Primeiro render mede o retorno da chamada, não a conclusão da GPU.

Medição: cache HTTP desativado, DPR 1, contexto isolado, 5 segundos de aquecimento, aproximadamente 10 segundos de amostra, cena inicial sem rolagem. O trace foi coletado durante a mesma janela, portanto inclui overhead. O roteiro está em `scripts/medir.cjs`; executar com o servidor local já iniciado e Node 22. Comparações futuras devem repetir este protocolo. Não foram medidos nesta fase o cenário de scroll ou o consumo total do sistema.

Artefatos:
- `baseline.json`: métricas, ambiente, recursos, amostras e metodologia.
- `referencias/pc-1920x1080.png` e `referencias/celular-390x844.png`: cena original executando, inspecionada visualmente.
- `traces/*.json.gz`: traces DevTools comprimidos; descompactar para abrir em ferramenta de trace.
- `diagnostico/*-incompleto.png`: preservados como histórico do bloqueio, não referências atuais.

A Fase 1 ainda não começou. Nenhuma fonte da aplicação foi modificada.
