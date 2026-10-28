# DESIGN.md — identidade visual do Jarvão (como está na `main`)

Documento descritivo: só o que já existe no código. Fontes: `pc.html` (Central do PC, estilos inline nas linhas ~17-179), `index.html` (app do iPhone, mesmos tokens), `mapa-vivo.js` (logo, rótulos e cena 3D). Não há arquivo CSS separado.

## 1. Paleta

Tokens em `:root` (`pc.html:18-22`, idênticos em `index.html`). Tema único, escuro (`color-scheme: dark`).

| Token | Valor | Papel |
|---|---|---|
| `--bg` | `#080706` | Fundo de tudo (também `theme-color`, `background_color` do manifest e `setClearColor` do WebGL) |
| `--card` | `#120e0b` | Superfície base (esqueleto de carregamento) |
| `--card2` | `#1b1510` | Superfície elevada: campos, pills neutras, botão secundário, contadores |
| `--linha` | `rgba(255,170,100,.1)` | Toda divisória e contorno (1px) |
| `--tx` | `#f6eadb` | Texto principal (branco quente) |
| `--mu` | `#b09c86` | Texto secundário |
| `--di` | `#9a8670` | Texto discreto / rótulos / cabeçalhos de tabela |
| `--pri` | `#ff9a4d` | Laranja primário: links, botão, foco, item ativo |
| `--pri2` | `rgba(255,138,61,.16)` | Fundo suave do laranja (botão padrão) |
| `--ok` / `--ok2` | `#7bf0b4` / `rgba(123,240,180,.13)` | Status "no ar" |
| `--av` / `--av2` | `#ffc247` / `rgba(255,194,71,.13)` | Status "atenção" |
| `--er` / `--er2` | `#ff4d5e` / `rgba(255,77,94,.14)` | Status "problema" / ação perigosa |

Outras cores recorrentes no CSS: `#ffc58a` (ícone dentro de botão), `#ffb36a` (item ativo do dock), `#ff8a3d` (brilho da barrinha ativa), `#ecd5b4` (rótulo do HUD), `#0b0f17` (texto sobre botão forte / contador de alerta), `rgba(8,7,6,.7)` (barra ao rolar), `rgba(14,10,7,.74)` (dock), `rgba(12,9,7,.9)` (painel lateral), `#0e0a07` (caixa da paleta de comandos), `#16261f` / `#2a2414` (toast ok / ruim).

Fundo da página (`body::before`, `pc.html:25`): dois gradientes radiais laranja bem fracos — `rgba(255,120,40,.09)` no topo a 60% e `rgba(255,90,30,.06)` no canto inferior esquerdo.

Cena 3D (`mapa-vivo.js:15-16`):
- Status dos planetas (`COR`): ok `0x7bf0b4`, atenção `0xffc247`, erro `0xff4d5e`, pausado `0x7a6e60`, config `0x9a8c7a`, aguardando `0xc4a06a`.
- Energia do núcleo: `AMBAR 0xff8a3d`, `LARANJA 0xff5a1f`, `QUENTE 0xffe0b8`, `BRANCO_QUENTE 0xfff1dc`; semente `0xffd9a0`, brilhos `0xffe0b0`/`0xfff0d8`, partículas `0xffc890`, raios `0xffb070`.

## 2. Fontes (Google Fonts, carregadas em `pc.html:14` e `index.html:17`)

- **Saira** 300–700 — corpo (15px/1.5 no PC, 15px/1.45 no iPhone), títulos e números (`--disp`). `font-variant-numeric: tabular-nums`, `-webkit-font-smoothing: antialiased`. `h1` com `text-wrap: balance`, `p` com `pretty`.
- **JetBrains Mono** 400–600 — rótulos, pills, contadores, subtítulos, `kbd`, paleta (`--mono`).
- **Michroma** — só o nome/logotipo (`.wm` em `mapa-vivo.js:67`): `1em/1.05`, `letter-spacing: .17em`, maiúsculas.

Tamanhos recorrentes: `h1` 24px/760 (`-.3px`); `.numero` 26px/780 (`-.5px`); `.hud b` 21px/700 (19px no mobile); logo `.marca` 29px, ícone `.mk` 66px; texto de card 13–15px; `.titulo` mono 11.5px maiúsculas, `letter-spacing: .14em`; `.hud small` 10.5px, `.12em`; `.marca-sub` 11.5px, `.3em`; pills 11px/700; `kbd` 10.5px; rodapé 11.5px.

## 3. Espaçamento

Sem escala formal; valores recorrentes: gaps 6/8/10/14/18px; `.grade` gap 14px; `main` padding `20px 32px 140px` (16px 18px no mobile; os 140px de baixo liberam o dock), largura máx 1280px; `.card` padding vertical 24px (12px em `.dentro`); barra `padding: 14px 32px` (8px ao rolar); botões `min-height: 36px` (`.mini` 28px), campos `padding: 9px 11px`, itens de dock 48×48px, alvos de toque mínimos de 40–44px; dock a `bottom: max(18px, env(safe-area-inset-bottom))`.

## 4. Bordas, raios e sombras

- **Bordas**: sempre 1px em `--linha`. Cards NÃO têm caixa: só `border-top: 1px solid var(--linha)` (atenção: `rgba(255,194,71,.55)`, erro: `rgba(255,77,94,.65)`). Contornos de botão/busca são `box-shadow: inset 0 0 0 1px`.
- **Raios**: 999px (pills, contadores), 22px (dock), 16px (paleta, esqueleto), 15px (botão do dock), 12px (painel lateral, faixas, toast), 10px (botões, campos, busca, itens da paleta), 8px, 6px (foco), 5px (`kbd`), 2px (barrinhas de histórico), 50% (orbes/pontos).
- **Sombras** (todas escuras + contorno laranja translúcido):
  - Dock: `0 0 0 1px rgba(255,170,100,.2), 0 18px 50px rgba(0,0,0,.6), 0 0 40px rgba(255,110,30,.07)`
  - Painel lateral: `0 0 0 1px rgba(255,160,80,.4), 0 16px 40px rgba(0,0,0,.6)`
  - Paleta: `0 0 0 1px rgba(255,170,100,.3), 0 30px 80px rgba(0,0,0,.7)`
  - Toast: `0 8px 24px rgba(0,0,0,.5)`
  - Brilhos de status (orbe): `0 0 12px <cor do status>`; logo: `drop-shadow(0 0 14px rgba(255,120,40,.5))`; texto do HUD: `text-shadow 0 0 8px #000, 0 2px 3px #000`.
- **Vidro**: barra ao rolar `blur(14px) saturate(1.3)`; dock `blur(16px) saturate(1.3)`; painel `blur(8px)`; paleta (fundo) `blur(6px)`.
- **Foco**: `outline: 2px solid var(--pri); outline-offset: 2px`.

## 5. Estrutura da tela (Central do PC, `pc.html`)

1. **Barra superior** (`.barra`, sticky, z 20): à esquerda o logo (`MapaVivo.logo()` 66px) + nome (`MapaVivo.marca()`, Michroma) + sublinha "Núcleo de controle" com orbe de status geral; no meio o **HUD de métricas** (`.hud`, colunas separadas por borda esquerda `--linha`, rótulo mono pequeno + número grande); à direita o botão **Buscar** (ícone, "Ctrl K") e o botão **Conferir tudo** (`.btn`, ícone refresh; vira "Conferindo…"). Ao rolar ganha classe `.rolou`: fundo de vidro, padding menor, logo a 70%. Abaixo de 1240px o HUD vai para uma linha própria; abaixo de 900px vira grade de 2 colunas e o Buscar vira só ícone.
2. **Palco 3D central** (`.palco`, altura `max(380px, 100vh - 330px)`): canvas do `mapa-vivo.js` em tela cheia, atrás do conteúdo (`main` tem `pointer-events: none`, filhos `auto`). Mostra o núcleo e os projetos com **nome (rótulo) e estado**. Clicar num projeto abre o **painel lateral** (`.painel-sel`, direita; no mobile, folha inferior).
3. **Conteúdo da seção** por cima de um véu (`.veu`: degradê de transparente a `rgba(8,7,6,.88)`), em cards só com linha; grades `.g2`/`.g3`.
4. **Dock inferior** (`.dock`, fixo, centralizado, vidro): botões 48×48 com ícone de traço (stroke 1.6, 21px), rótulo flutuante em mono maiúsculo no hover, contador (`.cont`, vermelho para clientes), item ativo em `#ffb36a` com fundo laranja suave e barrinha brilhante embaixo.
5. **Paleta de comandos** (`.pal`, Ctrl K): modal central com campo, lista e `kbd Esc`. Toast no canto inferior direito.

App do iPhone (`index.html`): coluna única `max-width: 560px`, palco 3D pequeno (`.palco-m`, máscara radial nas bordas, `leve: true`), mesmos tokens.

## 6. Cena 3D (`mapa-vivo.js`, Three.js)

- **Núcleo** (centro): esfera de plasma laranja (shader, `SphereGeometry 1.05`) com semente incandescente, poliedros em wireframe (icosaedro e dodecaedro, âmbar/creme), raios internos, casca wireframe de baixa opacidade, malha de linhas+pontos, anéis e arcos girando, partículas de casca por shader. Tudo com mistura aditiva.
- **Planetas**: um por projeto, em órbita ao redor do núcleo (clientes maiores, 0.42 vs 0.3), cor pelo status (verde = no ar), ligados ao núcleo por linhas e fluxos de partículas ("dados"), com trilho orbital muito tênue (`opacity .07`) e rótulo HTML com nome + estado.
- **Ambiente**: fundo `0x080706`, estrelas por shader, `UnrealBloomPass` (força ~.5, sobe a .75–.85 em eventos), câmera perspectiva 40°, levemente inclinada, que acompanha o ponteiro e a rolagem. Modos `palco` e `fundo` (tela cheia fixa no PC); versão `leve` no iPhone; qualidade cai sozinha se os quadros caem.

## 7. Movimento

- **GSAP 3.12.5** para tudo na cena (hover de planeta `.25s`/`.4s`, entrada `back.out(1.5)` escalonada `+.13s` por planeta, pulso `power3.out .6s` ao chegar dado, onda de varredura `2s power2.out`, câmera de abertura `2.6s power3.out` vindo de longe) e **ScrollTrigger** na Central (`pc.html:653-667`): o topo some com `scrub`, blocos sobem 48px e aparecem em lote (`stagger .09`, `0.9s power3.out`, `once`).
- **CSS**: curva padrão `cubic-bezier(.2,0,0,1)`; botão `scale(.96)` ao apertar; ícone do dock sobe 2px e cresce 1.16×; tooltip do dock `.15s`; painel lateral entra `.28s` (translateX 14px); paleta `.16s` fade; barra `.35s`; esqueleto com brilho deslizando `1.4s`.
- Tom geral: suave, rápido (120–350ms nas interações; até ~2.6s só na abertura), sem saltos nem cores berrantes.
- **Acessibilidade**: `prefers-reduced-motion` desliga GSAP/ScrollTrigger e cena animada (modo estático), skeleton e transições de botão.

## 8. Inconsistências observadas (documentadas, não corrigidas)

- `pc.html:7` usa `theme-color #0b0f17`; `index.html` e os manifests usam `#080706`.
- `#0d121c` (azulado) em `pre.saida` e `#0b0f17` como texto sobre laranja destoam do resto quente.
- Alguns raios existem só no `index.html` (14px, 20px).

## INVIOLÁVEL — o que define o Jarvão (não muda sem pedido explícito do Caio)

1. **Fundo quase-preto quente `#080706`** com brilhos laranja bem fracos; tema escuro único. Nada de azul-frio, branco ou claro.
2. **Laranja `#ff9a4d`/âmbar `#ff8a3d` como única cor de marca**. Verde `#7bf0b4`, amarelo `#ffc247` e vermelho `#ff4d5e` existem SÓ para status (no ar / atenção / problema), nunca decoração.
3. **O núcleo: esfera de energia laranja no centro**, com os projetos como planetas em órbita ligados a ele por fluxos, coloridos pelo status (verde = no ar), com bloom e mistura aditiva.
4. **Trio tipográfico**: Saira (texto e números), JetBrains Mono (rótulos em maiúsculas espaçadas), Michroma (só o nome "JARVÃO").
5. **Estrutura**: barra superior (logo, métricas, Buscar, Conferir tudo) → palco 3D → **dock inferior de vidro com ícones de traço**; paleta Ctrl K.
6. **Superfícies sem caixa**: divisão por linha de 1px `--linha`, vidro com blur nos elementos flutuantes, sombras escuras com contorno laranja translúcido.
7. **Movimento suave e discreto** (curva `.2,0,0,1`, GSAP), sempre respeitando `prefers-reduced-motion`.
8. **Conteúdo em português do Brasil**, nome "Jarvão", sem dados nem chaves no front (`mapa-vivo.js` não guarda nada).
