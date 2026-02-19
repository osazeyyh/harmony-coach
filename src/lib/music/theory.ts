import type { NoteName, ChordQuality, Chord, Key } from "@/types/music";
import { NOTE_NAMES, transpose, intervalInSemitones } from "@/lib/utils/music-utils";

// ── Scale definitions (intervals in semitones from root) ──

export const SCALE_INTERVALS: Record<string, number[]> = {
  major:            [0, 2, 4, 5, 7, 9, 11],
  natural_minor:    [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor:   [0, 2, 3, 5, 7, 8, 11],
  melodic_minor:    [0, 2, 3, 5, 7, 9, 11],
  dorian:           [0, 2, 3, 5, 7, 9, 10],
  mixolydian:       [0, 2, 4, 5, 7, 9, 10],
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
};

/**
 * Get scale notes for a given root and scale type.
 */
export function getScaleNotes(root: NoteName, scaleType: string = "major"): NoteName[] {
  const intervals = SCALE_INTERVALS[scaleType] || SCALE_INTERVALS.major;
  return intervals.map((i) => transpose(root, i));
}

// ── Chord definitions (intervals in semitones from root) ──

export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major:              [0, 4, 7],
  minor:              [0, 3, 7],
  diminished:         [0, 3, 6],
  augmented:          [0, 4, 8],
  dominant7:          [0, 4, 7, 10],
  major7:             [0, 4, 7, 11],
  minor7:             [0, 3, 7, 10],
  diminished7:        [0, 3, 6, 9],
  "half-diminished7": [0, 3, 6, 10],
  sus2:               [0, 2, 7],
  sus4:               [0, 5, 7],
};

// Chord quality display symbols
export const CHORD_QUALITY_SYMBOLS: Record<ChordQuality, string> = {
  major: "",
  minor: "m",
  diminished: "dim",
  augmented: "aug",
  dominant7: "7",
  major7: "maj7",
  minor7: "m7",
  diminished7: "dim7",
  "half-diminished7": "m7b5",
  sus2: "sus2",
  sus4: "sus4",
};

/**
 * Get the pitch classes (note names) in a chord.
 */
export function getChordNotes(root: NoteName, quality: ChordQuality): NoteName[] {
  const intervals = CHORD_INTERVALS[quality];
  return intervals.map((i) => transpose(root, i));
}

/**
 * Build a chord symbol string, e.g., "Am7", "Cmaj7"
 */
export function chordSymbol(root: NoteName, quality: ChordQuality): string {
  return `${root}${CHORD_QUALITY_SYMBOLS[quality]}`;
}

/**
 * Create a Chord object.
 */
export function makeChord(
  root: NoteName,
  quality: ChordQuality,
  startBeat: number,
  duration: number
): Chord {
  return {
    root,
    quality,
    symbol: chordSymbol(root, quality),
    notes: getChordNotes(root, quality),
    startBeat,
    duration,
  };
}

// ── Diatonic chord qualities for major and minor scales ──

const MAJOR_CHORD_QUALITIES: ChordQuality[] = [
  "major", "minor", "minor", "major", "major", "minor", "diminished",
];

const MINOR_CHORD_QUALITIES: ChordQuality[] = [
  "minor", "diminished", "major", "minor", "minor", "major", "major",
];

/**
 * Get the diatonic chords of a key.
 * Returns an array of 7 chords (I through VII).
 */
export function getDiatonicChords(key: Key): Chord[] {
  const scaleType = key.mode === "major" ? "major" : "natural_minor";
  const scaleNotes = getScaleNotes(key.tonic, scaleType);
  const qualities =
    key.mode === "major" ? MAJOR_CHORD_QUALITIES : MINOR_CHORD_QUALITIES;

  return scaleNotes.map((root, i) =>
    makeChord(root, qualities[i], 0, 0)
  );
}

// ── Chord template matching (for chord recognition) ──

/**
 * Build a 12-element chroma template for a chord.
 * Each bin is 1 if the pitch class is in the chord, 0 otherwise.
 */
export function chordChromaTemplate(root: NoteName, quality: ChordQuality): number[] {
  const template = new Array(12).fill(0);
  const notes = getChordNotes(root, quality);
  for (const note of notes) {
    const idx = NOTE_NAMES.indexOf(note);
    template[idx] = 1;
  }
  return template;
}

/**
 * Generate all chord templates for common chord types.
 * Returns an array of { root, quality, symbol, template }.
 */
export function getAllChordTemplates(): Array<{
  root: NoteName;
  quality: ChordQuality;
  symbol: string;
  template: number[];
}> {
  const qualities: ChordQuality[] = [
    "major", "minor", "diminished", "augmented",
    "dominant7", "major7", "minor7",
  ];

  const templates: Array<{
    root: NoteName;
    quality: ChordQuality;
    symbol: string;
    template: number[];
  }> = [];

  for (const root of NOTE_NAMES) {
    for (const quality of qualities) {
      templates.push({
        root,
        quality,
        symbol: chordSymbol(root, quality),
        template: chordChromaTemplate(root, quality),
      });
    }
  }

  return templates;
}

/**
 * Determine which chord tone a note is relative to a chord.
 * Returns 'root', 'third', 'fifth', 'seventh', or 'non-chord'.
 */
export function identifyChordTone(
  note: NoteName,
  chordRoot: NoteName,
  quality: ChordQuality
): "root" | "third" | "fifth" | "seventh" | "non-chord" {
  const interval = intervalInSemitones(chordRoot, note);
  const intervals = CHORD_INTERVALS[quality];

  if (interval === intervals[0]) return "root";
  if (interval === intervals[1]) return "third";
  if (interval === intervals[2]) return "fifth";
  if (intervals.length > 3 && interval === intervals[3]) return "seventh";
  return "non-chord";
}

// ── Key profiles for key detection (Krumhansl-Schmuckler) ──

export const MAJOR_KEY_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
  2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];

export const MINOR_KEY_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
  2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

/**
 * Rotate an array by n positions to the right.
 */
export function rotateArray<T>(arr: T[], n: number): T[] {
  const len = arr.length;
  const shift = ((n % len) + len) % len;
  return [...arr.slice(len - shift), ...arr.slice(0, len - shift)];
}
