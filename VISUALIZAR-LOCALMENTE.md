# Abrir a visual/landing-v3 no Windows

Instale [Git para Windows](https://git-scm.com/downloads/win) e [Node.js LTS](https://nodejs.org/). Depois da instalação, abra uma nova janela do PowerShell.

## Primeira vez

```powershell
cd ([Environment]::GetFolderPath('Desktop'))
git clone --branch visual/landing-v3 --single-branch https://github.com/caioAprat/Jarvis.git Jarvis-Landing
cd Jarvis-Landing
node scripts/visualizar-local.cjs --abrir
```

O navegador abre em **http://127.0.0.1:4173/**. Se essa porta já estiver ocupada, o iniciador escolhe outra e mostra o endereço correto. A pasta fica em **Área de Trabalho → Jarvis-Landing**.

## Nas próximas vezes

Abra a pasta **Jarvis-Landing** e dê dois cliques em **ABRIR-JARVAO.bat**. Mantenha a janela preta aberta enquanto usa o app. Para encerrar, pressione **Ctrl+C** nela.

Para receber novas alterações, abra o terminal dentro dessa pasta e execute:

```powershell
git pull --ff-only origin visual/landing-v3
```

Depois reinicie o iniciador e recarregue o navegador.

## O que esta prévia mostra

É o HTML/JS da branch, com uma configuração temporária adicionada apenas à resposta do servidor local. Não modifica as páginas nem a autenticação publicadas. O PIN fica liberado na origem local para explorar o visual, e o simulador fornece dados fictícios. As ações afetam somente esse simulador em memória; reiniciar restaura o estado inicial. Não cole links ou chaves reais nesta prévia.

Three.js, GSAP e as fontes usam os CDNs já presentes no projeto: é necessário estar conectado à internet. Não precisa executar `npm install`, instalar Python ou publicar no Netlify.

Os arquivos da antiga pasta `preview`, se existirem, pertencem à outra branch e não são usados por este iniciador.

## Assistir à câmera — Parte D rodada 4

O Caio abre a prévia normal e só assiste/aprova. A câmera e a história são definidas pelas IAs; não precisa ajustar movimentos manualmente. O iniciador agora serve `camera-estado.json` diretamente: execute `node scripts/visualizar-local.cjs` e abra o endereço exibido, sem parâmetros.

## Editor de câmera — ferramenta técnica das IAs

O editor usa Theatre.js **0.7.2**. As poses ficam em `camera-estado.json`, em unidades do raio do núcleo (E), separadas em `Desktop` e `Mobile`. `position` move a câmera; `target` move o ponto para onde ela olha; `fov` altera a lente. O projeto é **Jarvao Camera**, sheet **Camera**. A sequência acompanha a rolagem de 0 a 100; as poses são os controles das curvas, não precisam de keyframes.

**Preparar a prévia:** execute `node scripts/visualizar-local.cjs` nesta branch e anote a porta exibida. Abra esse endereço com `?editar=1`. A ponte abaixo é opcional, para iniciadores antigos que bloqueavam `.json`; ela escuta apenas neste computador e encaminha ao mesmo simulador.

```powershell
$env:JARVAO_PREVIA = 'http://127.0.0.1:4173'
@'
const http = require('node:http'), fs = require('node:fs');
const base = new URL(process.env.JARVAO_PREVIA);
http.createServer(async (req, res) => {
  try {
    if (new URL(req.url, 'http://localhost').pathname === '/camera-estado.json') {
      res.writeHead(200, {'Content-Type':'application/json', 'Cache-Control':'no-store'});
      return res.end(fs.readFileSync('camera-estado.json'));
    }
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await fetch(new URL(req.url, base), {method:req.method,
      headers:{'Content-Type':req.headers['content-type'] || 'text/plain', Origin:base.origin},
      body:/^(GET|HEAD)$/.test(req.method) ? undefined : Buffer.concat(chunks)});
    const type = r.headers.get('content-type') || 'application/octet-stream';
    let body = Buffer.from(await r.arrayBuffer());
    if (type.includes('text/html')) body = Buffer.from(body.toString().replaceAll(base.origin, 'http://127.0.0.1:4183'));
    res.writeHead(r.status, {'Content-Type':type, 'Cache-Control':'no-store',
      'Content-Security-Policy':"connect-src 'self'; worker-src 'none'"}); res.end(body);
  } catch (e) { res.writeHead(502); res.end('Verifique a porta da previa.'); }
}).listen(4183, '127.0.0.1', () => console.log('Editor: http://127.0.0.1:4183/?editar=1'));
'@ | node
```

1. Abra **http://127.0.0.1:4183/?editar=1**. Mantenha os dois terminais abertos.
2. Role até entrar nos dados. Na barra lateral da página, clique no número da parada que deseja ajustar. Espere a câmera pousar.
3. Na árvore do Theatre, à esquerda, abra **Jarvao Camera → Camera → Desktop → B** (em uma janela de 390px, **Mobile → B**). Selecione o objeto da parada.
4. À direita, abra **position** ou **target** e arraste os valores de **x**, **y**, **z**, ou clique no número e digite. O canvas atualiza ao vivo quando a parada selecionada é a que está na tela. Ajuste **fov** se necessário. Não anime as propriedades com keyframes; edite o valor estático da pose. `Chegada` é B0 e deve ser preservada até a Parte F; `Passagem` é o plano longo, sem parada.
5. Para exportar, aperte **F12**, clique em **Console**, cole o comando abaixo e pressione **Enter**. O navegador baixa `camera-estado.json` com ambos os perfis preservados.
6. Copie o arquivo baixado para a raiz `C:\Bot.ideias\jarvis`, substituindo o JSON anterior. Recarregue **sem `?editar=1`** e confira a parada. A edição temporária também fica no armazenamento do Studio; a validação sem editor usa exclusivamente o arquivo salvo.
7. Para encerrar, pressione **Ctrl+C** nos dois terminais.

```js
const blob = new Blob([JSON.stringify(cameraEditor.exportar(), null, 2)], {type:'application/json'});
const url = URL.createObjectURL(blob), link = document.createElement('a');
link.href = url; link.download = 'camera-estado.json'; link.click();
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

Mapa dos objetos de B: **situacao, gabinete, planilha, assistente, painel, pedalada, atrasos, cacador, planeta, fecho**. A árvore A contém `Chegada`, `ola`, `prototipo`, `acesso`. Os objetos `Via-*` são controles das passagens e da órbita, sem parada. B/`Chegada` conserva B0 para a Parte F. Cada painel tem sua cena; o passeio segue a ponte até os clientes e retorna à visão geral. A velocidade usa distância de arco, com platôs e sem filtro espacial posterior.

Sem `?editar=1`, ou em qualquer domínio de produção mesmo com esse parâmetro, somente o core é carregado. O editor oferece controles numéricos de posição/alvo sobre a cena ao vivo; não há gizmo de arrastar objetos 3D. Nenhuma ação acima publica, comita ou envia arquivos ao Git.
