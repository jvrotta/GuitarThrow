# Conteúdo — músicas e exercícios

## Regras de direitos autorais

- Entram no repositório apenas: exercícios originais, músicas de **domínio público**
  (folclore, cantigas tradicionais, obras de compositores falecidos há mais de 70 anos)
  e arranjos originais delas.
- Música protegida nunca é transcrita para cá. O usuário a importa a partir dos próprios
  arquivos (Guitar Pro / MusicXML / tab em texto), e ela fica só no aparelho.
- Todo arquivo de música declara a origem no cabeçalho (`\source`) — ex.: "Tradicional", "Exercício original".

## Formato

- Fonte: `content/songs/<slug>.tex` em alphaTex.
- `scripts/` converte cada `.tex` para o JSON do modelo interno (`Song`, ver DESIGN §3)
  e regenera `content/catalog.json` (título, slug, nível, tipo, andamento).
- Para saber o que já existe, leia o catálogo, não os `.tex`.

Detalhes de sintaxe e um exemplo completo serão fixados no M2.
