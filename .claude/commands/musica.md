---
description: Cria uma música ou exercício no formato oficial
argument-hint: "<nome da música ou descrição do exercício>"
---

Pedido: $ARGUMENTS

1. Leia `docs/CONTENT.md` (regras e formato) e `content/catalog.json` (para não duplicar).
2. Verifique o direito autoral. Se a música for protegida, não transcreva: explique e ofereça
   uma alternativa de domínio público ou um exercício original com a mesma técnica.
3. Crie `content/songs/<slug>.tex` com cabeçalho completo, incluindo `\source`.
4. Rode o script de conteúdo para gerar o JSON e o catálogo, e corrija erros.
5. Aplique o `/fechar`.
