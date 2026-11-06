# Jarvão Landing — pacote instalável separado

Execute `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gerar-icones-v3.ps1` se precisar regenerar os ícones (política somente desse processo). Depois execute `node scripts/preparar-v3.cjs`. O pacote fica em `.playwright-mcp/p7c/site/`, ignorado pelo Git. Esse comando não publica nem altera `pc.html`, o manifesto ou o worker da Central instalada.

Use **um projeto Vercel separado, com domínio próprio desse projeto**. Não envie a pasta do repositório: envie somente o conteúdo do pacote estático para um novo repositório, depois importe-o na Vercel com preset **Other**, sem build, output `.`. Isso é uma publicação e depende da decisão do Caio. Não executado nesta entrega.

Abra o novo endereço `/v3/pc.html`, vá ao acesso, cole o link particular da Central do PC e pressione Enter. O link fica apenas no armazenamento desse endereço; não o coloque em arquivos, commits ou configurações de deploy. Digite o PIN. Nas próximas aberturas, a chave permanece e só será necessário o PIN quando a sessão vencer. Para instalar, use o ícone de instalação do Chrome ou o menu **Transmitir, salvar e compartilhar → Instalar página como app**; confirme o nome **Jarvão Landing** e o ícone com selo **v3**.

Não altere a publicação Pages da Central nem use uma subpasta no mesmo domínio: o worker legado apaga caches alheios na ativação. Outro repositório Pages da mesma conta também compartilha a origem `caioaprat.github.io`. Um domínio Vercel separado isola armazenamento e workers.

Validação local: `node testes/pwa-v3-browser.cjs` (Chrome/Playwright conforme `testes/README.md`). O teste serve o pacote em loopback, usa somente fixtures e consulta a validação de instalação do Chrome por CDP. Não instala atalhos no Windows. Internet continua necessária para CDNs/fontes e dados reais; não se promete uso completo offline. Notificações push da Central não são migradas para este worker.

Roteiro clique a clique e limitações: relatório local do cofre `Equipe/Tarefas/2026-11-06-p7c-instalavel.md`. Desempenho e timeouts na última suíte conjunta continuam exigindo revisão; pacote instalável não significa publicação aprovada.

— Codex, 2026-11-06
