# GuitarThrow — ponto de entrada

**Leia só este arquivo primeiro.** Não varra o repositório nem releia conversas antigas.
Use o mapa abaixo para abrir apenas o que a tarefa exige.

PWA para iPhone que mostra a tab rolando, escuta o violão pelo microfone e guia a prática
em dois modos: **Espera** (só avança ao acertar) e **Play-along** (no andamento).

## Estado atual

Marco atual: **M4 + M5 + M6 (parcial) prontos sem violão — acordes, Play-along, calibração, Ajustes, progresso, importação, estantes Rock, Metal e Tradicionais e clássicas por nível; aguardando o teste completo no iPhone**. No ar: https://jvrotta.github.io/GuitarThrow/

## Mapa — "preciso de X → abro Y"

| Preciso de… | Abra |
|---|---|
| O que fazer agora, pendências, bugs conhecidos, histórico curto | `docs/ROADMAP.md` |
| Arquitetura, riscos técnicos, decisões e o porquê delas | `docs/DESIGN.md` |
| Formato das músicas e regras de conteúdo | `docs/CONTENT.md` |
| Lista de músicas existentes (sem abrir cada uma) | `content/catalog.json` (gerado) |
| Fonte de uma música / JSON gerado | `content/songs/<id>.tex` / `content/build/<id>.json` |
| Microfone, pitch, ataque, juiz (notas e acordes, espectral) | `src/audio/index.ts` (juiz: `judge.ts`, `harmonic.ts`, `chord.ts`; worklet: `public/capture.worklet.js`) |
| Modelo da música, nota↔MIDI↔corda/traste, importadores (texto, GP/MusicXML) | `src/music/index.ts` (`texttab.ts`, `import.ts`) |
| Relógio, sessão de prática (Espera/Play-along), pontuação, loop | `src/engine/index.ts` (`session.ts`, `practice.ts`, `playalong.ts`) |
| Telas e componentes | `src/ui/index.ts` |
| Telas Ajustes, Calibrar, Importar | `src/ui/SettingsPage.tsx`, `src/ui/Calibrate.tsx`, `src/ui/Import.tsx` (estilos: `src/ui/forms.css`) |
| Desenho da tab (canvas, geometria, cores, bolinha) | `src/ui/tab/geometry.ts`, `draw.ts`, `overlay.ts`, `TabCanvas.tsx` |
| Tela de prática (HUD, controles, mini-mapa, resumo; ligação mic→juiz, relógio+metrônomo) | `src/ui/practice/` (`useJudge.ts`, `useClock.ts`, `metronome.ts`) |
| Persistência (IndexedDB: ajustes, progresso, importadas) | `src/storage/index.ts` |
| Entrada do app e estilos (tokens / páginas / afinador / prática / formulários) | `src/main.tsx`, `src/ui/styles.css`, `src/ui/pages.css`, `src/ui/tuner/tuner.css`, `src/ui/practice/practice.css`, `src/ui/forms.css` |
| Afinador: cabeça do violão (SVG) e medidor | `src/ui/tuner/Headstock.tsx`, `src/ui/tuner/Gauge.tsx` |
| Scripts: conteúdo (alphaTex → JSON + catálogo), ícones | `scripts/build-content.mjs`, `scripts/gen-icons.mjs` |
| Testes (Vitest), gerador de áudio realista e áudios de teste (WAV) | `tests/`, `tests/synth.ts`, `tests/fixtures/` |
| "Tocar" uma música com áudio sintético e julgar (checa se as peças são reconhecíveis) | `tests/perform.ts`, `tests/playable-songs.test.ts` |
| Config: Vite + PWA (manifest), TypeScript | `vite.config.ts`, `tsconfig.json` |
| Deploy (GitHub Pages via Actions) | `.github/workflows/deploy.yml` |
| Ícones gerados | `public/icons/` (via `npm run icons`) |
| Servidores para o painel de preview | `.claude/launch.json` (`dev`, `preview`) |

O comentário de cada `index.ts` diz o que existe e em que marco entra o resto.

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

Terminal: `npm run dev` · `npm run build` · `npm test` · `npm run content` (regenera músicas; dev/build/test já rodam)

## Regra de manutenção (obrigatória ao fim de toda tarefa)

1. `docs/ROADMAP.md`: marcar o que foi feito, escrever o próximo passo, adicionar 1 linha ao histórico.
2. Criou, moveu ou removeu pasta/arquivo-chave → atualizar o **Mapa** acima.
3. Mudou uma decisão → registrar em `docs/DESIGN.md` §7.
4. Atualizar a linha "Marco atual" deste arquivo.
