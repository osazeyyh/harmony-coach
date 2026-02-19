import type { NoteName, ChordQuality, Key, ChordWithFunction, Chord } from "@/types/music";
import { NOTE_NAMES, intervalInSemitones } from "@/lib/utils/music-utils";
import { getScaleNotes } from "./theory";

// Roman numeral labels
const ROMAN_NUMERALS_UPPER = ["I", "II", "III", "IV", "V", "VI", "VII"];
const ROMAN_NUMERALS_LOWER = ["i", "ii", "iii", "iv", "v", "vi", "vii"];

// Quality suffixes for Roman numeral notation
const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  major: "",
  minor: "",
  diminished: "\u00B0",     // ° symbol
  augmented: "+",
  dominant7: "7",
  major7: "maj7",
  minor7: "7",
  diminished7: "\u00B07",
  "half-diminished7": "\u00F87",  // ø7
  sus2: "sus2",
  sus4: "sus4",
};

/**
 * Determine the scale degree (0-6) of a chord root within a key.
 * Returns -1 if the root is not diatonic to the key.
 */
function getScaleDegree(root: NoteName, key: Key): number {
  const scaleType = key.mode === "major" ? "major" : "natural_minor";
  const scaleNotes = getScaleNotes(key.tonic, scaleType);
  return scaleNotes.indexOf(root);
}

/**
 * Determine whether to use upper or lower case Roman numeral
 * based on chord quality.
 */
function isUpperCase(quality: ChordQuality): boolean {
  return quality === "major" || quality === "augmented" ||
    quality === "dominant7" || quality === "major7";
}

/**
 * Generate a Roman numeral label for a chord in a given key.
 * e.g., "I", "iv", "V7", "ii°"
 */
export function getRomanNumeral(chord: Chord, key: Key): string {
  const degree = getScaleDegree(chord.root, key);

  if (degree === -1) {
    // Non-diatonic chord — use chromatic interval from tonic
    const semitones = intervalInSemitones(key.tonic, chord.root);
    const upper = isUpperCase(chord.quality);
    // Use flat notation for non-diatonic degrees
    const labels = ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"];
    const label = labels[semitones];
    const base = upper ? label : label.toLowerCase();
    return base + QUALITY_SUFFIX[chord.quality];
  }

  const upper = isUpperCase(chord.quality);
  const numerals = upper ? ROMAN_NUMERALS_UPPER : ROMAN_NUMERALS_LOWER;
  return numerals[degree] + QUALITY_SUFFIX[chord.quality];
}

/**
 * Add functional labels to an array of chords given a key.
 */
export function labelChords(chords: Chord[], key: Key): ChordWithFunction[] {
  return chords.map((chord) => ({
    ...chord,
    romanNumeral: getRomanNumeral(chord, key),
  }));
}
