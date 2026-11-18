# Roadmap

> Fonte do "o que fazer agora". Atualizado ao fim de toda tarefa (regra em `CLAUDE.md`).

## Próximo passo

1. **Usuário — validar o M1 no iPhone** (https://jvrotta.github.io/GuitarThrow/, instalado na Tela de Início):
   - Afinador → Ativar microfone → tocar cada corda solta (6ª a 1ª), uma por vez.
   - Abrir "Debug" e anotar: frames/s, latência base, linha "Eco / ruído / ganho" e se a nota fica estável.
   - Testar a 6ª corda (Mi grave) com atenção: se aparecer Mi uma oitava acima ou a nota pular, relatar.
   - Gravar 5 s de cada corda solta → "Salvar" → enviar os WAV para `tests/fixtures/` (viram testes).
2. Ajustar parâmetros do analisador com esses dados, se preciso; depois M2 — tab rolando.

## Marcos

### M0 — Esqueleto e deploy
- [x] Vite + TS estrito + Preact + Vitest; scripts `dev`, `build`, `test`
- [x] Manifest PWA + service worker (offline), ícones (`npm run icons`), orientação paisagem
- [x] Pastas `src/{audio,music,engine,ui,storage}` com `index.ts` comentado; utilitários de nota + testes
- [x] Workflow `.github/workflows/deploy.yml` (testa, builda com `BASE_PATH=/<repo>/`, publica no Pages)
- [x] Primeiro deploy no ar: https://jvrotta.github.io/GuitarThrow/ (repo `jvrotta/GuitarThrow`)
- [ ] App instalado no iPhone (usuário)

### M1 — Afinador + painel de debug
- [x] Captura do mic (AudioWorklet em arquivo próprio, sem eco/ruído/ganho automático)
- [x] Detecção de pitch (`pitchy`) + nota (solfejo e cifra), cents, corda mais próxima; testes com sinais sintéticos das 6 cordas
- [x] Painel de debug: Hz bruto, clareza, dB, aceito, frames/s, taxa, latência, processamento aplicado
- [x] Gravar 5 s no painel e salvar WAV (Compartilhar no iOS)
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

- Não validado em iPhone real ainda (só Chromium com oscilador no lugar do mic).
- Ao voltar do segundo plano o microfone é desligado de propósito; o usuário toca "Ativar" de novo.
- iOS ignora `orientation` do manifest: telas de prática precisarão de aviso "gire o celular" (M2).
- `npm audit` acusa ReDoS em `picomatch`/`minimatch`/`glob` via vite/vitest/vite-plugin-pwa: só ferramentas de build,
  nada vai para o app publicado. Reavaliar ao atualizar dependências.
- No Git Bash do Windows, `BASE_PATH=/x/` é convertido em caminho Windows; use `MSYS_NO_PATHCONV=1` para testar localmente.

## Histórico (1 linha por tarefa, mais recente no topo)

- 2026-11-18 — M1: afinador + painel de debug + gravação WAV; verificado no navegador com som simulado (A2 +7 cents, E2 afinado, ~90 frames/s).
- 2026-11-17 — Remoto `origin` configurado, push da `main`, primeiro deploy no Pages verificado (versão 1f2780a).
- 2026-11-17 — M0: esqueleto Vite+TS+Preact+PWA, ícones, utilitários de nota com testes, workflow do GitHub Pages.

- 2026-11-17 — Esboço do projeto, decisões iniciais e estrutura de navegação (CLAUDE.md, docs/, comandos).
