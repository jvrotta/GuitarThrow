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
// @kind exercise            ← exercise | song (obrigatório)
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
- Sintaxe 1.9: **não** usar o separador `.` antigo depois dos metadados, nem `\staff {tabs}`.
- Erros do script apontam `arquivo: linha:coluna` (linhas contadas sem os comentários).

## Biblioteca atual

Ver `content/catalog.json`. Níveis: 1 = primeiras aulas (cordas soltas, 4 dedos), 2 = primeira posição com melodia.
