// AudioWorklet: groups the 128-sample render quanta into fixed-size chunks and posts them
// to the main thread (transferring the buffer, no copy). Plain JS: loaded via addModule().
class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.size = (options.processorOptions && options.processorOptions.chunkSize) || 512;
    this.buf = new Float32Array(this.size);
    this.n = 0;
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      let i = 0;
      while (i < ch.length) {
        const take = Math.min(ch.length - i, this.size - this.n);
        this.buf.set(ch.subarray(i, i + take), this.n);
        this.n += take;
        i += take;
        if (this.n === this.size) {
          this.port.postMessage(this.buf, [this.buf.buffer]);
          this.buf = new Float32Array(this.size);
          this.n = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('capture', CaptureProcessor);
