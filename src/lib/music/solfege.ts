/**
 * Solfege notation system.
 *
 * Supports both fixed-Do (Do = C always) and moveable-Do (Do = key tonic).
 * Default is moveable-Do since that's more common for choir/vocal training.
 *
 * Standard solfege: Do Re Mi Fa Sol La Ti (major scale)
 * With chromatic: Di Ri Fi Si Li (sharps) / Ra Me Se Le Te (flats)
 */

import type { NoteName, Key } from "@/types/music";
import { NOTE_NAMES, intervalInSemitones } from "@/lib/utils/music-utils";

// Solfege syllables for each semitone from Do (0) to Ti (11)
// Using moveable-Do: the tonic of the key = Do
const SOLFEGE_SHARP: Record<number, string> = {
  0: "Do",
  1: "Di",
  2: "Re",
  3: "Ri",
  4: "Mi",
  5: "Fa",
  6: "Fi",
  7: "Sol",
  8: "Si",
  9: "La",
  10: "Li",
  11: "Ti",
};

const SOLFEGE_FLAT: Record<number, string> = {
  0: "Do",
  1: "Ra",
  2: "Re",
  3: "Me",
  4: "Mi",
  5: "Fa",
  6: "Se",
  7: "Sol",
  8: "Le",
  9: "La",
  10: "Te",
  11: "Ti",
};

// For diatonic notes, use standard syllables (no accidentals)
const MAJOR_SCALE_SOLFEGE = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

const MINOR_SCALE_SOLFEGE = ["La", "Ti", "Do", "Re", "Mi", "Fa", "Sol"];
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

export type SolfegeMode = "fixed" | "moveable";

/**
 * Convert a note name to solfege syllable.
 *
 * @param noteName - The note name (C, D#, etc.)
 * @param key - The key context (for moveable-Do)
 * @param mode - "fixed" (Do = C always) or "moveable" (Do = key tonic)
 * @param preferFlat - Use flat names (Ra, Me, etc.) instead of sharp names (Di, Ri, etc.)
 */
export function noteToSolfege(
  noteName: NoteName,
  key: Key = { tonic: "C", mode: "major", label: "C major" },
  mode: SolfegeMode = "moveable",
  preferFlat: boolean = false
): string {
  let semitones: number;

  if (mode === "fixed") {
    // Fixed-Do: C = Do always
    semitones = NOTE_NAMES.indexOf(noteName);
  } else {
    // Moveable-Do: key tonic = Do (for major) or La (for minor)
    semitones = intervalInSemitones(key.tonic, noteName);

    // For minor keys, adjust so the tonic = La (not Do)
    if (key.mode === "minor") {
      // Minor tonic is La; shift by +3 to make tonic = La
      semitones = (semitones + 3) % 12;
    }
  }

  // Check if it's a diatonic scale degree first
  const scaleIntervals = key.mode === "minor" && mode === "moveable"
    ? [0, 2, 3, 5, 7, 8, 10].map(i => (i + 3) % 12) // shifted for La-based
    : MAJOR_SCALE_INTERVALS;

  const scaleIndex = scaleIntervals.indexOf(semitones);
  if (scaleIndex >= 0) {
    // Diatonic note — use clean syllable
    const syllables = key.mode === "minor" && mode === "moveable"
      ? ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"] // Still use Do-based after shift
      : MAJOR_SCALE_SOLFEGE;
    return syllables[scaleIndex];
  }

  // Chromatic note — use sharp or flat variant
  return preferFlat ? SOLFEGE_FLAT[semitones] : SOLFEGE_SHARP[semitones];
}

/**
 * Convert a note name + octave to solfege with octave indicator.
 * Uses prime marks: Do' (octave up), Do, (octave down)
 */
export function noteToSolfegeWithOctave(
  noteName: NoteName,
  octave: number,
  key: Key = { tonic: "C", mode: "major", label: "C major" },
  mode: SolfegeMode = "moveable",
  referenceOctave: number = 4 // The octave where Do lives (default C4)
): string {
  const syllable = noteToSolfege(noteName, key, mode);

  // Calculate octave relative to reference
  const diff = octave - referenceOctave;
  if (diff > 0) {
    return syllable + "'".repeat(diff);
  }
  if (diff < 0) {
    return syllable + ",".repeat(Math.abs(diff));
  }
  return syllable;
}

/**
 * Get the solfege scale for a key.
 */
export function getSolfegeScale(key: Key): string[] {
  if (key.mode === "minor") {
    return MINOR_SCALE_SOLFEGE;
  }
  return MAJOR_SCALE_SOLFEGE;
}

/**
 * Format a note for display based on the current notation mode.
 */
export function formatNoteDisplay(
  noteName: NoteName,
  octave: number,
  notationMode: "standard" | "solfege",
  key?: Key
): string {
  if (notationMode === "solfege" && key) {
    return noteToSolfegeWithOctave(noteName, octave, key);
  }
  return `${noteName}${octave}`;
}
