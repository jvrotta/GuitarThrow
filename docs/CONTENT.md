# Conteúdo — músicas e exercícios

## Regras de direitos autorais

- Entram no repositório apenas: exercícios originais, músicas de **domínio público**
  (folclore, cantigas tradicionais, obras de compositores falecidos há mais de 70 anos)
  e arranjos originais delas.
- Música protegida nunca é transcrita para cá. O usuário a importa a partir dos próprios
  arquivos (Guitar Pro / MusicXML / tab em texto, M6), e ela fica só no aparelho.
- Todo arquivo declara a origem no cabeçalho `// @source`.

## Fluxo

`content/songs/<id>.tex` (alphaTex, escrito à mão) → `npm run content` (também roda no `dev`, `build` e `test`)
→ `content/build/<id>.json` (modelo `Song`) + `content/catalog.json` (índice). Os gerados são versionados.
Para saber o que já existe, leia o **catálogo**, não os `.tex`. O id é o nome do arquivo.

## Formato do arquivo (alphaTab 1.9)

```
// @kind exercise            ← exercise | chords | song (obrigatório)
// @genre rock               ← opcional: estante de estilo na biblioteca, dividida por nível
// @level 1                  ← 1 a 5 (obrigatório)
// @source Exercício original ← origem/direitos (obrigatório)
// Qualquer outro comentário // é ignorado.
\title "Cordas soltas"
\tempo 70
\ts 4 4
:4 0.6 0.5 0.4 0.3 | 0.2 0.1 0.1 0.2 | 0.6.1
```

- Nota: `traste.corda` — corda **1 = Mi agudo**, 6 = Mi grave (igual à tab). Ex.: `3.5` = Dó3.
- Duração: `.4` semínima, `.8` colcheia, `.2` mínima, `.1` semibreve; `:4` define o padrão para as próximas.
  A duração de uma nota também vale para as seguintes até mudar.
- Pontuada: `0.1.4{d}`. Pausa: `r.4`. Acorde: `(0.1 1.2 0.3).4`. Barra de compasso: `|`.
- Dedo (opcional): `3.5{lf 2}` — no alphaTex `lf 1` é o polegar, então **`lf 2` = indicador**, 3 = médio, 4 = anelar, 5 = mínimo.
  Sem anotação o build deduz (corda solta = 0; por compasso, a posição que cabe os trastes em 4 casas).
- Sintaxe 1.9: **não** usar o separador `.` antigo depois dos metadados, nem `\staff {tabs}`.
- Erros do script apontam `arquivo: linha:coluna` (linhas contadas sem os comentários).

- Nome de acorde (opcional): efeito de batida **depois da duração**: `(0.6 2.5).4{ch "E5"}`, `0.5.8{ch "Am"}`.

## O que o juiz consegue avaliar (escrever para ele)

- Cada nota precisa de **ataque próprio** (palhetada): sem hammer-on, pull-off, slide nem bend.
- Evitar o **mesmo acorde batido várias vezes seguidas** em colcheias e a mesma nota grave repetida enquanto soa:
  o "som novo" fica pequeno e o juiz às vezes perde (ver ROADMAP). Alternar acordes ou "chug" na corda solta funciona.
- Toda peça nova de `content/build/rock-*.json` passa por `tests/rock-songs.test.ts`: uma execução sintética no
  tempo precisa ter ≥ 95 % das notas reconhecidas no Play-along. Para outra estante, estender o teste.

## Biblioteca atual

Ver `content/catalog.json`. Níveis: 1 = primeiras aulas (cordas soltas, 4 dedos), 2 = primeira posição com melodia
ou power chords móveis, 3 = riffs com troca de posição / pentatônica, 4–5 = pestana, arpejos, solo pelo braço.
Na biblioteca, uma estante de estilo (`@genre`) agrupa: Iniciante = 1–2, Médio = 3, Avançado = 4–5.
**Rock**: só composições originais no estilo (riffs, power chords, pentatônica); rock famoso é protegido — o usuário importa.
