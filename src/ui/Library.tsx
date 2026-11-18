import { useEffect, useState } from 'preact/hooks';
import { catalog, type CatalogEntry, type Song } from '../music';
import { allProgress, deleteImported, listImported, type SongProgress } from '../storage';

const GROUPS: { kind: CatalogEntry['kind']; title: string }[] = [
  { kind: 'exercise', title: 'Exercícios' },
  { kind: 'chords', title: 'Acordes' },
  { kind: 'song', title: 'Músicas' },
];

interface Item {
  id: string;
  title: string;
  meta: string;
  level: number;
}

const entryItem = (e: CatalogEntry): Item => ({ id: e.id, title: e.title, meta: `${e.tempo} bpm · ${e.bars} compassos · ${e.source}`, level: e.level });
const songItem = (s: Song): Item => ({ id: s.id, title: s.title, meta: `${s.tempo} bpm · ${s.bars.length} compassos · ${s.events.length} notas`, level: 0 });

/** Best stars of a song across both modes (null = never finished). */
function bestStars(p: SongProgress | undefined): number | null {
  const all = [p?.wait?.stars, p?.play?.stars].filter((x): x is number => x !== undefined);
  return all.length ? Math.max(...all) : null;
}

interface Props {
  onOpen: (id: string) => void;
  onBack: () => void;
  onImport: () => void;
}

/** Built-in songs by kind, plus the user's imported tabs; best stars per song. */
export function Library({ onOpen, onBack, onImport }: Props) {
  const [progress, setProgress] = useState<Record<string, SongProgress>>({});
  const [imported, setImported] = useState<Song[]>([]);
  useEffect(() => {
    void allProgress().then(setProgress);
    void listImported().then(setImported);
  }, []);

  const remove = async (s: Song) => {
    if (!confirm(`Apagar “${s.title}” deste aparelho?`)) return;
    await deleteImported(s.id);
    setImported(await listImported());
  };

  const row = (it: Item, extra?: preact.ComponentChildren) => {
    const stars = bestStars(progress[it.id]);
    return (
      <div key={it.id} class="lib-row">
        <button class="lib-item" onClick={() => onOpen(it.id)}>
          <span class="lib-main">
            <strong>{it.title}</strong>
            <span>{it.meta}</span>
          </span>
          {stars !== null && (
            <span class="lib-stars" aria-label={`melhor resultado: ${stars} de 3 estrelas`}>
              {[1, 2, 3].map((n) => <i key={n} class={n <= stars ? 'on' : ''}>★</i>)}
            </span>
          )}
          {it.level > 0 && (
            <span class="level" aria-label={`nível ${it.level}`}>
              {[1, 2, 3, 4, 5].map((n) => <i key={n} class={n <= it.level ? 'on' : ''} />)}
            </span>
          )}
        </button>
        {extra}
      </div>
    );
  };

  return (
    <main class="page">
      <header class="bar">
        <button class="icon-btn" onClick={onBack} aria-label="Voltar">‹</button>
        <h2>Músicas</h2>
        <button class="icon-btn" onClick={onImport} aria-label="Importar tab">＋</button>
      </header>
      {GROUPS.map((g) => {
        const items = catalog.filter((e) => e.kind === g.kind);
        if (!items.length) return null;
        return (
          <section key={g.kind} class="lib-group">
            <h3>{g.title}</h3>
            {items.map((e) => row(entryItem(e)))}
          </section>
        );
      })}
      <section class="lib-group">
        <h3>Importadas</h3>
        {imported.map((s) =>
          row(
            songItem(s),
            <button class="icon-btn lib-del" aria-label={`Apagar ${s.title}`} onClick={() => void remove(s)}>✕</button>,
          ),
        )}
        <button class="lib-item lib-add" onClick={onImport}>
          <span class="lib-main">
            <strong>Importar uma tab</strong>
            <span>Cole uma tab em texto ou abra um arquivo Guitar Pro / MusicXML</span>
          </span>
          <span class="chevron">›</span>
        </button>
      </section>
    </main>
  );
}
