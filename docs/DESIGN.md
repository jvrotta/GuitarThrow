# GuitarThrow — Esboço de Projeto

> Arquitetura, riscos e decisões. Ponto de entrada do projeto: `CLAUDE.md`. Estado e próximos passos: `docs/ROADMAP.md`.
> Leia só a seção que a tarefa exige.

## 1. Objetivo

App no celular que mostra a música (tab/notas), **escuta o violão pelo microfone** e acompanha o aluno em dois modos:

| Modo | Comportamento | Avaliação |
|---|---|---|
| **Espera (Step)** | Cursor parado na nota atual; só avança quando ela é tocada corretamente. Nenhuma nota é pulada. | Acertou / errou (mostra o que você tocou) |
| **Play-along** | Música corre no andamento escolhido (ex.: 50–100%), com metrônomo e/ou áudio de referência. | Por nota: no tempo / adiantado / atrasado / perdida; % de acerto |

Extras que saem "de graça" do mesmo motor: **afinador**, **metrônomo**, **loop A–B**, **progresso por música**.

## 2. Plataforma — recomendação: PWA (web app instalável)

- Roda no navegador do celular, instala na tela inicial, funciona offline. Sem loja de apps, sem build nativo.
- Microfone via `getUserMedia` → **exige HTTPS** (hospedagem grátis: GitHub Pages / Cloudflare Pages; em dev, Vite com HTTPS na rede local).
- Alternativa nativa (Flutter/React Native) só se a latência no navegador se mostrar inaceitável — validado no Marco 1.

**Stack:** Vite + TypeScript + Preact (UI enxuta) + Canvas (render da tab a 60fps) + `pitchy` (detecção de pitch, MPM) + IndexedDB (músicas/progresso). Opcional: `alphaTab` só como *importador* de Guitar Pro / MusicXML.

## 3. Arquitetura

```
src/
  audio/      mic (AudioWorklet), pitch (MPM), onset (ataque), chroma (acordes, fase 2)
  music/      tipos do modelo, util nota↔MIDI↔corda/traste, importadores
  engine/     Transport (relógio = AudioContext.currentTime), WaitMode, PlayAlongMode, Scoring
  ui/         telas: Biblioteca, Prática, Afinador, Ajustes (calibração)
  storage/    IndexedDB
```

Fluxo: `mic → frames (2048 amostras) → {pitch Hz, clareza, energia} → detector de ataque → evento "nota tocada" → engine compara com nota esperada → UI`.

### Modelo de música (interno, simples; importadores convertem para ele)

```ts
Song   { id, title, tempo, timeSig:[4,4], tuning:[40,45,50,55,59,64], events: Event[] }
Event  { beat: number, dur: number, notes: { string:1-6, fret:number, midi:number }[] }
```
Um `Event` com 1 nota = nota simples; com várias = acorde/díade.

## 4. Pontos técnicos críticos (onde mora o risco)

1. **Desligar processamento do mic**: `echoCancellation/noiseSuppression/autoGainControl: false`. Com eles ligados, o celular "come" notas sustentadas.
2. **Faixa do violão**: Mi grave 82 Hz → ~1300 Hz. Buffer de 2048 amostras (~43 ms) é o mínimo para o Mi grave.
3. **Erros de oitava** (harmônicos): validar por *classe de nota + oitava com tolerância*, ±~40 cents, exigindo N frames estáveis.
4. **Notas repetidas no modo Espera** (ex.: Mi, Mi, Mi): sem detectar o **ataque** (salto de energia), a nota sustentada "acertaria" as seguintes sozinha. O detector de onset é obrigatório para garantir "nenhuma nota pulada".
5. **Mesma nota em cordas diferentes**: o mic não sabe a corda. A tab mostra corda/traste, mas a validação é pela altura. (Aceitável.)
6. **Acordes**: detecção polifônica geral é difícil, mas aqui **sabemos o acorde esperado** → basta comparar o perfil cromático (chroma) com o do acorde. Viável, porém fica para a fase 2.
7. **Latência no Play-along**: celulares têm 50–150 ms. Tela de calibração ("toque junto com o clique") salva um offset.
8. **Tela apagando**: Wake Lock API durante a prática. iOS: AudioContext só inicia após um toque do usuário.

## 5. Princípio dos marcos

Cada marco é pequeno, testável no celular e útil sozinho. O afinador vem primeiro porque valida o maior risco (detecção no *seu* aparelho) antes de investir no resto. Lista atual em §8.

## 6. Eficiência de tokens no desenvolvimento

- Este `DESIGN.md` + um `CLAUDE.md` curto com convenções → nenhuma sessão precisa reexplorar o projeto.
- Um marco por sessão/pedido; nada de construir M4 antes de M1 validar o áudio.
- Bibliotecas prontas para o que é resolvido (`pitchy`, importador do alphaTab); código próprio só no que é específico (engine, UI).
- Testes do detector com **arquivos WAV gravados** por você (fixtures) → ajuste de parâmetros sem precisar de você tocando a cada iteração.
- Painel de debug no app: você descreve o que viu ("Hz pulando no Mi grave") em vez de eu adivinhar.

## 7. Decisões tomadas (2026-11-17)

| Tema | Decisão | Consequência no projeto |
|---|---|---|
| Celular | **iPhone** (Safari / PWA na tela inicial) | Alvo iOS 16.4+. Áudio só inicia após toque. Teste em dev exige HTTPS confiável → deploy de preview (GitHub/Cloudflare Pages) ou túnel (`cloudflared`); certificado autoassinado não serve para o mic no iOS. Eu não consigo testar Safari/iOS daqui: a validação no aparelho é sua, guiada pelo painel de debug. |
| Conteúdo | **Notas simples e acordes** | Acordes deixam de ser "fase 2 distante": entram logo após o modo Espera (ver marcos revisados). |
| Músicas | **Eu busco, crio ou converto** | (a) Biblioteca embutida: exercícios técnicos + músicas de **domínio público** (folclore/infantis brasileiras, clássicos antigos como Romance Anônimo, estudos de Carulli/Sor, Ode à Alegria). (b) **Importadores** para você trazer o que tiver (Guitar Pro, MusicXML, tab em texto). Músicas protegidas por direitos autorais não são transcritas para dentro do repositório — entram só pelos seus arquivos. |
| Visual | **Tab rolando na horizontal** | Canvas, 6 linhas, cursor fixo a ~1/3 da tela, tela em paisagem. No modo Espera a tab rola até a nota atual e para; no Play-along rola contínua. |

| Repositório | **Git**, com navegação por `CLAUDE.md` (mapa) → `docs/ROADMAP.md` → `index.ts` de cada módulo | Nenhuma tarefa precisa ler o repo inteiro nem o histórico do chat. Comandos `/proximo`, `/fechar`, `/musica`, `/bug`. |
| Hospedagem | **Repositório público + GitHub Pages**, deploy por GitHub Actions a cada push na `main` | URL `https://<usuario>.github.io/<repo>/`; o `base` do Vite vem do nome do repo no workflow. |
| Padrões assumidos | Interface em pt-BR e código em inglês; dados só no aparelho (sem login); tema escuro; Play-along começa só com metrônomo (som de referência sintetizado avaliado no M5) | Pode ser revisto a qualquer momento. |

### Dependências e motivo

| Pacote | Motivo |
|---|---|
| `preact` | UI com ~4 KB; API de componentes conhecida |
| `vite`, `@preact/preset-vite`, `typescript` | Build e dev server |
| `vite-plugin-pwa` | Gera manifest e service worker com precache dos assets com hash (offline) |
| `vitest` | Testes com a mesma config do Vite |
| `pitchy` | Detecção de pitch MPM (McLeod) com autocorrelação via FFT; pequeno, sem dependências. Obs.: o `clarityThreshold` dele é o *k* do MPM, não um limiar de rejeição — a rejeição é nossa (`minClarity`). |

### Parâmetros do analisador (M1, `src/audio/analyzer.ts`)

Janela 2048 amostras, salto 512 (~90 análises/s a 48 kHz), faixa 70–1400 Hz, clareza ≥ 0,9, volume ≥ −55 dB,
mediana de 5 no afinador. Ajustar com dados reais do iPhone (painel de debug + gravações WAV).

### Formato de autoria das músicas

Escrevo as músicas em **alphaTex** (texto compacto do alphaTab: poucos tokens para escrever, suporta tab, ritmo e acordes). Um script de build converte `.tex → JSON` do modelo interno, então o app em runtime **não carrega o alphaTab** (≈1,5 MB). O alphaTab só é carregado sob demanda na tela "Importar arquivo" (Guitar Pro / MusicXML). Tab ASCII em texto ganha um parser próprio e pequeno.

## 8. Marcos revisados

| # | Entrega |
|---|---|
| M0 | Esqueleto Vite+TS+Preact+PWA, deploy de preview HTTPS para abrir no iPhone |
| M1 | **Afinador** + painel de debug → valida detecção no seu iPhone |
| M2 | Modelo + tab rolando (canvas) + pipeline alphaTex→JSON + 3 exercícios |
| M3 | **Modo Espera — notas simples** (com detecção de ataque) |
| M4 | **Modo Espera — acordes** (chroma vs. acorde esperado) |
| M5 | **Play-along** (transport, metrônomo, velocidade, loop A–B, pontuação, calibração de latência) |
| M6 | Biblioteca embutida ampliada + importadores (GP/MusicXML/tab texto) + progresso |
