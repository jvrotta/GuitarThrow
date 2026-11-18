// Converts content/songs/*.tex (alphaTex) into content/build/<id>.json (Song) and content/catalog.json.
// Run: npm run content (also runs before build and test). Fails with file:line on any error.
// Header lines "// @kind exercise|chords|song", "// @level 1-5", "// @source <text>" are required; "// @genre <style>" is optional.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import * as alphaTab from '@coderline/alphatab';
import { scoreToSong } from '../src/music/alphatab.ts';

alphaTab.Logger.logLevel = alphaTab.LogLevel.None;
const SRC = 'content/songs';
const OUT = 'content/build';
const META = /^\s*\/\/\s*@(\w+)\s+(.+?)\s*$/;

function fail(file, msg) {
  console.error(`✗ ${file}: ${msg}`);
  process.exitCode = 1;
}

function parse(file) {
  const text = readFileSync(join(SRC, file), 'utf8');
  const meta = {};
  const body = text
    .split(/\r?\n/)
    .filter((line) => {
      const m = META.exec(line);
      if (m) meta[m[1]] = m[2];
      return !m && !/^\s*\/\//.test(line);
    })
    .join('\n');

  for (const k of ['kind', 'level', 'source']) if (!meta[k]) return fail(file, `falta o cabeçalho "// @${k}"`);
  if (!['exercise', 'chords', 'song'].includes(meta.kind)) return fail(file, '@kind deve ser exercise, chords ou song');

  let score;
  try {
    score = alphaTab.importer.ScoreLoader.loadAlphaTex(body);
  } catch (e) {
    const c = e.cause;
    const diags = [c?.lexerDiagnostics, c?.parserDiagnostics, c?.semanticDiagnostics].flatMap((b) => b?.items ?? []);
    // Line numbers refer to the body without comment lines.
    return fail(file, diags.map((d) => `linha ${d.start.line}:${d.start.col} ${d.message.slice(0, 160)}`).join('\n  ') || e.message);
  }

  const id = basename(file, '.tex');
  const song = scoreToSong(score, { id, kind: meta.kind, level: Number(meta.level), source: meta.source });
  if (meta.genre) song.genre = meta.genre;
  if (!song.title) return fail(file, 'falta \\title');
  if (song.events.length === 0) return fail(file, 'nenhuma nota');
  const bad = song.events.flatMap((e) => e.notes).find((n) => n.fret < 0 || n.fret > 20 || n.string < 1 || n.string > 6);
  if (bad) return fail(file, `nota inválida corda ${bad.string} traste ${bad.fret}`);
  return song;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const songs = readdirSync(SRC)
  .filter((f) => f.endsWith('.tex'))
  .sort()
  .map(parse)
  .filter(Boolean);

for (const s of songs) writeFileSync(join(OUT, `${s.id}.json`), JSON.stringify(s));
const catalog = songs
  .map(({ events, bars, timeSig, tuning, length, ...meta }) => ({ ...meta, notes: events.length, bars: bars.length }))
  .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title, 'pt'));
writeFileSync('content/catalog.json', JSON.stringify(catalog, null, 2) + '\n');
console.log(`${songs.length} músicas → ${OUT}/, content/catalog.json`);
