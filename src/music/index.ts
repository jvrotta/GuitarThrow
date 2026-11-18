/**
 * music — song model and note math.
 * Note <-> MIDI <-> frequency <-> string/fret utilities, the internal Song/Event model,
 * and importers (alphaTex, Guitar Pro / MusicXML via alphaTab, text tab).
 * Done: note utilities (M0), tuner reading against a string (readTuning). Planned: model (M2), importers (M6).
 */
export { IN_TUNE_CENTS, readTuning, stringLabels, type TuningReading } from './tuning';
export {
  STANDARD_TUNING,
  midiToFreq,
  freqToMidi,
  midiToName,
  midiToSolfege,
  nearestString,
  centsOff,
  stringFretToMidi,
} from './notes';
