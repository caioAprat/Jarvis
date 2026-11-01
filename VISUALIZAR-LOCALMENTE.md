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
