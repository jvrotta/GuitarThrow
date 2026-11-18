---
description: Registra ou investiga um problema
argument-hint: "<o que aconteceu, onde, e o que o painel de debug mostrou>"
---

Relato: $ARGUMENTS

1. Leia "Problemas conhecidos" em `docs/ROADMAP.md`. Se o problema já está lá, continue a partir do que foi anotado.
2. Localize o módulo pelo Mapa do `CLAUDE.md` e leia o `index.ts` dele antes dos internos.
3. Se faltar informação (ex.: valores do painel de debug, uma gravação WAV), peça exatamente o que falta.
4. Corrija o problema e, quando possível, adicione um teste que o reproduza (fixture em `tests/fixtures/`).
5. Se não for corrigido agora, registre em "Problemas conhecidos" com o diagnóstico até aqui. Depois aplique o `/fechar`.
