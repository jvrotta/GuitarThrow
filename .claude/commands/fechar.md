---
description: Fecha a tarefa — atualiza ROADMAP e mapa, checa e propõe commit
---

1. `docs/ROADMAP.md`: marque os itens concluídos, reescreva "Próximo passo", adicione 1 linha datada ao topo do Histórico
   e registre problemas encontrados em "Problemas conhecidos".
2. Se pastas ou arquivos-chave foram criados, movidos ou removidos, atualize o Mapa do `CLAUDE.md`.
3. Se alguma decisão mudou, registre em `docs/DESIGN.md` §7 (decisão + motivo, 1 linha).
4. Atualize a linha "Marco atual" do `CLAUDE.md`.
5. Rode `npm run build` e `npm test` (quando existirem).
6. Mostre `git status` resumido e proponha uma mensagem de commit em inglês. Não faça commit nem push sem o usuário pedir.
