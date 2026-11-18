/**
 * Hann-windowed power spectrum of the newest `n` samples (n a power of two), via a half-size
 * complex FFT (real-input trick). Returns n/2+1 bins; bin k is k·sampleRate/n Hz.
 */
export class PowerSpectrum {
  readonly bins: number;
  private readonly half: number;
  private readonly win: Float32Array;
  private readonly rev: Uint32Array;
  private readonly cos: Float64Array;
  private readonly sin: Float64Array;
  private readonly re: Float64Array;
  private readonly im: Float64Array;

  constructor(readonly n: number) {
    if (n & (n - 1)) throw new Error('n must be a power of two');
    const h = (this.half = n / 2);
    this.bins = h + 1;
    this.win = new Float32Array(n);
    for (let i = 0; i < n; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
    const bits = Math.log2(h);
    this.rev = new Uint32Array(h);
    for (let i = 0; i < h; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }
    // Twiddles e^{-2πik/n}: the FFT (size h) uses every other one, the real split uses all.
    this.cos = new Float64Array(h);
    this.sin = new Float64Array(h);
    for (let k = 0; k < h; k++) {
      this.cos[k] = Math.cos((2 * Math.PI * k) / n);
      this.sin[k] = Math.sin((2 * Math.PI * k) / n);
    }
    this.re = new Float64Array(h);
    this.im = new Float64Array(h);
  }

  /** Writes |X[k]|² of the last n samples of `buf` into `out` (length ≥ bins). */
  compute(buf: Float32Array, out: Float32Array): void {
    const { n, half: h, win, rev, re, im, cos, sin } = this;
    const off = buf.length - n;
    for (let m = 0; m < h; m++) {
      const j = rev[m]!;
      re[j] = buf[off + 2 * m]! * win[2 * m]!;
      im[j] = buf[off + 2 * m + 1]! * win[2 * m + 1]!;
    }
    for (let size = 2; size <= h; size *= 2) {
      const hs = size / 2;
      const step = (n / size) | 0; // twiddle index stride for e^{-2πik/size}
      for (let i = 0; i < h; i += size) {
        for (let k = 0; k < hs; k++) {
          const a = i + k;
          const b = a + hs;
          const c = cos[k * step]!;
          const s = sin[k * step]!;
          const tr = re[b]! * c + im[b]! * s;
          const ti = im[b]! * c - re[b]! * s;
          re[b] = re[a]! - tr;
          im[b] = im[a]! - ti;
          re[a]! += tr;
          im[a]! += ti;
        }
      }
    }
    // Split the packed spectrum: X[k] = Ze + e^{-2πik/n}·Zo.
    for (let k = 0; k <= h; k++) {
      const ka = k % h;
      const kb = (h - k) % h;
      const ar = re[ka]!, ai = im[ka]!, br = re[kb]!, bi = -im[kb]!;
      const er = (ar + br) / 2, ei = (ai + bi) / 2;
      const or = (ai - bi) / 2, oi = -(ar - br) / 2;
      const c = k < h ? cos[k]! : -1;
      const s = k < h ? sin[k]! : 0;
      const xr = er + c * or + s * oi;
      const xi = ei + c * oi - s * or;
      out[k] = xr * xr + xi * xi;
    }
  }
}
