# Estado da migração 2D — Jarvão (rodada 2 concluída)

Branch `visual/jarvis-2d`; nada publicado, sem push; `main` intacta. Tags: `checkpoint-polimento-2` (antes da rodada) e `handoff-rodada-2`.
Histórico detalhado das rodadas anteriores: [historico-estado.md](historico-estado.md). Números e limites: [relatorio.md](relatorio.md).

## Pronto (✅)
- ✅ **Marca nova** (`scripts/marca/`): emblema minimalista de 5 barras de pulso + núcleo aceso, logotipo JARVÃO em traço fino e espaçado. Aplicado em cabeçalhos (emblema que respira), aba (svg/ico/png), iOS, instalação (192/512/maskable), notificações, `demo.html`, `privacidade.html`, `sw.js` v7.
- ✅ **A — batimento** calmo: 1,6 s (alerta 1,35 s, mínimo 1,3 s), tum 1 escala 1,06 + tum 2 (0,65×) 300 ms depois, onda de choque só no tum 1 (1,1 s). Aparência do núcleo intocada.
- ✅ **B — máquina de estados** JORNADA / VISAO / TRANSICAO (um único dono da câmera). Um gesto de rolagem = uma etapa (Lenis, 1,1 s); parada no meio = snap; em Visão geral qualquer rolagem sai do modo antes de andar (fila de 1 gesto). Causa do bug: 3 controladores na câmera (scrub suave + tweens do G + painel).
- ✅ **C — veias**: 1 vaso principal afunilado por projeto (raiz na superfície da rede, bulbos), 2–4 ramos, sub-ramos e capilares, ligações entre vizinhos; splines vivas; onda de dilatação do coração (~1,2 s). Pausado = veia fina e fria. Rótulos acima das veias.
- ✅ **D — arquivos**: ícones (planilha, documento, imagem, PDF, dados, recibo) por veia com emissão de Poisson, rajadas, grandes raros, paradas, dissolução ao chegar; eventos reais viram arquivos grandes (`MV.evento`).
- ✅ **E — desktop**: margens seguras para barras, índice lateral com número e nome em todos os marcadores, 0 sobreposições em 1365×768 e 1920×1080 (poses, transições, modo G, painel).

## Pendente / riscos (⚠️)
- ⚠️ **60 fps em GPU real não comprovados**: só há medição em Chrome headless com SwiftShader (~3,9 fps a 1920×1080). CPU JS por quadro: núcleo 0,26 ms, veias+arquivos 0,9 ms, cena inteira 4,3 ms (limite do pedido: 3 ms para veias).
- ⚠️ **Safari e iPhone não testados** (WebGL, Lenis, toque); `offset`/ParticleContainer em Safari antigo desconhecidos.
- ⚠️ O ícone já instalado no PC/iPhone só muda ao reinstalar o app. Mensagens do Telegram/Apps Script não usam o ícone.
- ⚠️ Em 800 px (tablet) o rótulo da Planilha ainda toca o mapa lateral. Sem lint configurado (usei `node --check` e os 140 testes do servidor).
- ⚠️ Os scripts `verificar-*.cjs` do Codex dependem do Playwright do sandbox dele e não rodaram; validei com harness equivalente fora do projeto.

## Decisões
- `index.html` (app do iPhone, aberto em `/Jarvis/`) ganhou composição de desktop ≥1000 px em vez de redirecionar ao `pc.html` (que exige o link privado). "Pedidos abertos" no app mostra "—" com link para a central.
- Gesto→etapa por Lenis (não ScrollTrigger snap/Observer: o Observer não está no vendor e o snap brigaria com o Lenis); `scrub:true`.
- Pixi enxuto (só WebGL) reconstruído com Mesh/MeshGeometry/Texture/Rectangle: `scripts/migracao-2d/pixi-enxuto/`.
- Rede geodésica de frequência 12 (1442 vértices); a "4 ou 5" do pedido daria 162–252.
- Não há skill de ícones no ambiente: o desenho da marca é próprio, a partir das duas referências enviadas.
- Mobile: menos fios (55 caminhos), brasas e micro-partículas reduzidas.
- Rodapé "Demonstração · dados fictícios" continua só no modo `?demo`.

## Como rodar
```
cd C:\Bot.ideias\jarvis
npx serve . --no-clean-urls   # sem isso o serve redireciona pc.html?demo para /pc (404); ou: python -m http.server 8001
```
Abrir `http://localhost:3000/pc.html?demo` (ou :8001 no Python) (central do PC) ou `index.html?demo` (app). Forçar atualização com Ctrl+Shift+R (cache). Testes do servidor: `node testes/testes.js`. Regerar ícones: `PW_CORE=<node_modules/playwright-core> node scripts/marca/gerar-icones.cjs`.
Teclas: G visão geral, 1–9 projetos, Esc sai, Ctrl K busca (app), PageUp/Down, setas, espaço, Home/End.

## Constantes de ajuste
- Batimento: `window.BATIMENTO_CONFIG` no topo de `nucleo-2d.js` (período, alerta, gap, amplitudes, onda, movimento reduzido).
- Snap/rolagem: `LIMIAR` (28 px por gesto), `COOL` (140 ms), durações 1,1 / 1,5 / 0,6 s e `lerp:.09` do Lenis em `cena-2d.js`.
- Veias: `CONF` (espessuras, bulbos, onda) e a geração em `montarGrupo` (ramos 2–4, sub-ramos 2, capilares 1–2) em `fios-2d.js`.
- Arquivos: `TAXA`, `VEL`, `TIPOS_PROJ`, `MAXA` (24), rajadas 14%, grandes 6% em `fios-2d.js`.
- Partículas: contagens em `particulas-2d.js`; qualidade adaptativa só reduz glow/partículas/capilares (nunca a nitidez do núcleo).
