# Roadmap

> Fonte do "o que fazer agora". Atualizado ao fim de toda tarefa (regra em `CLAUDE.md`).

## Próximo passo

1. **Usuário — testar no iPhone** o afinador novo (cabeça do violão + ponteiro) e o **M2**: Início → Músicas → abrir um exercício; tocar ▶, mudar a velocidade,
   arrastar a tab com o dedo, girar o celular. Relatar o que estiver ruim de ler (tamanho dos números, espaçamento, cores).
2. M3 — Modo Espera com notas simples (detector de ataque + engine que só avança no acerto).

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
- [ ] Teste no iPhone (usuário)

### M3 — Modo Espera: notas simples
- [ ] Detector de ataque (onset)
- [ ] Engine Espera: avança só no acerto, sem pular notas repetidas
- [ ] Testes com fixtures WAV

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
- Ao voltar do segundo plano o microfone é desligado de propósito; o usuário toca "Ativar" de novo.
- iOS ignora `orientation` do manifest: a tela da música mostra "Gire o celular" em retrato.
- `npm audit` acusa ReDoS em `picomatch`/`minimatch`/`glob` via vite/vitest/vite-plugin-pwa: só ferramentas de build,
  nada vai para o app publicado. Reavaliar ao atualizar dependências.
- No Git Bash do Windows, `BASE_PATH=/x/` é convertido em caminho Windows; use `MSYS_NO_PATHCONV=1` para testar localmente.

## Histórico (1 linha por tarefa, mais recente no topo)

- 2026-11-18 — Afinador refeito com cabeça do violão 3+3 e medidor de ponteiro (feedback: pouco intuitivo); verificado em retrato/paisagem.
- 2026-11-18 — M2: modelo Song, pipeline alphaTex→JSON, biblioteca, tab em canvas com transporte; verificado em retrato/paisagem.
- 2026-11-18 — Afinador redesenhado (feedback: passos demais, leitura difícil, layout, visual); verificado em 390×844 e 844×390 com som simulado.
- 2026-11-18 — M1: afinador + painel de debug + gravação WAV; verificado no navegador com som simulado (A2 +7 cents, E2 afinado, ~90 frames/s).
- 2026-11-17 — Remoto `origin` configurado, push da `main`, primeiro deploy no Pages verificado (versão 1f2780a).
- 2026-11-17 — M0: esqueleto Vite+TS+Preact+PWA, ícones, utilitários de nota com testes, workflow do GitHub Pages.

- 2026-11-17 — Esboço do projeto, decisões iniciais e estrutura de navegação (CLAUDE.md, docs/, comandos).
