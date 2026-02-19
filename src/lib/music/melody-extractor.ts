/**
 * Melody extraction: converts raw pitch frames into discrete melody notes.
 *
 * Approach:
 * 1. Filter out low-clarity frames (silence/noise)
 * 2. Group consecutive frames with the same note into segments
 * 3. Filter out very short segments (likely artifacts)
 * 4. Convert segments to Note objects with proper durations
 */

import type { PitchFrame, MelodyNote, NoteName } from "@/types/music";
import { noteToMidi, midiToFrequency } from "@/lib/utils/music-utils";

interface NoteSegment {
  note: NoteName;
  octave: number;
  startTime: number; // ms
  endTime: number;   // ms
  frames: PitchFrame[];
  avgFrequency: number;
  avgClarity: number;
}

/**
 * Group consecutive pitch frames with the same note into segments.
 */
function groupIntoSegments(frames: PitchFrame[]): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let current: NoteSegment | null = null;

  for (const frame of frames) {
    if (frame.note === null || frame.octave === null) {
      // Silence gap — close current segment
      if (current) {
        segments.push(current);
        current = null;
      }
      continue;
    }

    // Check if same note + octave as current segment
    if (
      current &&
      current.note === frame.note &&
      current.octave === frame.octave
    ) {
      current.endTime = frame.timestamp;
      current.frames.push(frame);
    } else {
      // Different note — close current and start new
      if (current) segments.push(current);
      current = {
        note: frame.note,
        octave: frame.octave,
        startTime: frame.timestamp,
        endTime: frame.timestamp,
        frames: [frame],
        avgFrequency: 0,
        avgClarity: 0,
      };
    }
  }
  if (current) segments.push(current);

  // Calculate averages
  for (const seg of segments) {
    const n = seg.frames.length;
    seg.avgFrequency = seg.frames.reduce((s, f) => s + f.frequency, 0) / n;
    seg.avgClarity = seg.frames.reduce((s, f) => s + f.clarity, 0) / n;
  }

  return segments;
}

/**
 * Extract a melody from pitch frames.
 *
 * @param frames - Array of pitch detection frames
 * @param tempo - BPM for converting timestamps to beats
 * @param minDurationMs - Minimum note duration in ms (filters artifacts)
 * @returns Array of MelodyNote objects
 */
export function extractMelody(
  frames: PitchFrame[],
  tempo: number = 120,
  minDurationMs: number = 80
): MelodyNote[] {
  const segments = groupIntoSegments(frames);

  // Filter out very short segments (noise/artifacts)
  const filtered = segments.filter(
    (seg) => seg.endTime - seg.startTime >= minDurationMs
  );

  // Convert to MelodyNotes
  const msPerBeat = 60000 / tempo;

  return filtered.map((seg) => {
    const durationMs = seg.endTime - seg.startTime;
    const midi = noteToMidi(seg.note, seg.octave);

    return {
      name: seg.note,
      octave: seg.octave,
      midiNumber: midi,
      frequency: seg.avgFrequency,
      duration: durationMs / msPerBeat,          // in beats
      startBeat: seg.startTime / msPerBeat,      // in beats
      confidence: seg.avgClarity,
    };
  });
}

/**
 * Quantize melody notes to the nearest beat subdivision.
 * Helps produce cleaner scores from imprecise audio timing.
 */
export function quantizeMelody(
  notes: MelodyNote[],
  subdivision: number = 4  // Quantize to 16th notes (4 per beat)
): MelodyNote[] {
  const grid = 1 / subdivision;

  return notes.map((note) => {
    const quantizedStart = Math.round(note.startBeat / grid) * grid;
    const quantizedDuration = Math.max(
      grid,
      Math.round(note.duration / grid) * grid
    );

    return {
      ...note,
      startBeat: quantizedStart,
      duration: quantizedDuration,
    };
  });
}

/**
 * Estimate tempo from note onset intervals (simple approach).
 * Looks at the most common inter-onset interval.
 */
export function estimateTempo(frames: PitchFrame[]): number {
  const segments = groupIntoSegments(frames);
  if (segments.length < 3) return 120; // Default

  // Collect inter-onset intervals (in ms)
  const iois: number[] = [];
  for (let i = 1; i < segments.length; i++) {
    const ioi = segments[i].startTime - segments[i - 1].startTime;
    if (ioi > 150 && ioi < 2000) {
      iois.push(ioi);
    }
  }

  if (iois.length === 0) return 120;

  // Find the median IOI
  iois.sort((a, b) => a - b);
  const medianIOI = iois[Math.floor(iois.length / 2)];

  // Convert to BPM (assume median IOI ~ one beat)
  let bpm = 60000 / medianIOI;

  // Normalize to common tempo range
  while (bpm < 60) bpm *= 2;
  while (bpm > 180) bpm /= 2;

  return Math.round(bpm);
}
