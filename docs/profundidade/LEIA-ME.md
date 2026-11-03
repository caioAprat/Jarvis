# Prévia para revisão — profundidade, fios e monitores

Base: `b92a4bc`, branch `visual/landing-v3`. Commit e push autorizados pelo Caio para abrir a prévia local. A aprovação visual e a validação de desempenho continuam pendentes.

## O que mudou

- Quatro grupos de cenário, com distâncias, tamanhos, transparência e deslocamentos diferentes. O modo leve mantém somente dois ativos.
- O fundo tem arcos discretos e grade com fade radial e por distância. A poeira externa anterior é substituída durante a narrativa e restaurada ao entrar na central.
- Sete cabos físicos continuam presos ao hub e aos soquetes. Suas curvas ganham profundidade, com guia Bézier amostrada em distâncias iguais, amortecimento Verlet e colisão com o piso. Os controles laterais contornam a região central. Tráfego e poeira acompanham a curva atual.
- A conexão luminosa entre o núcleo e o mundo dos clientes é uma curva 3D. As antigas linhas SVG com cotovelos foram retiradas dos textos.
- Monitores com carcaça arredondada, moldura fina, LED mais suave e textura de maior definição. Os dados e o desenho dos gráficos continuam em `telas-vivas.js`, sem alterações.
- Os suportes têm braços curvos. O chão continua único, com bases e sombras de contato.
- A interpolação da rolagem passa a considerar o tempo decorrido. O limitador de 30 fps deixa de interpretar sua própria espera como uma máquina lenta.
- Menos partículas, conectores agrupados, buffers reutilizados e posições de rótulos reaproveitadas enquanto continuam livres. A narrativa pausa seu trabalho com a aba oculta; seus grupos novos são removidos ao sair.
- Corrigida a camada transparente que interceptava os cliques nos botões da central.

## Camadas

`D` é a distância ao foco atual, limitada entre 4 unidades de escala e 70 unidades da cena. As faixas são profundidades na direção da câmera; não são coordenadas Z fixas do mundo. Os grupos usam a mesma câmera e o mesmo teste de profundidade da cena. Núcleo e monitores preservam sua hierarquia original.

| Grupo | Profundidade | Tamanho nominal dos pontos | Opacidade base | Quantidade desktop | Parallax ponteiro / scroll |
|---|---|---|---|---|---|
| `cenario-frente` | 0,2–0,45 D | 36–90 px, bordas suaves; limite de 72 px físicos no shader | 0,14 | 8 | 1 / 1 |
| `cenario-medio` | 0,7–1,12 D | 1,5–3 px | 0,38 | 120 | 0,25 / 0,25 |
| `cenario-fundo` | 1,12–2,2 D | 0,6–1,3 px | 0,16 | 160 + arcos | 0,08 / 0,08 |
| `cenario-infinito` | 2,5–3,5 D | 0,5–0,9 px | 0,075 | 220 | 0,015 / 0,02 |

Tamanhos variam com a distância e o pixel ratio. Núcleo permanece dominante; fundo usa neutros quentes, sem azul ou roxo. No modo leve: 60 pontos médios e 100 no fundo, sem primeiro plano desfocado. A poeira dos cabos tem orçamento separado: até 1.800 pontos no desktop, 500 no modo leve, reduzidos conforme a taxa de quadros.

As regiões dos textos, barra e dock são excluídas do primeiro plano pelo shader. As capturas verificam amostras do roteiro; não são prova de ausência de sobreposição em toda combinação possível de tela e movimento.

## Preservação

`preservacao.json` registra a comparação com a base. Permanecem iguais: geometria e shaders do núcleo, fórmulas de sua animação, tabelas da câmera, duração e ordem das cenas, `landing-cinema.js`, fontes e decodificação, conteúdo das telas, acesso/PIN/dados, `index.html`, `app.html`, `apps-script/`, `DESIGN.md` e `BIBLIOTECAS.md`.

Posição horizontal, altura nominal, orientação e tamanho externo dos monitores foram preservados. O acabamento e a resolução das telas mudaram com autorização do Caio. `mapa-vivo.js` recebeu uma função para substituir somente o ambiente externo durante a landing, duas correções no agendamento de quadros e o bloqueio do movimento pelo ponteiro quando a preferência de movimento reduzido está ativa; o modelo central não foi reconstruído.

## Verificações e limites

- Node: **181 verificações passaram, zero falhas**, incluindo as 172 anteriores e nove testes adicionais de curva/corda guiada.
- Navegador: Ctrl K, Conferir tudo, dock, abrir/fechar painel, saída da narrativa e movimento reduzido verificados com dados simulados. Resultados em `funcional.json`.
- Cache offline: versão `jarvis-profundidade-v2`, incluindo os módulos novos. Resultado em `offline.json`.
- Capturas: quatro cenas em 1366×768 e 390×844, mais três posições do ponteiro com câmera e tempo congelados para isolar o parallax. Resultados e faixas de profundidade em `capturas.json`.
- Profundidade dos cabos: os sete atravessam duas faixas nas oito amostras; valores medidos a partir dos vértices do tubo e da câmera estão em `capturas.json`. Isso é uma verificação dos enquadramentos capturados, não de cada instante da rolagem.
- Modo de verificação: sete cabos físicos, 14 âncoras verdes, nenhuma vermelha nas amostras. A conexão de energia do planeta é adicional.
- Não houve instalação de bibliotecas, atualização do Three ou criação de build.

### Desempenho: meta ainda não comprovada

Ensaio de oito segundos na cena Assistente e Painel, após aquecimento, executado sequencialmente antes/depois. Navegador Chromium com **SwiftShader, GPU simulada por software**. A qualidade adaptativa permanece ligada, como no produto.

| Largura | Base | Prévia | Chamadas de desenho, base → prévia | Pontos, base → prévia |
|---|---:|---:|---:|---:|
| 1366 px | 5.42 fps | 5.61 fps | 194 → 150 | 5889 → 1863 |
| 390 px | 23.60 fps | 20.58 fps | 218 → 159 | 1386 → 718 |

Esses números **não atingem 55/30 fps** e não comprovam fluidez em notebook ou iPhone. A diferença pequena de fps pode variar entre execuções. A redução de chamadas/pontos é mensurável; não equivale a uma promessa de ganho proporcional de fps. Mesmo após simplificar as peças, o acabamento arredondado acrescenta alguns triângulos: no desktop, 28.196 → 28.928. É necessário validar a experiência numa GPU real. Contagens e registros completos da última medição estão em `desempenho.json`.

## Arquivos

Criados: `cenario-geometria.js` (buffers, curvas e formas arredondadas), `veias-cenario.js` (conexão do planeta) e esta pasta de evidências.

Alterados: `ambiente-controle.js`, `chamadas.js`, `corda-verlet.js`, `fios.js`, `fundo.js`, `landing-particulas.js`, `landing-roteiro.js`, `mapa-vivo.js`, `pc.html`, `prototipo.js`, `rotulos-layout.js`, `sw.js`, `testes/testes.js`.

Removido: `landing-ponteiro.js`. Seu empurrão da antiga nuvem foi substituído pelo parallax das camadas; não tinha outros consumidores no projeto.

## Referências de direção

[Lusion](https://lusion.co/) — escala e bordas suaves; [Active Theory](https://activetheory.net/) — atmosfera e camadas; [Territory Studio](https://territorystudio.com/) — leitura técnica e marcadores. Igloo e Quai orientaram a intenção descrita no pedido. Não houve cópia de bibliotecas, paleta ou layout. Comparação visual com os prints fornecidos pelo Caio e a referência local da main examinada na etapa de diagnóstico.

## Como visualizar

1. Pare o servidor antigo: na janela de terminal, pressione **Ctrl+C**.
2. Na pasta Jarvis, confirme `git branch --show-current`: deve mostrar `visual/landing-v3`. Atualize com `git pull --ff-only origin visual/landing-v3`. Se houver aviso de alterações locais ou divergência, preserve os arquivos e envie a mensagem para análise. Como alternativa sem Git, baixe o ZIP da branch pelo GitHub (**Code → Download ZIP**) e extraia em uma pasta nova; use o `.bat` dessa pasta.
3. Dentro da pasta Jarvis, rode `node scripts/visualizar-local.cjs --abrir`, ou dê duplo clique em `ABRIR-JARVAO.bat`.
4. Abra **http://127.0.0.1:4173/**. Se o terminal indicar outra porta, use a indicada.
5. Pressione **Ctrl+F5**. Se ainda aparecer a versão antiga: **F12 → Application → Service Workers → Unregister** para este endereço; depois **Storage → Clear site data**; recarregue. Isso limpa também o acesso salvo nesse endereço.
6. Para conferir as pontas dos cabos, abra **http://127.0.0.1:4173/#debug** e avance até os monitores.
7. Confira cantos/moldura dos monitores, leitura dos textos, conectores, curvas, pulsos e deslocamento das camadas ao mover o mouse. A prévia local usa dados simulados, sem alterar serviços reais.
8. Para relatar problemas, informe cena, tamanho da janela e navegador; envie um print marcando o cabo/monitor ou texto. Para travadas, informe também modelo do computador e se a aceleração gráfica do navegador está ligada.

O envio desta prévia foi autorizado para facilitar a visualização no PC. A revisão visual e a etapa de aceitação de desempenho continuam pendentes.
