import { useState } from 'preact/hooks';
import { IMPORT_ACCEPT, importFile, importText, type Song } from '../music';
import { saveImported } from '../storage';

const EXAMPLE = `e|-------0-------|
B|-----1---1-----|
G|---2-------2---|
D|-2-------------|
A|---------------|
E|---------------|`;

/**
 * Import a tab: paste plain-text tab, or open a Guitar Pro / MusicXML / .txt file. Shows what was
 * read (title, tempo editable) before saving it on this device.
 */
export function Import({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [song, setSong] = useState<Song | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fromText = () => {
    setError('');
    try {
      setSong(importText(text, title));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const fromFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      setSong(await importFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async (open: boolean) => {
    if (!song) return;
    await saveImported(song);
    if (open) onOpen(song.id);
    else onBack();
  };

  return (
    <main class="page import">
      <header class="bar">
        <button class="icon-btn" onClick={song ? () => setSong(null) : onBack} aria-label="Voltar">‹</button>
        <h2>Importar tab</h2>
        <span class="icon-btn" />
      </header>

      {!song ? (
        <>
          <section class="set-group">
            <h3>Arquivo</h3>
            <label class="btn wide file-btn">
              {busy ? 'Lendo…' : 'Escolher arquivo'}
              <input type="file" accept={IMPORT_ACCEPT} disabled={busy} onChange={(e) => void fromFile(e.currentTarget.files?.[0])} />
            </label>
            <p class="muted small">Guitar Pro (.gp, .gp3, .gp4, .gp5, .gpx), MusicXML (.musicxml, .mxl, .xml) ou texto (.txt).</p>
          </section>

          <section class="set-group">
            <h3>Colar tab em texto</h3>
            <input class="field" placeholder="Nome da música" value={title} onInput={(e) => setTitle(e.currentTarget.value)} />
            <textarea
              class="field tab-text"
              placeholder={EXAMPLE}
              spellcheck={false}
              value={text}
              onInput={(e) => setText(e.currentTarget.value)}
            />
            <p class="muted small">
              Seis linhas por bloco, Mi agudo em cima. Tab em texto não tem ritmo: cada coluna vira uma colcheia
              (espaços maiores viram notas mais longas).
            </p>
            <button class="btn primary wide" disabled={!text.trim()} onClick={fromText}>Ler tab</button>
          </section>
        </>
      ) : (
        <section class="set-group">
          <h3>Confira</h3>
          <input class="field" aria-label="Nome" value={song.title} onInput={(e) => setSong({ ...song, title: e.currentTarget.value })} />
          <label class="set-row">
            <span class="set-text">
              <strong>Andamento</strong>
              <span>
                {song.events.length} notas · {song.bars.length} compassos
                {song.events.some((e) => e.notes.length > 1) ? ' · com acordes' : ''}
              </span>
            </span>
            <input
              class="field num"
              type="number"
              min={30}
              max={240}
              value={song.tempo}
              onInput={(e) => setSong({ ...song, tempo: Math.max(30, Math.min(240, Number(e.currentTarget.value) || song.tempo)) })}
            />
          </label>
          <div class="p-actions">
            <button class="btn primary" onClick={() => void save(true)}>Salvar e praticar</button>
            <button class="btn" onClick={() => void save(false)}>Salvar</button>
          </div>
        </section>
      )}
      {error && <p class="error">{error}</p>}
    </main>
  );
}
