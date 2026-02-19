import type { NoteName } from "@/types/music";

// All 12 note names in chromatic order
export const NOTE_NAMES: NoteName[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

// Enharmonic mappings for display
export const ENHARMONIC_MAP: Record<string, NoteName> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
};

// Flat display names (for keys that use flats)
export const FLAT_NAMES: Record<NoteName, string> = {
  C: "C", "C#": "Db", D: "D", "D#": "Eb", E: "E", F: "F",
  "F#": "Gb", G: "G", "G#": "Ab", A: "A", "A#": "Bb", B: "B",
};

// Keys that use flats for display
export const FLAT_KEYS = new Set([
  "F", "Bb", "Eb", "Ab", "Db", "Gb",
  "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm",
]);

/**
 * Convert a MIDI note number to frequency (Hz).
 * MIDI 69 = A4 = 440Hz
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert a frequency (Hz) to the nearest MIDI note number.
 */
export function frequencyToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

/**
 * Convert a frequency to the nearest note name and octave.
 */
export function frequencyToNote(freq: number): { name: NoteName; octave: number; centsOff: number } {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const roundedMidi = Math.round(midi);
  const centsOff = Math.round((midi - roundedMidi) * 100);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;

  return {
    name: NOTE_NAMES[noteIndex],
    octave,
    centsOff,
  };
}

/**
 * Convert note name + octave to MIDI number.
 * C4 = 60, A4 = 69
 */
export function noteToMidi(name: NoteName, octave: number): number {
  const index = NOTE_NAMES.indexOf(name);
  return (octave + 1) * 12 + index;
}

/**
 * Convert MIDI number to note name + octave.
 */
export function midiToNote(midi: number): { name: NoteName; octave: number } {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { name: NOTE_NAMES[noteIndex], octave };
}

/**
 * Get the pitch class index (0-11) for a note name.
 * C=0, C#=1, ..., B=11
 */
export function noteToPitchClass(name: string): number {
  const normalized = ENHARMONIC_MAP[name] || name;
  return NOTE_NAMES.indexOf(normalized as NoteName);
}

/**
 * Get the interval in semitones between two notes.
 */
export function intervalInSemitones(from: NoteName, to: NoteName): number {
  const fromIndex = NOTE_NAMES.indexOf(from);
  const toIndex = NOTE_NAMES.indexOf(to);
  return ((toIndex - fromIndex) + 12) % 12;
}

/**
 * Transpose a note by a given number of semitones.
 */
export function transpose(name: NoteName, semitones: number): NoteName {
  const index = NOTE_NAMES.indexOf(name);
  const newIndex = ((index + semitones) % 12 + 12) % 12;
  return NOTE_NAMES[newIndex];
}

/**
 * Format a note for display, using flats if appropriate for the key context.
 */
export function formatNote(name: NoteName, useFlats: boolean = false): string {
  if (useFlats) {
    return FLAT_NAMES[name];
  }
  return name;
}

/**
 * Format a note with octave, e.g., "C4", "F#5"
 */
export function formatNoteWithOctave(name: NoteName, octave: number, useFlats: boolean = false): string {
  return `${formatNote(name, useFlats)}${octave}`;
}
