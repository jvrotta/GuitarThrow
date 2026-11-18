# Roadmap

> Fonte do "o que fazer agora". Atualizado ao fim de toda tarefa (regra em `CLAUDE.md`).

## Próximo passo

1. **Usuário**: testar de novo no iPhone o juiz refeito — "Cordas soltas" (deixe soar), "Cromático", uma nota errada,
   e ruídos (bater no corpo do violão, palmas, falar perto). Se algo falhar, gravar 5 s no painel de debug do afinador
   e mandar o WAV (vira fixture em `tests/fixtures/`).
2. M4 — Modo Espera com acordes (o juiz já checa várias notas-alvo; falta exigir o acorde inteiro).

## Marcos

### M0 — Esqueleto e deploy
- [x] Vite + TS estrito + Preact + Vitest; scripts `dev`, `build`, `test`
- [x] Manifest PWA + service worker (offline), ícones (`npm run icons`), orientação paisagem
- [x] Pastas `src/{audio,music,engine,ui,storage}` com `index.ts` comentado; utilitários de nota + testes
- [x] Workflow `.github/workflows/deploy.yml` (testa, builda com `BASE_PATH=/<repo>/`, publica no Pages)
- [x] Primeiro deploy no ar: https://jvrotta.github.io/GuitarThrow/ (repo `jvrotta/GuitarThrow`)
- [x] App instalado no iPhone (usuário)

### M1 — Afinador + painel de debug
- [x] Captura do mic (AudioWorklet em arquivo próprio, sem eco/ruído/ganho automático)
- [x] Detecção de pitch (`pitchy`) + nota (solfejo e cifra), cents, corda mais próxima; testes com sinais sintéticos das 6 cordas
- [x] Painel de debug: Hz bruto, clareza, dB, aceito, frames/s, taxa, latência, processamento aplicado
- [x] Gravar 5 s no painel e salvar WAV (Compartilhar no iOS)
- [x] Validação no iPhone: Mi grave estável (usuário, 2026-11-18)
- [x] Redesenho após o teste: cordas em destaque, auto + trava, ✓ por corda, mic no toque, retrato/paisagem, home nova
- [x] Aprovação do redesenho no iPhone (usuário, 2026-11-18)

### M2 — Tab rolando
- [x] Modelo `Song`/`SongEvent` + conversor alphaTab → Song (reusável no M6) + `Transport` (engine)
- [x] Script alphaTex → JSON + `content/catalog.json` (roda no dev/build/test; CI em Node 24)
- [x] Render da tab em canvas (cursor fixo a 1/3, sustentação, compassos, HiDPI) + arrastar para navegar
- [x] Telas Músicas (biblioteca) e Visualizar (▶/pausa, 50/75/100%, contador de compassos, aviso para girar)
- [x] 3 exercícios + Ode à Alegria (domínio público)
- [x] Teste no iPhone (substituído pelo teste do M3: a tela de visualização virou a tela de prática)

### M3 — Sessão de prática + Modo Espera (notas simples) — desenho em DESIGN §9
- [x] Modelo: `finger` por nota (alphaTex `{lf 2}` = indicador + dedução por compasso)
- [x] Áudio: detector de ataque (bloco de 11 ms + clique de alta frequência) + `NotePlayed`; notas repetidas a 0,2 s
- [x] Áudio: `WaitJudge` orientado à nota-alvo (funciona com cordas anteriores soando)
- [x] Áudio: juiz refeito após o 1º teste no iPhone (ruído virava nota, quinta/oitava aceitas): espectro do som novo,
      harmônicos destacados, afinação estável; 21 cenários com áudio realista
- [x] Engine: `PracticeSession` (Espera): contagem de 1 compasso, alvo, hit/erro, combo, precisão, estrelas, seek
- [x] Tela de prática: pílulas por dedo/resultado, bolinha, HUD, "Você tocou X", mini-mapa, resumo; verificada com som simulado
- [ ] Teste no iPhone (usuário)

### M4 — Modo Espera: acordes
- [ ] Chroma + comparação com o acorde esperado

### M5 — Play-along
- [ ] Transport, metrônomo, velocidade, loop A–B
- [ ] Pontuação por nota + calibração de latência

### M6 — Conteúdo e progresso
- [ ] Biblioteca de domínio público ampliada
- [ ] Importadores: Guitar Pro / MusicXML (alphaTab sob demanda), tab em texto
- [ ] Progresso por música

## Problemas conhecidos

- Atualização do PWA: quem já tinha o app aberto pode ver a versão antiga na 1ª abertura após o deploy;
  a nova aparece ao reabrir (conferir pelo número de versão no rodapé).
- Ao voltar do segundo plano o microfone é desligado de propósito; o usuário toca "Toque para ouvir" de novo.
- iOS ignora `orientation` do manifest: a tela da música mostra "Gire o celular" em retrato.
- `npm audit` acusa ReDoS em `picomatch`/`minimatch`/`glob` via vite/vitest/vite-plugin-pwa: só ferramentas de build,
  nada vai para o app publicado. Reavaliar ao atualizar dependências.
- No Git Bash do Windows, `BASE_PATH=/x/` é convertido em caminho Windows; use `MSYS_NO_PATHCONV=1` para testar localmente.

## Histórico (1 linha por tarefa, mais recente no topo)

- 2026-11-18 — Juiz do modo Espera refeito (relato: ruído virava nota, notas confundidas): análise espectral do som novo após cada ataque, harmônicos destacados, afinação estável; áudio de teste realista (Karplus–Strong, mic de celular, palmas, batidas, fala); 61 testes; verificado no navegador.
- 2026-11-18 — M3: sessão de prática no modo Espera (juiz pela nota-alvo, ataque de 11 ms, dedos, bolinha, mini-mapa, resumo); 46 testes; verificado no navegador com som simulado. Corrigido mic no `npm run dev` (worklet em public/).
- 2026-11-18 — Lógica de tocar repensada (referência de app de ensino): sessão de prática, pílulas por dedo, bolinha, precisão + combo (DESIGN §9).
- 2026-11-18 — Afinador refeito com cabeça do violão 3+3 e medidor de ponteiro (feedback: pouco intuitivo); verificado em retrato/paisagem.
- 2026-11-18 — M2: modelo Song, pipeline alphaTex→JSON, biblioteca, tab em canvas com transporte; verificado em retrato/paisagem.
- 2026-11-18 — Afinador redesenhado (feedback: passos demais, leitura difícil, layout, visual); verificado em 390×844 e 844×390 com som simulado.
- 2026-11-18 — M1: afinador + painel de debug + gravação WAV; verificado no navegador com som simulado (A2 +7 cents, E2 afinado, ~90 frames/s).
- 2026-11-17 — Remoto `origin` configurado, push da `main`, primeiro deploy no Pages verificado (versão 1f2780a).
- 2026-11-17 — M0: esqueleto Vite+TS+Preact+PWA, ícones, utilitários de nota com testes, workflow do GitHub Pages.

- 2026-11-17 — Esboço do projeto, decisões iniciais e estrutura de navegação (CLAUDE.md, docs/, comandos).
