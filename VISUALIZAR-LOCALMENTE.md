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

## Atualizar para a jornada contínua de PC

1. Na janela preta da versão antiga, pressione **Ctrl+C**. Se o Windows perguntar se deseja finalizar, confirme. Feche a aba antiga do navegador.
2. Abra PowerShell na pasta **Jarvis-Landing** e execute:

```powershell
git pull origin visual/landing-v3
node scripts/visualizar-local.cjs --abrir
```

3. Abra **http://127.0.0.1:4173/** (ou a porta mostrada pelo iniciador, caso 4173 esteja ocupada). Nas próximas vezes, use **ABRIR-JARVAO.bat**.
4. Pressione **Ctrl+F5**. A prévia local não usa service worker. Se houver um cache de outra execução: pressione **F12 → Application/Aplicativo → Service Workers → Unregister/Cancelar registro** para este endereço. Depois vá a **Storage/Armazenamento → Clear site data/Limpar dados do site**, feche o DevTools e recarregue. Isso limpa apenas os dados desse endereço local.
5. Role devagar: primeiro aparecem os cabos com faixas, fios finos coloridos e poeira; depois o título grande e o protótipo; na travessia os triângulos se dispersam na direção da câmera. Os textos decodificam antes das explicações. Continue para situação, números e projetos; volte o scroll para conferir a reversão. **Ir direto** entrega a central de controle.
6. Confira se os textos ficam legíveis, se não há cartão/portal no centro e se a volta do scroll é contínua. Ao informar um problema, diga o trecho, o tamanho da janela, navegador e o sintoma: “texto não decodifica”, “movimento engasga”, “corte na travessia”. Uma captura ou vídeo curto ajuda a localizar.

## Celular na mesma rede (opcional, sem polimento nesta etapa)

O foco desta entrega é PC. Para apenas abrir a prévia no celular:

```powershell
node scripts/visualizar-local.cjs --rede
```

Conecte os dois aparelhos ao mesmo Wi-Fi. Digite no celular o endereço **Celular na mesma rede** impresso no terminal (por exemplo, `http://192.168.1.10:4173/`). `127.0.0.1` no celular aponta para o próprio celular. Se o Windows pedir, permita acesso do Node.js apenas na rede privada doméstica. O servidor continua fornecendo somente dados simulados.
