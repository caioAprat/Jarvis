# Jarvis

Central de status dos projetos do Caio: confere tudo a cada 10 minutos e manda notificação no iPhone quando algo quebra ou volta.

```
apps-script/      servidor (Google Apps Script): checagens, avisos, Web Push
index.html, sw.js app do iPhone (GitHub Pages, PWA)
testes/           node testes/testes.js  (roda antes de cada publicação)
.github/workflows publicação automática do servidor
```

## Como funciona
- **Checagens** (`PROJETOS` em `apps-script/Codigo.gs`): site no ar, saúde do assistente financeiro, workflow do GitHub, ou **batida** (o projeto avisa "rodei").
- **Avisos**: projetos mandam `POST {tipo:"aviso"}` com a chave de batida; o Jarvis guarda e acorda o iPhone com um push vazio. O app busca o texto (`acao=avisos`).
- **Chaves** (Script Properties): `CHAVE` (admin), `CHAVE_LEITURA` (app), `CHAVE_BATIDA` (projetos). Nada disso fica no repositório.

## Acrescentar um projeto
1. Um item novo em `PROJETOS` (tipos: `site`, `assistente`, `batida`, `github`).
2. Se for `batida`, o projeto chama no fim de cada execução:
   `POST <URL>?k=<CHAVE_BATIDA>` com `{"tipo":"batida","projeto":"<id>","ok":true,"detalhe":"..."}`.
3. `git push` → testes → publica sozinho.
