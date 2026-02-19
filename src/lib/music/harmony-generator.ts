/**
 * Harmony Generator: creates harmony lines from a melody + chord progression.
 *
 * Algorithm:
 * 1. For each melody note, find the active chord
 * 2. Pick a chord tone at a target interval (3rd/6th above or below)
 * 3. Apply voice-leading smoothing (minimize jumps)
 * 4. Clamp to singable range for the target voice type
 */

import type { Note, MelodyNote, HarmonyLine, ChordWithFunction, NoteName } from "@/types/music";
import { NOTE_NAMES, noteToMidi, midiToNote, midiToFrequency, intervalInSemitones } from "@/lib/utils/music-utils";
import { getChordNotes, CHORD_INTERVALS } from "./theory";

// Voice ranges (MIDI numbers)
const VOICE_RANGES: Record<string, [number, number]> = {
  soprano: [60, 81],  // C4 to A5
  alto:    [55, 76],  // G3 to E5
  tenor:   [48, 69],  // C3 to A4
  bass:    [40, 62],  // E2 to D4
};

export interface HarmonyOptions {
  mode?: "choir" | "classical";  // choir = prioritize singable 3rds/6ths; classical = avoid parallel 5ths/8ves
  voiceType?: "soprano" | "alto" | "tenor" | "bass";
  preferAbove?: boolean;         // prefer harmony above melody (true) or below (false)
}

/**
 * Generate a harmony line for a melody given a chord progression.
 */
export function generateHarmonyLine(
  melody: MelodyNote[],
  chords: ChordWithFunction[],
  options: HarmonyOptions = {}
): Note[] {
  const {
    mode = "choir",
    voiceType = "alto",
    preferAbove = false,
  } = options;

  const [rangeMin, rangeMax] = VOICE_RANGES[voiceType];
  const harmonyNotes: Note[] = [];
  let prevHarmonyMidi: number | null = null;

  for (const melodyNote of melody) {
    // Find active chord at this beat
    const activeChord = findActiveChord(chords, melodyNote.startBeat);
    if (!activeChord) {
      // No chord — harmonize with a 3rd
      const interval = preferAbove ? 4 : -3; // major 3rd up or minor 3rd down
      const harmonyMidi = melodyNote.midiNumber + interval;
      harmonyNotes.push(midiToNoteObj(harmonyMidi, melodyNote.startBeat, melodyNote.duration));
      prevHarmonyMidi = harmonyMidi;
      continue;
    }

    // Get chord tones
    const chordNotes = getChordNotes(activeChord.root, activeChord.quality);
    const melodyMidi = melodyNote.midiNumber;

    // Find candidate harmony pitches: chord tones in the voice range
    const candidates = getCandidatePitches(chordNotes, rangeMin, rangeMax);

    // Filter out unison with melody
    const filtered = candidates.filter((midi) => midi !== melodyMidi);

    if (filtered.length === 0) {
      // Fallback: use a 3rd away
      const fallback = melodyMidi + (preferAbove ? 4 : -3);
      harmonyNotes.push(midiToNoteObj(fallback, melodyNote.startBeat, melodyNote.duration));
      prevHarmonyMidi = fallback;
      continue;
    }

    // Score each candidate
    let bestCandidate = filtered[0];
    let bestScore = -Infinity;

    for (const candidate of filtered) {
      let score = 0;

      // Prefer intervals of 3rd or 6th from melody (most consonant for singing)
      const intervalFromMelody = Math.abs(candidate - melodyMidi) % 12;
      if (intervalFromMelody === 3 || intervalFromMelody === 4) score += 10; // 3rd
      if (intervalFromMelody === 8 || intervalFromMelody === 9) score += 8;  // 6th

      // Prefer above/below based on option
      if (preferAbove && candidate > melodyMidi) score += 3;
      if (!preferAbove && candidate < melodyMidi) score += 3;

      // Voice leading: prefer small motion from previous harmony note
      if (prevHarmonyMidi !== null) {
        const motion = Math.abs(candidate - prevHarmonyMidi);
        if (motion <= 2) score += 6;      // Stepwise (best)
        else if (motion <= 4) score += 3;  // Small leap (ok)
        else score -= motion;              // Penalize large leaps
      }

      // Classical mode: penalize parallel 5ths and octaves
      if (mode === "classical" && prevHarmonyMidi !== null) {
        const prevInterval = Math.abs(prevHarmonyMidi - (melody[Math.max(0, melody.indexOf(melodyNote) - 1)]?.midiNumber || 0)) % 12;
        const currInterval = Math.abs(candidate - melodyMidi) % 12;
        if (prevInterval === 7 && currInterval === 7) score -= 20; // parallel 5th
        if (prevInterval === 0 && currInterval === 0) score -= 20; // parallel octave
      }

      // Prefer middle of range
      const rangeMid = (rangeMin + rangeMax) / 2;
      score -= Math.abs(candidate - rangeMid) * 0.2;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    harmonyNotes.push(midiToNoteObj(bestCandidate, melodyNote.startBeat, melodyNote.duration));
    prevHarmonyMidi = bestCandidate;
  }

  return harmonyNotes;
}

/**
 * Generate multiple harmony lines (above, below, bass).
 */
export function generateHarmonyLines(
  melody: MelodyNote[],
  chords: ChordWithFunction[]
): HarmonyLine[] {
  const lines: HarmonyLine[] = [];

  // Harmony above (soprano-ish / high harmony)
  const above = generateHarmonyLine(melody, chords, {
    mode: "choir",
    voiceType: "soprano",
    preferAbove: true,
  });
  lines.push({
    id: crypto.randomUUID(),
    partName: "Harmony Above",
    voiceType: "soprano",
    notes: above,
  });

  // Harmony below (alto)
  const below = generateHarmonyLine(melody, chords, {
    mode: "choir",
    voiceType: "alto",
    preferAbove: false,
  });
  lines.push({
    id: crypto.randomUUID(),
    partName: "Harmony Below",
    voiceType: "alto",
    notes: below,
  });

  // Bass line
  const bass = generateHarmonyLine(melody, chords, {
    mode: "choir",
    voiceType: "bass",
    preferAbove: false,
  });
  lines.push({
    id: crypto.randomUUID(),
    partName: "Bass Line",
    voiceType: "bass",
    notes: bass,
  });

  return lines;
}

// ── Helper functions ──

function findActiveChord(chords: ChordWithFunction[], beat: number): ChordWithFunction | null {
  for (const chord of chords) {
    if (beat >= chord.startBeat && beat < chord.startBeat + chord.duration) {
      return chord;
    }
  }
  // Fallback: return last chord before this beat
  const before = chords.filter((c) => c.startBeat <= beat);
  return before.length > 0 ? before[before.length - 1] : null;
}

function getCandidatePitches(
  chordNoteNames: NoteName[],
  rangeMin: number,
  rangeMax: number
): number[] {
  const pitches: number[] = [];
  for (const name of chordNoteNames) {
    const pitchClass = NOTE_NAMES.indexOf(name);
    // Get all octaves of this pitch class in range
    for (let octave = 1; octave <= 8; octave++) {
      const midi = (octave + 1) * 12 + pitchClass;
      if (midi >= rangeMin && midi <= rangeMax) {
        pitches.push(midi);
      }
    }
  }
  return pitches;
}

function midiToNoteObj(midi: number, startBeat: number, duration: number): Note {
  const { name, octave } = midiToNote(midi);
  return {
    name,
    octave,
    midiNumber: midi,
    frequency: midiToFrequency(midi),
    duration,
    startBeat,
  };
}
