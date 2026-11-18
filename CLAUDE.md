# GuitarThrow — ponto de entrada

**Leia só este arquivo primeiro.** Não varra o repositório nem releia conversas antigas.
Use o mapa abaixo para abrir apenas o que a tarefa exige.

PWA para iPhone que mostra a tab rolando, escuta o violão pelo microfone e guia a prática
em dois modos: **Espera** (só avança ao acertar) e **Play-along** (no andamento).

## Estado atual

Marco atual: **M1 — afinador redesenhado; aguardando aprovação no iPhone**. No ar: https://jvrotta.github.io/GuitarThrow/

## Mapa — "preciso de X → abro Y"

| Preciso de… | Abra |
|---|---|
| O que fazer agora, pendências, bugs conhecidos, histórico curto | `docs/ROADMAP.md` |
| Arquitetura, riscos técnicos, decisões e o porquê delas | `docs/DESIGN.md` |
| Formato das músicas e regras de conteúdo | `docs/CONTENT.md` |
| Lista de músicas existentes (sem abrir cada uma) | `content/catalog.json` (gerado) |
| Fonte de uma música | `content/songs/<slug>.tex` |
| Microfone, pitch, ataque, acordes (chroma) | `src/audio/index.ts` |
| Modelo da música, nota↔MIDI↔corda/traste, importadores | `src/music/index.ts` |
| Relógio, modos Espera/Play-along, pontuação | `src/engine/index.ts` |
| Telas e componentes | `src/ui/index.ts` |
| Persistência (IndexedDB) | `src/storage/index.ts` |
| Entrada do app (render + CSS global) | `src/main.tsx`, `src/ui/styles.css` |
| Scripts de build (ícones; alphaTex → JSON no M2) | `scripts/` |
| Testes (Vitest) e áudios de teste (WAV) | `tests/`, `tests/fixtures/` |
| Config: Vite + PWA (manifest), TypeScript | `vite.config.ts`, `tsconfig.json` |
| Deploy (GitHub Pages via Actions) | `.github/workflows/deploy.yml` |
| Ícones gerados | `public/icons/` (via `npm run icons`) |
| Servidores para o painel de preview | `.claude/launch.json` (`dev`, `preview`) |

Módulos de `src/` ainda vazios exportam `{}`; o comentário do `index.ts` diz em que marco ganham código.

## Como ler o código sem gastar tokens

- Cada pasta de `src/` expõe sua API pública **só** pelo `index.ts`, que começa com um comentário
  de 3–5 linhas dizendo o que o módulo faz. Para usar um módulo, leia o `index.ts`, não os internos.
- Não importe arquivos internos de outra pasta; só o `index.ts` dela.
- Arquivos com até ~200 linhas; passou disso, dividir.

## Convenções

- Código, nomes e commits em inglês; interface do app e documentação em pt-BR.
- TypeScript estrito. Sem dependência nova sem registrar o motivo em `docs/DESIGN.md`.
- Música protegida por direitos autorais nunca é transcrita para o repositório (ver `docs/CONTENT.md`).

## Comandos

Slash (em `.claude/commands/`):
- `/proximo` — executa o próximo item do ROADMAP.
- `/fechar` — atualiza ROADMAP/mapa, roda checagens e propõe o commit.
- `/musica <nome>` — cria uma música/exercício no formato oficial.
- `/bug <descrição>` — registra ou investiga um problema.

Terminal (disponíveis a partir do M0): `npm run dev` · `npm run build` · `npm test`

## Regra de manutenção (obrigatória ao fim de toda tarefa)

1. `docs/ROADMAP.md`: marcar o que foi feito, escrever o próximo passo, adicionar 1 linha ao histórico.
2. Criou, moveu ou removeu pasta/arquivo-chave → atualizar o **Mapa** acima.
3. Mudou uma decisão → registrar em `docs/DESIGN.md` §7.
4. Atualizar a linha "Marco atual" deste arquivo.
