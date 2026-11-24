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
| Hospedagem | **Repositório público + GitHub Pages**, deploy por GitHub Actions a cada push na `main` | URL `https://<usuario>.github.io/<repo>/`; o `base` do Vite vem do nome do repo no workflow. **Settings → Pages → Source tem que ser "GitHub Actions"**: em "Deploy from a branch" o deploy da branch roda depois e publica os fontes crus (página em branco). |
| Afinador (2º feedback, referência de app de afinador com cabeça do violão) | **Cabeça do violão 3+3** (Ré/Lá/Mi à esquerda, Sol/Si/Mi à direita, como visto de frente): a tarraxa, a corda e o rótulo da corda tocada acendem; **medidor com ponteiro vertical** e ♭/♯; texto "Aperte/Afrouxe". Mantidos: auto + trava (toque no rótulo; chip "Auto" destrava), cents contra a corda solta, ✓ por corda, mic no toque. Visual próprio (SVG desenhado aqui), sem copiar o app de referência. | Padrão de UX para as próximas telas: zero passos extras, pouco texto, alvos de toque ≥ 44 px, layouts próprios para retrato e paisagem. |
| Detecção no modo Espera (M3, revisada 2026-11-18) | Juiz **espectral sobre o som novo** (depois − antes de cada ataque): harmônicos destacados, energia explicada − não explicada, afinação estável. O detector de altura (pitchy) ficou só no afinador. Detalhes em §9. | 1ª versão (energia nos harmônicos do alvo + pitchy) aceitava quinta/oitava e transformava batidas e fala em notas (relato do usuário; reproduzido em 8/16 cenários realistas). FFT própria (sem dependência nova). Base para acordes no M4. |
| Worklet do microfone | `public/capture.worklet.js`, carregado por `BASE_URL` | Em `npm run dev` o Vite injetava código de hot-reload no worklet e o microfone falhava ("node name 'capture' is not defined"). |
| Acordes no modo Espera (M4, 2026-11-18) | Mesmo juiz espectral: cada nota do acorde precisa mostrar **harmônicos próprios** (que nenhuma outra nota do acorde tem, até 5 kHz, tolerância 25 cents); até 3 notas verificáveis → todas, mais que isso → todas menos uma; juntas explicam ≥ 50 % do som novo acima do acaso, por 3 quadros. Oitavas dobradas não são verificáveis (só contam pela vizinha). | Sem chroma (o plano antigo): o chroma confundia acordes com notas em comum. Acorde incompleto → "Faltou Dó no Am". |
| Play-along (M5, 2026-11-18) | O juiz recebe **todos os eventos pendentes perto do cursor** (`setTargets`); o horário do **ataque** (relógio do analisador → relógio da página pelo menor atraso visto − latência calibrada) vira posição em batidas; Perfeito ≤ 80 ms, Bom ≤ 160 ms, fora disso "adiantado/atrasado"; a nota vira erro quando a janela + 0,45 s de decisão passam. | O tempo é medido no ataque, não quando o juiz decide (~0,3 s depois). Teste de integração com áudio sintético: erro de medição < 40 ms. |
| Metrônomo e calibração | Clique = rajada curta de ruído filtrado no **mesmo AudioContext do microfone**, agendado ~120 ms à frente e adiantado pelo `outputLatency`. Sem altura definida, o juiz ignora o clique que o microfone ouve. Calibração: 4 + 8 cliques, o usuário toca qualquer corda solta junto; mediana de (ataque − batida) = latência salva. | Contagem sempre com clique; no Play-along o clique segue na música (ajuste). Espera: clique só na contagem. |
| Persistência (M6) | IndexedDB (chave-valor, fallback em memória): ajustes, melhor resultado por música e modo (estrelas → velocidade → precisão), última música (botão "Continuar"), músicas importadas. | Nada sai do aparelho. |
| Importação (M6) | Tab em texto: parser próprio (blocos de 6 linhas, coluna = colcheia, espaço largo = nota longa). Guitar Pro / MusicXML: **alphaTab em runtime, só por `import()` dinâmico** na tela Importar; fora do precache do PWA (cache na 1ª importação). Notas sem corda/traste → 1ª posição. | Bundle inicial continua ~33 KB gzip; o alphaTab (~320 KB gzip) só baixa ao importar um arquivo. |
| Estante de rock (2026-11-18) | Peças **originais** no estilo (rock famoso é protegido), `@genre rock`, biblioteca por faixa de nível (Iniciante 1–2, Médio 3, Avançado 4–5). Escritas para o juiz: só notas palhetadas, sem o mesmo acorde repetido em colcheias. Cada peça é "tocada" por áudio sintético em teste (≥ 95 % reconhecidas). | O teste achou um bug: no Play-along o rastreador de acordes zerava ao mudar a lista de candidatos no meio da decisão (corrigido). Ponto fraco aberto: nota grave/acorde repetido enquanto ainda soa. |
| Estante de metal (2026-11-18) | Pedido "músicas como Metallica": bandas são protegidas, então peças **originais** no estilo, `@genre metal`, mesmo teste de execução. Músicas reais entram só pela importação do usuário. | O teste mostrou o limite: Mi grave solto em semicolcheia não é medido; o "thrash" usa colcheias rápidas. |
| Estante tradicional (2026-11-24) | Pedido "músicas completas": só domínio público permite a canção inteira (Brilha Brilha, Parabéns — melodia, When the Saints, Ode à Alegria completa, Noite Feliz, Jingle Bells, Greensleeves, Minueto em Sol). Teste de execução vale para **toda** música. | O teste valia só para 4/4 e até 60 s de áudio (dois bugs do próprio teste, corrigidos); peças em 3/4 e longas agora são checadas de verdade. |
| Padrões assumidos | Interface em pt-BR e código em inglês; dados só no aparelho (sem login); tema escuro; Play-along começa só com metrônomo (som de referência sintetizado avaliado no M5) | Pode ser revisto a qualquer momento. |

### Dependências e motivo

| Pacote | Motivo |
|---|---|
| `preact` | UI com ~4 KB; API de componentes conhecida |
| `vite`, `@preact/preset-vite`, `typescript` | Build e dev server |
| `vite-plugin-pwa` | Gera manifest e service worker com precache dos assets com hash (offline) |
| `vitest` | Testes com a mesma config do Vite |
| `@coderline/alphatab` | No build lê alphaTex; no app, só via `import()` dinâmico na importação de Guitar Pro/MusicXML (chunk separado, fora do precache). Por isso saiu de devDependencies (M6). Armadilhas: `note.string` 1 = corda **mais grave**; `beat.playbackStart` é **relativo ao compasso** (somar `masterBar.start`); 960 ticks por semínima. Tudo isso fica isolado em `src/music/alphatab.ts`. |
| `pitchy` | Detecção de pitch MPM (McLeod) com autocorrelação via FFT; pequeno, sem dependências. Obs.: o `clarityThreshold` dele é o *k* do MPM, não um limiar de rejeição — a rejeição é nossa (`minClarity`). |

### Parâmetros do analisador (M1, `src/audio/analyzer.ts`)

Janela 2048 amostras, salto 512 (~90 análises/s a 48 kHz), faixa 70–1400 Hz, clareza ≥ 0,9, volume ≥ −55 dB,
mediana de 5 no afinador. Cada frame traz também `hopDb`/`hfDb` (ataque) e as últimas 8192 amostras (juiz do modo Espera). Ajustar com dados reais do iPhone (painel de debug + gravações WAV).

### Formato de autoria das músicas

Escrevo as músicas em **alphaTex** (texto compacto do alphaTab: poucos tokens para escrever, suporta tab, ritmo e acordes). Um script de build converte `.tex → JSON` do modelo interno, então o app em runtime **não carrega o alphaTab** (≈1,5 MB). O alphaTab só é carregado sob demanda na tela "Importar arquivo" (Guitar Pro / MusicXML). Tab ASCII em texto ganha um parser próprio e pequeno.

## 8. Marcos revisados

| # | Entrega |
|---|---|
| M0 | Esqueleto Vite+TS+Preact+PWA, deploy de preview HTTPS para abrir no iPhone |
| M1 | **Afinador** + painel de debug → valida detecção no seu iPhone |
| M2 | Modelo + tab rolando (canvas) + pipeline alphaTex→JSON + 3 exercícios |
| M3 | **Sessão de prática** (§9) + **Modo Espera — notas simples** (detecção de ataque) |
| M4 | **Modo Espera — acordes** (chroma vs. acorde esperado) |
| M5 | **Play-along** na mesma sessão (janelas Perfeito/Bom, bolinha no ritmo, metrônomo e contagem, loop A–B pela barra, calibração de latência) |
| M6 | Biblioteca embutida ampliada + importadores (GP/MusicXML/tab texto) + progresso |

## 9. Sessão de prática (desenho de 2026-11-18, a partir de referência de app de ensino)

A tela da música deixa de ser só visualização: vira uma **sessão** com início, feedback contínuo e resumo.
Conceitos usados (visual próprio, sem copiar o app de referência):

**Tela (paisagem; retrato mostra "gire o celular")**
- Topo (HUD): voltar · modo (Espera / Play-along) · velocidade · combo atual · precisão %.
- Tab: 6 cordas (Mi agudo em cima; 3 graves com textura de corda encapada), linha "agora" a 1/3.
- **Nota = pílula**: comprimento = duração, número = traste, **cor = dedo** (1 indicador, 2 médio, 3 anelar, 4 mínimo; cinza = corda solta).
  Depois de tocada, a cor vira o **resultado**: verde (acertou), vermelho apagado (errou/perdeu). Texto "Perfeito!/Bom" sobe da nota.
- **Bolinha**: pula em arco de uma nota à seguinte e cai no início de cada uma — mostra o ritmo antes de tocar.
  No modo Espera ela fica quicando na nota-alvo até o acerto.
- Rodapé: pausa · **barra da música inteira** (mini-mapa das notas, parte tocada colorida pelo resultado; tocar/arrastar = ir ao ponto).
- Início com contagem de 1 compasso; fim com **resumo**: precisão %, 1–3 estrelas, melhor sequência, botões repetir / mais lento / mais rápido.

**Motor (`src/engine`, sem UI)** — base `Session` (contagem, combo, precisão, seek, loop A–B) + `WaitSession` / `PlayAlongSession`
- Estado por evento: `pending | hit | miss` (+ `timing: perfect | good` no Play-along); alvo atual; combo; melhor combo.
- Entrada: `NotePlayed { time, midi }` vinda do áudio (ataque detectado + pitch estável).
- **Espera**: alvo = primeiro evento pendente. Nota certa → `hit`, avança. Nota errada → conta erro do alvo, zera combo,
  mostra o que foi tocado; **nunca avança sem acerto**. Precisão = alvos acertados na 1ª tentativa / total.
- **Play-along (M5, implementado)**: relógio corre; janela ±80 ms = Perfeito, ±160 ms = Bom; nota certa fora da janela =
  "adiantado/atrasado"; `miss` quando a janela + o tempo de decisão do juiz passam. Ver §7.
- **Loop A–B**: botão no rodapé marca o início no compasso atual, depois o fim; cada volta recomeça com contagem.
- Estrelas: ≥ 60% = 1, ≥ 80% = 2, ≥ 95% = 3.

**Dedo por nota**: `NoteRef.finger` (0–4). Vem da digitação anotada no alphaTex (`{lf 2}` = indicador; `lf 1` é o polegar); sem anotação, deduz:
traste 0 → 0; trastes 1–4 → dedo = traste (1ª posição); acima disso, posição = menor traste do trecho.

**Detecção de nota tocada (M3, implementado)**
- Ataque (`NoteDetector`): salto do nível do bloco de ~11 ms (≥ 5 dB) ou do "clique" de alta frequência (≥ 9 dB, pico em
  sub-blocos de 128 amostras). Pega notas repetidas a 0,2 s; a janela de 2048 amostras sozinha suavizava demais.
- **Juiz do modo Espera (`WaitJudge`, refeito em 2026-11-18 após o teste no iPhone)** — trabalha só com o som **novo**:
  em cada ataque congela o espectro de antes (FFT 8192 ≈ 170 ms, Hann) e, nos ~30 quadros seguintes, analisa
  `depois − antes`. Cordas que continuam soando somem dessa diferença. Para cada nota candidata (Mi2–Mi6):
  - ≥ 3 dos 6 primeiros harmônicos **destacados** (10× o ruído de fundo da faixa e 4× os bins vizinhos) — batida/zumbido têm 1 pico;
  - **pontuação = energia explicada − não explicada** na faixa da nota (0,5·f0 até o 10º harmônico) e harmonicidade ≥ 60 %:
    palma (ruído largo) fica negativa; um harmônico tomado pela nota (quinta/oitava acima) deixa a fundamental sem explicação;
  - harmônicos ímpares presentes (senão é a oitava acima disfarçada);
  - **afinação estável**: ≤ 5 cents de variação por quadro durante 3 quadros e ≤ 25 cents da nota (corda acima disso → afinar).
    A voz desliza; a corda não.
  Acerto = alvo estável com ≥ 70 % da pontuação da melhor candidata. Erro = outra nota vence ≥ 4 quadros estáveis com
  afinação variando ≤ 10 cents. Ataque exige subida em ≤ 32 ms (`JUDGE_ONSET`): sílabas de fala sobem devagar.
  Um ataque < 170 ms após outro não pode repetir a nota anterior (ela ainda está entrando na janela).
  Limite conhecido: uma vogal sustentada exatamente no tom da nota-alvo equivale a cantá-la e conta.
  Testes com áudio realista (`tests/synth.ts`: corda Karplus–Strong, mic de celular, ruído ambiente, palmas, batidas, fala).
- Um ataque gera no máximo um acerto (nota repetida exige novo ataque). "Errou" só conta para nota ligada a um ataque
  e espera ~290 ms (a janela de confirmação) antes de valer; troca de altura sem ataque nunca é erro.
