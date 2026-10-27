# Critério A — validação final isolada

O motor 3D próprio foi removido no commit isolado `e9d00a4`, antes desta sessão. Não foi reintroduzido nem removido novamente. O fechamento não alterou dependências.

Busca nas fontes próprias carregadas pela aplicação e no servidor:

```sh
rg -l 'three|THREE|WebGLRenderer|@react-three|gltf|glsl' cena-2d.js mapa-2d.js jornada.js pc.html index.html demo.js sw.js apps-script/*.gs
```

Resultado: **zero arquivos correspondentes**. `verificar-fontes.cjs` validou a sintaxe e os carregamentos locais; os 140 testes originais passaram. Não existe etapa de build/lint/typecheck configurada.

**O critério A literal continua parcial:** documentação histórica cita os nomes pesquisados, e a distribuição Pixi usa seu renderizador gráfico 2D. As distribuições e arquivos grandes não foram lidos nesta sessão, conforme a regra de economia. Não se afirma busca global zero. JavaScript transferido aumentou de 222,9/198,0 KiB para 983,1 KiB; diferenças de compressão estão explicadas no relatório. A redução de bundle também não foi atingida.

Preservar o histórico e as bibliotecas oficiais. Próximo agente deve otimizar a distribuição com medição e autorização apropriadas, não apagar evidências para satisfazer uma busca textual.
