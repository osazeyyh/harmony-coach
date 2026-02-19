/**
 * Audio Analysis Orchestrator.
 * Coordinates pitch detection, chord recognition, key detection,
 * and melody extraction into a complete analysis pipeline.
 */

import type { AnalysisResult, Key, MelodyNote, ChordWithFunction } from "@/types/music";
import { detectPitchesFromBuffer } from "./pitch-detector";
import { detectChords, chordResultsToChords } from "./chord-recognizer";
import { detectKeyFromPitchFrames } from "./key-detector";
import { extractMelody, quantizeMelody, estimateTempo } from "@/lib/music/melody-extractor";
import { labelChords } from "@/lib/music/chord-labeler";
import { getChordNotes } from "@/lib/music/theory";

export interface AnalysisOptions {
  title?: string;
  pitchClarityThreshold?: number;
  minChordConfidence?: number;
}

/**
 * Run the full audio analysis pipeline on an AudioBuffer.
 * Returns a complete AnalysisResult.
 */
export async function analyzeAudio(
  audioBuffer: AudioBuffer,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  const title = options.title || "Untitled";

  // Step 1: Detect pitches across the audio
  const pitchFrames = detectPitchesFromBuffer(audioBuffer, {
    clarityThreshold: options.pitchClarityThreshold || 0.8,
  });

  // Step 2: Estimate tempo from pitch onsets
  const tempo = estimateTempo(pitchFrames);

  // Step 3: Detect key from pitch class distribution
  const { key, confidence: keyConfidence } = detectKeyFromPitchFrames(pitchFrames);

  // Step 4: Extract and quantize melody
  const rawMelody = extractMelody(pitchFrames, tempo);
  const melody = quantizeMelody(rawMelody);

  // Step 5: Detect chords from audio
  const chordResults = detectChords(audioBuffer, {
    minConfidence: options.minChordConfidence || 0.5,
  });

  // Convert chord results to Chord objects
  const chords = chordResultsToChords(chordResults, tempo).map((chord) => ({
    ...chord,
    notes: getChordNotes(chord.root, chord.quality),
  }));

  // Step 6: Label chords with Roman numerals
  const labeledChords = labelChords(chords, key);

  // Step 7: Assign chord tones to melody notes
  const melodyWithChordTones = assignChordTones(melody, labeledChords);

  return {
    id: crypto.randomUUID(),
    songTitle: title,
    sourceType: "audio",
    key,
    tempo,
    timeSignature: [4, 4], // Default; could be improved with beat detection
    melody: melodyWithChordTones,
    chords: labeledChords,
    harmonyLines: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * For each melody note, determine which chord tone it represents
 * relative to the active chord at that beat position.
 */
function assignChordTones(
  melody: MelodyNote[],
  chords: ChordWithFunction[]
): MelodyNote[] {
  return melody.map((note) => {
    // Find the active chord at this beat
    const activeChord = chords.find(
      (c) => note.startBeat >= c.startBeat &&
        note.startBeat < c.startBeat + c.duration
    );

    if (!activeChord) return note;

    // Determine chord tone
    const chordNotes = activeChord.notes;
    const noteIndex = chordNotes.indexOf(note.name);

    let chordTone: MelodyNote["chordTone"] = "non-chord";
    if (noteIndex === 0) chordTone = "root";
    else if (noteIndex === 1) chordTone = "third";
    else if (noteIndex === 2) chordTone = "fifth";
    else if (noteIndex === 3) chordTone = "seventh";

    return { ...note, chordTone };
  });
}
