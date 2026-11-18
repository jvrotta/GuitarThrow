import workletUrl from './capture.worklet.js?url';

/** What the browser actually applied — iOS may ignore some constraints. */
export interface MicInfo {
  sampleRate: number;
  baseLatency: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  deviceLabel: string;
}

export interface MicSession {
  readonly ctx: AudioContext;
  readonly info: MicInfo;
  stop(): Promise<void>;
}

export type MicErrorKind = 'insecure' | 'unsupported' | 'denied' | 'no-device' | 'unknown';

export class MicError extends Error {
  constructor(
    readonly kind: MicErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Opens the microphone with all voice processing disabled and streams raw chunks.
 * Must be called from a user gesture (iOS only starts audio after a tap).
 */
export async function openMic(onChunk: (chunk: Float32Array) => void, chunkSize = 512): Promise<MicSession> {
  if (!window.isSecureContext) throw new MicError('insecure', 'O microfone exige HTTPS.');
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
    throw new MicError('unsupported', 'Este navegador não permite capturar áudio.');
  }

  // Created synchronously inside the gesture, before any await.
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  void ctx.resume(); // also inside the gesture: iOS may create it suspended

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
  } catch (e) {
    await ctx.close();
    const name = (e as DOMException).name;
    if (name === 'NotAllowedError') throw new MicError('denied', 'Permissão do microfone negada.');
    if (name === 'NotFoundError') throw new MicError('no-device', 'Nenhum microfone encontrado.');
    throw new MicError('unknown', String(e));
  }

  await ctx.audioWorklet.addModule(workletUrl);
  await ctx.resume();

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'capture', { processorOptions: { chunkSize } });
  const mute = ctx.createGain();
  mute.gain.value = 0;
  node.port.onmessage = (ev: MessageEvent<Float32Array>) => onChunk(ev.data);
  // Keep the graph pulled: some browsers only run worklets connected to the destination.
  source.connect(node).connect(mute).connect(ctx.destination);

  const track = stream.getAudioTracks()[0];
  const s = track?.getSettings() ?? {};
  const info: MicInfo = {
    sampleRate: ctx.sampleRate,
    baseLatency: ctx.baseLatency ?? 0,
    echoCancellation: bool(s.echoCancellation),
    noiseSuppression: bool(s.noiseSuppression),
    autoGainControl: bool(s.autoGainControl),
    deviceLabel: track?.label ?? '',
  };

  return {
    ctx,
    info,
    async stop() {
      node.port.onmessage = null;
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close();
    },
  };
}

const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
