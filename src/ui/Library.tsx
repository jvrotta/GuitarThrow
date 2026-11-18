import { catalog, type CatalogEntry } from '../music';

const GROUPS: { kind: CatalogEntry['kind']; title: string }[] = [
  { kind: 'exercise', title: 'Exercícios' },
  { kind: 'song', title: 'Músicas' },
];

export function Library({ onOpen, onBack }: { onOpen: (id: string) => void; onBack: () => void }) {
  return (
    <main class="page">
      <header class="bar">
        <button class="icon-btn" onClick={onBack} aria-label="Voltar">‹</button>
        <h2>Músicas</h2>
        <span class="icon-btn" />
      </header>
      {GROUPS.map((g) => (
        <section key={g.kind} class="lib-group">
          <h3>{g.title}</h3>
          {catalog
            .filter((e) => e.kind === g.kind)
            .map((e) => (
              <button key={e.id} class="lib-item" onClick={() => onOpen(e.id)}>
                <span class="lib-main">
                  <strong>{e.title}</strong>
                  <span>
                    {e.tempo} bpm · {e.bars} compassos · {e.source}
                  </span>
                </span>
                <span class="level" aria-label={`nível ${e.level}`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <i key={n} class={n <= e.level ? 'on' : ''} />
                  ))}
                </span>
              </button>
            ))}
        </section>
      ))}
    </main>
  );
}
