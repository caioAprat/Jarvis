<!-- BEGIN:equipe-do-caio -->
# Regras para qualquer IA neste repositório

Projeto **Jarvis (Jarvão)** do Caio, trabalhado por uma equipe de IAs: **Claude** orquestra e revisa; **Codex** implementa, depura e valida; **Gemini (web)** apoia análises, pesquisas e revisões quando tiver acesso. Gemini Code não é presumido; Antigravity é opcional e não bloqueia o fluxo.

## 1. Se você roda no PC do Caio e consegue ler `C:\Cerebro`
Leia `C:\Cerebro\AGENTS.md` e siga tudo: ele vale acima deste arquivo. A nota deste projeto é `C:\Cerebro\Projetos\Jarvis.md`.

## Padrão de execução e validação em qualquer ambiente
- Antes de devolver um teste manual ao Caio, confira as integrações, plugins, conectores, skills, extensões, ferramentas e ambientes de teste já disponíveis. Quando houver uma ferramenta **relevante e concreta** que permita a IA executar melhor a tarefa, sugira-a proativamente e explique o ganho; peça consentimento para instalar, conectar, dar acesso ou gerar custos.
- **IA executa → testa → corrige → testa novamente → Caio revisa/aprova.** Reproduza bugs, use testes automatizados/de regressão quando viável, valide os resultados e informe evidências objetivas. Não diga que testou quando não testou.
- Trabalhe em branch/cópia/ambiente de desenvolvimento; nunca publique, mescle na `main` ou altere produção sem o OK do Caio. Respeite o escopo original e as responsabilidades de Claude, Codex e Gemini. Se a ferramenta necessária não estiver acessível, explique a limitação e solicite somente a intervenção mínima.
- Fonte de verdade do padrão transversal: `caioAprat/cerebro/AGENTS.md` e `Memoria/preferencia-execucao-autonoma-validada.md`. Esta regra vale também para IAs que não conseguem ler `C:\Cerebro`.

## 2. Se você roda na nuvem ou no navegador (sem acesso a `C:\Cerebro`)
- Responda em português do Brasil, direto e curto. O Caio não é programador: passo a passo clique a clique quando ele precisar fazer algo.
- Regras técnicas deste projeto: `CLAUDE.md` e `README` deste repositório (leia antes de mexer).
- Trabalhe numa branch própria (`<sua-ia>/<assunto>`). Nunca direto na `main`.
- NÃO publique, não apague, não mexa em chaves/segredos e não junte na `main` sem o Caio confirmar. Não invente escopo além do pedido.
- **Ao terminar (ou parar), feche SEMPRE com este bloco**, para o Caio colar no Claude do PC e a equipe toda ficar sabendo:

```
PARA O CÉREBRO
Projeto: Jarvis (Jarvão)
IA: <seu nome>
Branch: <branch>
O que mudou / o que descobri: <até 5 linhas>
Arquivos: <lista>
Decisões que o Caio precisa tomar: <ou "nenhuma">
Próximo passo: <1 linha>
```
E diga ao Caio: "Cole este bloco no Claude do PC com a palavra **registre**."
<!-- END:equipe-do-caio -->
