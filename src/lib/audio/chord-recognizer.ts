/**
 * Chord recognition using chroma feature extraction and template matching.
 *
 * Approach:
 * 1. Extract chroma vectors from audio frames using Meyda
 * 2. Compare each chroma vector against chord templates via cosine similarity
 * 3. The best matching template = the detected chord
 * 4. Apply temporal smoothing to reduce flickering
 */

import type { NoteName, ChordQuality, Chord } from "@/types/music";
import { getAllChordTemplates } from "@/lib/music/theory";
import { createFrames, applyHanningWindow } from "@/lib/utils/audio-utils";

export interface ChordDetectionResult {
  chord: { root: NoteName; quality: ChordQuality; symbol: string };
  confidence: number;
  startTime: number;
  endTime: number;
}

/**
 * Compute a 12-bin chroma vector from a windowed audio frame using DFT.
 * Each bin represents the energy of one pitch class (C through B).
 */
function computeChroma(frame: Float32Array, sampleRate: number): number[] {
  const chroma = new Array(12).fill(0);
  const N = frame.length;

  // Simple DFT-based approach: compute magnitude at frequencies
  // corresponding to each note across several octaves
  for (let octave = 2; octave <= 7; octave++) {
    for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
      // MIDI number for this pitch class at this octave
      const midi = (octave + 1) * 12 + pitchClass;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);

      // Compute Goertzel-like magnitude at this frequency
      const k = Math.round(freq * N / sampleRate);
      if (k <= 0 || k >= N / 2) continue;

      let realPart = 0;
      let imagPart = 0;
      const omega = (2 * Math.PI * k) / N;

      for (let n = 0; n < N; n++) {
        realPart += frame[n] * Math.cos(omega * n);
        imagPart += frame[n] * Math.sin(omega * n);
      }

      const magnitude = Math.sqrt(realPart * realPart + imagPart * imagPart);
      chroma[pitchClass] += magnitude;
    }
  }

  // Normalize
  const max = Math.max(...chroma);
  if (max > 0) {
    for (let i = 0; i < 12; i++) {
      chroma[i] /= max;
    }
  }

  return chroma;
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Match a chroma vector against all chord templates.
 * Returns the best matching chord and its confidence.
 */
function matchChroma(chroma: number[]): {
  root: NoteName;
  quality: ChordQuality;
  symbol: string;
  confidence: number;
} {
  const templates = getAllChordTemplates();
  let bestMatch = templates[0];
  let bestScore = -1;

  for (const template of templates) {
    const score = cosineSimilarity(chroma, template.template);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return {
    root: bestMatch.root,
    quality: bestMatch.quality,
    symbol: bestMatch.symbol,
    confidence: bestScore,
  };
}

/**
 * Detect chords across an entire AudioBuffer.
 * Returns a time-aligned array of detected chords.
 */
export function detectChords(
  audioBuffer: AudioBuffer,
  options: {
    frameSize?: number;
    hopSize?: number;
    minConfidence?: number;
    smoothingWindow?: number;
  } = {}
): ChordDetectionResult[] {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const frameSize = options.frameSize || 8192;
  const hopSize = options.hopSize || 4096;
  const minConfidence = options.minConfidence || 0.5;
  const smoothingWindow = options.smoothingWindow || 3;

  // Create and window frames
  const frames = createFrames(channelData, frameSize, hopSize);
  const windowedFrames = frames.map((f) => applyHanningWindow(f));

  // Compute chroma and match chords for each frame
  const rawResults = windowedFrames.map((frame, i) => {
    const chroma = computeChroma(frame, sampleRate);
    const match = matchChroma(chroma);
    const startTime = (i * hopSize) / sampleRate;
    const endTime = startTime + frameSize / sampleRate;
    return { ...match, startTime, endTime };
  });

  // Temporal smoothing: merge consecutive identical chords
  const smoothed: ChordDetectionResult[] = [];
  let current: ChordDetectionResult | null = null;

  for (const result of rawResults) {
    if (result.confidence < minConfidence) continue;

    if (
      current &&
      current.chord.symbol === result.symbol
    ) {
      // Extend the current chord
      current.endTime = result.endTime;
      current.confidence = Math.max(current.confidence, result.confidence);
    } else {
      // Start a new chord
      if (current) smoothed.push(current);
      current = {
        chord: { root: result.root, quality: result.quality, symbol: result.symbol },
        confidence: result.confidence,
        startTime: result.startTime,
        endTime: result.endTime,
      };
    }
  }
  if (current) smoothed.push(current);

  return smoothed;
}

/**
 * Convert ChordDetectionResults to Chord objects with beat positions.
 * Requires a tempo (BPM) to calculate beat positions.
 */
export function chordResultsToChords(
  results: ChordDetectionResult[],
  tempo: number
): Chord[] {
  const secondsPerBeat = 60 / tempo;

  return results.map((result) => ({
    root: result.chord.root,
    quality: result.chord.quality,
    symbol: result.chord.symbol,
    notes: [], // Will be filled by theory functions if needed
    startBeat: result.startTime / secondsPerBeat,
    duration: (result.endTime - result.startTime) / secondsPerBeat,
  }));
}
