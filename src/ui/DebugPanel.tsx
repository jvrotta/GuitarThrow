import { useState } from 'preact/hooks';
import { freqToMidi, midiToName } from '../music';
import type { PitchState } from './usePitch';

const RECORD_SECONDS = 5;

/** Live analysis values + sample recording, so field problems can be described with numbers. */
export function DebugPanel({ p }: { p: PitchState }) {
  const [rec, setRec] = useState<'idle' | 'recording' | 'ready'>('idle');
  const [file, setFile] = useState<File | null>(null);
  const f = p.frame;
  const i = p.info;
  const flag = (v?: boolean) => (v === undefined ? '?' : v ? 'LIGADO' : 'desligado');

  const record = async () => {
    setRec('recording');
    try {
      const wav = await p.record(RECORD_SECONDS);
      const tag = f && f.rawFreq > 0 ? midiToName(freqToMidi(f.rawFreq)) : 'amostra';
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      setFile(new File([wav], `${tag}-${stamp}.wav`, { type: 'audio/wav' }));
      setRec('ready');
    } catch {
      setRec('idle');
    }
  };

  const save = async () => {
    if (!file) return;
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }).catch(() => {});
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  };

  return (
    <aside class="debug">
      <dl>
        <dt>Hz bruto</dt>
        <dd>{f ? f.rawFreq.toFixed(1) : '–'}</dd>
        <dt>Clareza</dt>
        <dd>{f ? f.clarity.toFixed(2) : '–'}</dd>
        <dt>Volume</dt>
        <dd>{f ? `${f.db.toFixed(0)} dB` : '–'}</dd>
        <dt>Aceito</dt>
        <dd>{f ? (f.freq !== null ? 'sim' : 'não') : '–'}</dd>
        <dt>Frames/s</dt>
        <dd>{p.fps}</dd>
        <dt>Taxa</dt>
        <dd>{i ? `${i.sampleRate} Hz` : '–'}</dd>
        <dt>Latência base</dt>
        <dd>{i ? `${(i.baseLatency * 1000).toFixed(0)} ms` : '–'}</dd>
        <dt>Eco / ruído / ganho</dt>
        <dd>{i ? `${flag(i.echoCancellation)} / ${flag(i.noiseSuppression)} / ${flag(i.autoGainControl)}` : '–'}</dd>
      </dl>
      <div class="debug-actions">
        <button onClick={record} disabled={p.status !== 'running' || rec === 'recording'}>
          {rec === 'recording' ? 'Gravando…' : `Gravar ${RECORD_SECONDS} s`}
        </button>
        {rec === 'ready' && file && <button onClick={save}>Salvar {file.name}</button>}
      </div>
    </aside>
  );
}
