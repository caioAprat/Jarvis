# Correção visual: ambiente e cabos

Branch: `visual/landing-v3`. Checkpoint de retorno: `checkpoint/antes-correcao-visual`.

## Resultado

Um piso comum em Y = −3,2 × E, com grade, luz radial, marcações e sombras de contato. O hub circular tem uma porta por monitor. Cada monitor conserva tamanho, posição, altura, orientação e conteúdo; recebeu base, haste, articulação e soquete. As hastes externas antigas foram removidas.

Cada cabo utiliza 22 pontos Verlet, oito iterações por passo fixo, gravidade, amortecimento e colisão com o piso. O comprimento nominal tem 18%–23% de folga. Durante a entrada vertical original dos monitores, a mesma corda se acomoda sem mudar o comprimento. Os buffers dos tubos são reutilizados. Pulsos e poeira seguem os centros do tubo simulado; a iluminação dos cabos não adiciona luzes à cena.

Rótulos são posicionados fora das projeções dos monitores e núcleo, considerando outros rótulos e controles. Fontes e decodificação não mudaram. Os cubos orbitais autorizados tornaram-se triângulos luminosos. O planeta secundário foi tratado como projeção de energia, sem cubos sólidos.

## Verificação

- 172 testes passaram: os 140 anteriores e 32 verificações novas de física.
- Após 600 passos: pontas fixas, segmentos dentro de 5%, nenhum ponto abaixo do piso, nenhum NaN; também verificação de âncora móvel e reutilização do buffer.
- Prévia com sete projetos: sete cabos, 14 âncoras verdes e nenhuma vermelha.
- Chromium em 1366×768 e 390×844: capturas de 0%, 25%, 50% e 75% da narrativa combinada (abertura + dados), além da cena Fios. Sem erros JS/GLSL, overflow ou sobreposição detectada nos retângulos dos rótulos amostrados. Não é uma prova de todos os instantes e tamanhos possíveis.
- Movimento reduzido: geometria do cabo permaneceu igual após mover o ponteiro; pulsos continuaram lentamente.
- Recarga offline com 54 recursos em cache: passou.
- Sem build/lint configurados: sintaxe verificada com `node --check`.

O `git diff` confirma que `mapa-vivo.js`, `landing-cinema.js`, `landing-particulas.js`, `landing-escrita.js`, `landing-acesso.js`, `app.html` e `apps-script/` não mudaram. As funções de câmera, intervalos, portal e transição do roteiro foram comparadas com o checkpoint e são idênticas. Os blocos que criam e animam os monitores em `prototipo.js` também são idênticos. O arquivo só mudou na antiga base e nos marcadores orbitais autorizados.

## Limites

A amostra de cinco segundos registrou aproximadamente 5,96 FPS no Chromium/SwiftShader (GPU simulada por software). Isso não confirma a meta de 60 FPS em notebook; é necessário medir na GPU real. A quantidade de poeira se adapta à qualidade e ao tempo de quadro. O renderer original já limita pixel ratio a menos de 2 e pausa com a aba oculta.

Como câmera e posições dos monitores foram preservadas, os enquadramentos originais em que um monitor passa à frente do núcleo continuam existindo. Eliminar também essas oclusões exigiria uma decisão adicional de composição; não alteramos esses elementos protegidos.

## Referências consultadas

- [Unitycoder: Verlet e restrições de corda](https://github.com/unitycoder/ThreeJS-Rope-Physics). Implementação própria, sem importar dependências.
- [Exemplo de cabo no fórum Three.js](https://discourse.threejs.org/t/interactive-thread-cable-simulation-in-three-js/92563): ancoragem e curvas contínuas.
- [Vercel: crachá interativo](https://vercel.com/blog/building-an-interactive-3d-event-badge-with-react-three-fiber): restrições de juntas, amortecimento e atualização da curva. Nenhuma biblioteca React/Rapier foi adicionada.
- [Bruno Simon, Folio 2019](https://github.com/brunosimon/folio-2019): consultados os módulos de piso, sombras e física; referência para apoio físico e sombras de contato, sem copiar dependências.
- [HUDS+GUIS](https://www.hudsandguis.com/): hierarquia e chamadas técnicas ligadas a objetos.

## Capturas

| Progresso combinado | PC | Celular |
|---|---|---|
| 0% | [Abrir](1366-0.png) | [Abrir](390-0.png) |
| 25% | [Abrir](1366-25.png) | [Abrir](390-25.png) |
| 50% | [Abrir](1366-50.png) | [Abrir](390-50.png) |
| 75% | [Abrir](1366-75.png) | [Abrir](390-75.png) |
| Cena Fios | [Abrir](1366-fios.png) | [Abrir](390-fios.png) |

## Abrir no Windows

1. Pare a prévia anterior com Ctrl+C na janela do terminal.
2. Na pasta Jarvis-Landing, execute:

```powershell
git pull origin visual/landing-v3
node scripts/visualizar-local.cjs --abrir
```

3. Abra http://127.0.0.1:4173/ (ou a porta indicada no terminal). Nas próximas vezes, pode usar ABRIR-JARVAO.bat.
4. Pressione Ctrl+F5. Se persistir cache antigo: F12 → Application → Service Workers → Unregister no registro local; depois Storage → Clear site data. Recarregue.
5. Para verificar conexões, abra http://127.0.0.1:4173/#debug e role até os monitores aparecerem. As esferas devem ser verdes. F12 → Console mostra a lista de cabos e destinos.
6. Observe a folga, o balanço, os pulsos, as bases e os rótulos. Ao relatar um problema, envie o trecho da navegação lateral, tamanho da janela e uma captura ou vídeo curto. A prévia usa dados simulados.

## Voltar atrás preservando o histórico

Estes comandos desfazem todos os commits posteriores ao checkpoint; use-os antes de receber outras tarefas posteriores, ou revise o intervalo se já houver mudanças novas.

```powershell
git pull origin visual/landing-v3
git revert --no-commit checkpoint/antes-correcao-visual..HEAD
git commit -m "revert(landing): restaurar checkpoint anterior a correcao visual"
git push origin visual/landing-v3
```
