/**
 * Pitch detection using the Pitchy library.
 * Wraps Pitchy's autocorrelation-based pitch detection for use
 * with both real-time mic input and offline AudioBuffer analysis.
 */

import { PitchDetector as PitchyDetector } from "pitchy";
import { frequencyToNote, NOTE_NAMES } from "@/lib/utils/music-utils";
import type { NoteName, PitchFrame } from "@/types/music";

export interface PitchDetectionOptions {
  minFrequency?: number;    // Minimum detectable frequency (Hz), default 80
  maxFrequency?: number;    // Maximum detectable frequency (Hz), default 1200
  clarityThreshold?: number; // Minimum clarity to consider a valid pitch (0-1), default 0.8
}

const DEFAULT_OPTIONS: Required<PitchDetectionOptions> = {
  minFrequency: 80,
  maxFrequency: 1200,
  clarityThreshold: 0.8,
};

/**
 * Detect pitch from a single audio frame (Float32Array).
 * Returns frequency, clarity, and note info.
 */
export function detectPitchFromFrame(
  frame: Float32Array,
  sampleRate: number,
  options: PitchDetectionOptions = {}
): PitchFrame & { timestamp: number } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const detector = PitchyDetector.forFloat32Array(frame.length);
  const [frequency, clarity] = detector.findPitch(frame, sampleRate);

  // Check if the detection is valid
  if (
    clarity < opts.clarityThreshold ||
    frequency < opts.minFrequency ||
    frequency > opts.maxFrequency
  ) {
    return {
      frequency: 0,
      clarity,
      note: null,
      octave: null,
      centsOff: 0,
      timestamp: 0,
    };
  }

  const noteInfo = frequencyToNote(frequency);

  return {
    frequency,
    clarity,
    note: noteInfo.name,
    octave: noteInfo.octave,
    centsOff: noteInfo.centsOff,
    timestamp: 0,
  };
}

/**
 * Detect pitches across an entire AudioBuffer.
 * Splits audio into frames and detects pitch for each.
 * Returns an array of PitchFrames with timestamps.
 */
export function detectPitchesFromBuffer(
  audioBuffer: AudioBuffer,
  options: PitchDetectionOptions = {}
): PitchFrame[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // Use first channel

  // Frame parameters: ~30ms frames with ~10ms hop
  const frameSize = Math.pow(2, Math.ceil(Math.log2(sampleRate * 0.03)));
  const hopSize = Math.floor(sampleRate * 0.01);

  const frames: PitchFrame[] = [];
  const detector = PitchyDetector.forFloat32Array(frameSize);

  for (let i = 0; i + frameSize <= channelData.length; i += hopSize) {
    const frame = channelData.slice(i, i + frameSize);
    const [frequency, clarity] = detector.findPitch(frame, sampleRate);
    const timestamp = (i / sampleRate) * 1000; // ms

    if (
      clarity >= opts.clarityThreshold &&
      frequency >= opts.minFrequency &&
      frequency <= opts.maxFrequency
    ) {
      const noteInfo = frequencyToNote(frequency);
      frames.push({
        frequency,
        clarity,
        note: noteInfo.name,
        octave: noteInfo.octave,
        centsOff: noteInfo.centsOff,
        timestamp,
      });
    } else {
      frames.push({
        frequency: 0,
        clarity,
        note: null,
        octave: null,
        centsOff: 0,
        timestamp,
      });
    }
  }

  return frames;
}

/**
 * Create a real-time pitch detector that works with an AnalyserNode.
 * Returns a function that can be called repeatedly to get current pitch.
 */
export function createRealtimePitchDetector(
  analyserNode: AnalyserNode,
  sampleRate: number,
  options: PitchDetectionOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const bufferSize = analyserNode.fftSize;
  const buffer = new Float32Array(bufferSize);
  const detector = PitchyDetector.forFloat32Array(bufferSize);

  return function getCurrentPitch(): PitchFrame {
    analyserNode.getFloatTimeDomainData(buffer);
    const [frequency, clarity] = detector.findPitch(buffer, sampleRate);

    if (
      clarity < opts.clarityThreshold ||
      frequency < opts.minFrequency ||
      frequency > opts.maxFrequency
    ) {
      return {
        frequency: 0,
        clarity,
        note: null,
        octave: null,
        centsOff: 0,
        timestamp: performance.now(),
      };
    }

    const noteInfo = frequencyToNote(frequency);
    return {
      frequency,
      clarity,
      note: noteInfo.name,
      octave: noteInfo.octave,
      centsOff: noteInfo.centsOff,
      timestamp: performance.now(),
    };
  };
}
