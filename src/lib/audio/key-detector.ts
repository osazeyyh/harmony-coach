/**
 * Key detection using the Krumhansl-Schmuckler algorithm.
 *
 * Approach:
 * 1. Accumulate pitch class energies across the audio (chroma profile)
 * 2. Correlate the profile against major and minor key templates
 * 3. The key with the highest correlation is the detected key
 */

import type { NoteName, Key } from "@/types/music";
import { NOTE_NAMES } from "@/lib/utils/music-utils";
import { MAJOR_KEY_PROFILE, MINOR_KEY_PROFILE, rotateArray } from "@/lib/music/theory";
import type { PitchFrame } from "@/types/music";

/**
 * Pearson correlation between two arrays.
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Build a pitch class histogram from an array of PitchFrames.
 * Returns a 12-element array representing energy for each pitch class.
 */
export function buildPitchClassHistogram(frames: PitchFrame[]): number[] {
  const histogram = new Array(12).fill(0);

  for (const frame of frames) {
    if (frame.note !== null) {
      const index = NOTE_NAMES.indexOf(frame.note);
      if (index >= 0) {
        histogram[index] += frame.clarity;
      }
    }
  }

  // Normalize
  const total = histogram.reduce((s, v) => s + v, 0);
  if (total > 0) {
    for (let i = 0; i < 12; i++) {
      histogram[i] /= total;
    }
  }

  return histogram;
}

/**
 * Detect the key from a pitch class histogram using the
 * Krumhansl-Schmuckler algorithm.
 *
 * Returns the best key, its confidence, and all correlations.
 */
export function detectKey(histogram: number[]): {
  key: Key;
  confidence: number;
  allCorrelations: Array<{ key: Key; correlation: number }>;
} {
  const correlations: Array<{ key: Key; correlation: number }> = [];

  for (let i = 0; i < 12; i++) {
    const tonic = NOTE_NAMES[i];

    // Major key profile rotated for this tonic
    const majorProfile = rotateArray(MAJOR_KEY_PROFILE, i);
    const majorCorr = pearsonCorrelation(histogram, majorProfile);
    correlations.push({
      key: { tonic, mode: "major", label: `${tonic} major` },
      correlation: majorCorr,
    });

    // Minor key profile rotated for this tonic
    const minorProfile = rotateArray(MINOR_KEY_PROFILE, i);
    const minorCorr = pearsonCorrelation(histogram, minorProfile);
    correlations.push({
      key: { tonic, mode: "minor", label: `${tonic} minor` },
      correlation: minorCorr,
    });
  }

  // Sort by correlation descending
  correlations.sort((a, b) => b.correlation - a.correlation);

  return {
    key: correlations[0].key,
    confidence: correlations[0].correlation,
    allCorrelations: correlations,
  };
}

/**
 * Detect key from PitchFrames (convenience function).
 */
export function detectKeyFromPitchFrames(frames: PitchFrame[]): {
  key: Key;
  confidence: number;
} {
  const histogram = buildPitchClassHistogram(frames);
  const result = detectKey(histogram);
  return { key: result.key, confidence: result.confidence };
}
