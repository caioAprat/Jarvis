# Partículas, veias e retorno à visão geral

Alteração na branch `visual/jarvis-2d`, com envio ao GitHub autorizado pelo usuário. O cabeçalho e o seletor inferior mantêm seu desenho; somente o comportamento de retorno pelo ícone de visão geral foi corrigido.

## Comportamento

- Três camadas orbitais de partículas, faíscas na coroa e partículas próximas compartilham o centro do Jarvis. Todas respondem ao avanço e ao retorno da rolagem; o cursor desloca as camadas com profundidades diferentes e suavização independente da frequência de quadros.
- Touch mantém a rolagem nativa de gestos, sem capturar o dedo para mover partículas. Movimento reduzido desativa a reação ao cursor e o loop contínuo.
- Planetas usam órbitas lentas e oscilação discreta, sem teletransporte entre bordas. Contraste e transparência diminuem perto do núcleo e das áreas de leitura.
- Os documentos são desenhos vetoriais com folha, dobra e linhas. Há um documento por conexão ativa; projetos pausados não transmitem. O documento do projeto em destaque percorre também a ligação até seu cartão. No celular, durante a leitura de um projeto, somente seu documento é mostrado.
- As veias têm curva contínua, movimento sutil, brilho de fundo e cor associada ao estado. O destaque acompanha somente o capítulo atual, evitando dois projetos selecionados ao mesmo tempo.
- Partículas, planetas, documentos e rótulos respeitam áreas reservadas para texto e controles. O núcleo se adapta ao espaço vertical disponível no celular.
- Ao trocar de seção, a inércia é cancelada antes de remontar a página. A nova jornada recebe seu próprio controlador de rolagem; não herda o destino anterior. O teste cobre clicar novamente no próprio ícone Geral.

## Evidências

- `verificar-interacao.cjs`: cursor, transmissão de arquivos, planetas, rolagem rápida em ambos os sentidos, três ciclos de saída/retorno por viewport, um único canvas e controlador, movimento reduzido. Testa desktop 1366×768 e central em celular 390×844. Resultados e maior intervalo entre renderizações em `validacao.json`.
- `medir-layout.cjs`: 33 posições em três tamanhos; resultados em `../capturas/layout.json`. Nesta rodada não se sobrescreveram as capturas históricas; as imagens desta alteração estão nesta pasta.
- `verificar-ui.cjs`: onze cenários dos controles existentes.
- `verificar-offline.cjs`: cache e dados salvos disponíveis; versão do cache `jarvis-v7-orbitas2d`.
- `testes/testes.js`: 140 verificações com Node 22.
- `verificar-fontes.cjs`: sete fontes próprias com sintaxe válida.
- `preview/index.html`: inicialização e retorno pelo Geral testados por HTTP, um controlador, scroll em zero e nenhum erro JavaScript; modo demonstração confirmado.

O navegador usa renderização por software neste ambiente. O teste de stress confirma continuidade e ausência de pausa de um segundo nas amostras; não garante 60 fps nem ausência de falhas em qualquer equipamento. O erro externo de certificado das fontes e a pendência histórica da alternância rápida de movimento reduzido não são apresentados como corrigidos.

## Prévia no Netlify

Dentro da pasta local `Jarvis-2D`, executar:

```powershell
git pull --ff-only origin visual/jarvis-2d
node scripts/migracao-2d/empacotar-preview.cjs
explorer.exe .\preview
```

Arrastar a pasta `preview` para a área de publicação manual do site de demonstração no Netlify. O gerador agora entrega `preview/index.html` automaticamente. A prévia usa dados fictícios e não publica nem altera a produção.
