/**
 * music — song model and note math.
 * Note <-> MIDI <-> frequency <-> string/fret utilities, the internal Song/Event model,
 * and importers (alphaTex, Guitar Pro / MusicXML via alphaTab, text tab).
 * Done: note utilities (M0). Planned: model (M2), importers (M6).
 */
export { STANDARD_TUNING, midiToFreq, freqToMidi, midiToName, centsOff, stringFretToMidi } from './notes';
