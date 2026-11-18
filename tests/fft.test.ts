import { describe, expect, it } from 'vitest';
import { PowerSpectrum } from '../src/audio/fft';

describe('PowerSpectrum', () => {
  it('matches a direct DFT', () => {
    const n = 64;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1) + (i % 5) * 0.05;
    const out = new Float32Array(n / 2 + 1);
    new PowerSpectrum(n).compute(x, out);
    for (let k = 0; k <= n / 2; k++) {
      let r = 0, im = 0;
      for (let i = 0; i < n; i++) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
        r += x[i]! * w * Math.cos((2 * Math.PI * k * i) / n);
        im -= x[i]! * w * Math.sin((2 * Math.PI * k * i) / n);
      }
      expect(out[k]).toBeCloseTo(r * r + im * im, 3);
    }
  });
});
