---
description: Executa o próximo item do ROADMAP
argument-hint: "[item específico, opcional]"
---

1. Leia `docs/ROADMAP.md` (seção "Próximo passo" e o marco atual). Se $ARGUMENTS foi passado, faça esse item.
2. Abra apenas os arquivos que o item exige, guiado pelo Mapa do `CLAUDE.md` e pelos `index.ts` dos módulos.
   Só abra `docs/DESIGN.md` na seção relevante, se a decisão técnica não estiver clara.
3. Implemente o item. Rode `npm run build` e `npm test` (quando existirem) e corrija falhas.
4. Se algo precisa ser testado no iPhone, diga exatamente o que o usuário deve fazer e o que observar.
5. Termine aplicando o `/fechar`.
