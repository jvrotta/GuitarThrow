# Roadmap

> Fonte do "o que fazer agora". Atualizado ao fim de toda tarefa (regra em `CLAUDE.md`).

## Próximo passo

1. **Usuário**: criar repositório público vazio no GitHub, fazer o push da `main` e em
   *Settings → Pages → Source* escolher **GitHub Actions**. Abrir a URL no iPhone e "Adicionar à Tela de Início".
2. Depois: M1 — afinador + painel de debug.

## Marcos

### M0 — Esqueleto e deploy
- [x] Vite + TS estrito + Preact + Vitest; scripts `dev`, `build`, `test`
- [x] Manifest PWA + service worker (offline), ícones (`npm run icons`), orientação paisagem
- [x] Pastas `src/{audio,music,engine,ui,storage}` com `index.ts` comentado; utilitários de nota + testes
- [x] Workflow `.github/workflows/deploy.yml` (testa, builda com `BASE_PATH=/<repo>/`, publica no Pages)
- [ ] Primeiro deploy no ar e app instalado no iPhone (depende do repo no GitHub)

### M1 — Afinador + painel de debug
- [ ] Captura do mic (AudioWorklet, sem eco/ruído/ganho automático)
- [ ] Detecção de pitch (`pitchy`) + nota/cents na tela
- [ ] Painel de debug: Hz, cents, clareza, energia
- [ ] Gravar amostra no painel e exportar WAV (vira fixture de teste)
- [ ] Validação no iPhone (feita pelo usuário)

### M2 — Tab rolando
- [ ] Modelo `Song`/`Event` + utilitários de nota
- [ ] Script alphaTex → JSON + `content/catalog.json`
- [ ] Render da tab em canvas (cursor fixo a 1/3)
- [ ] 3 exercícios iniciais

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

- iOS ignora `orientation` do manifest: telas de prática precisarão de aviso "gire o celular" (M2).
- `npm audit` acusa ReDoS em `picomatch`/`minimatch`/`glob` via vite/vitest/vite-plugin-pwa: só ferramentas de build,
  nada vai para o app publicado. Reavaliar ao atualizar dependências.
- No Git Bash do Windows, `BASE_PATH=/x/` é convertido em caminho Windows; use `MSYS_NO_PATHCONV=1` para testar localmente.

## Histórico (1 linha por tarefa, mais recente no topo)

- 2026-11-17 — M0: esqueleto Vite+TS+Preact+PWA, ícones, utilitários de nota com testes, workflow do GitHub Pages.

- 2026-11-17 — Esboço do projeto, decisões iniciais e estrutura de navegação (CLAUDE.md, docs/, comandos).
