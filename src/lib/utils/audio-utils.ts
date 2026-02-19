/**
 * Audio utility functions for buffer manipulation and processing.
 */

/**
 * Decode an audio file (mp3, wav, m4a, etc.) into an AudioBuffer.
 */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  audioContext.close();
  return audioBuffer;
}

/**
 * Extract a mono Float32Array from an AudioBuffer (averages channels).
 */
export function getMonoData(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }
  const length = buffer.length;
  const mono = new Float32Array(length);
  const channels = buffer.numberOfChannels;
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i];
    }
  }
  for (let i = 0; i < length; i++) {
    mono[i] /= channels;
  }
  return mono;
}

/**
 * Split audio data into overlapping frames.
 */
export function createFrames(
  data: Float32Array,
  frameSize: number,
  hopSize: number
): Float32Array[] {
  const frames: Float32Array[] = [];
  for (let i = 0; i + frameSize <= data.length; i += hopSize) {
    frames.push(data.slice(i, i + frameSize));
  }
  return frames;
}

/**
 * Apply a Hanning window to a frame.
 */
export function applyHanningWindow(frame: Float32Array): Float32Array {
  const windowed = new Float32Array(frame.length);
  for (let i = 0; i < frame.length; i++) {
    const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frame.length - 1)));
    windowed[i] = frame[i] * multiplier;
  }
  return windowed;
}

/**
 * Calculate RMS (root mean square) energy of a frame.
 * Useful for determining if a frame contains sound or silence.
 */
export function calculateRMS(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    sum += frame[i] * frame[i];
  }
  return Math.sqrt(sum / frame.length);
}

/**
 * Convert an AudioBuffer to a WAV Blob (for download/upload).
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const data = getMonoData(buffer);
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = data.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Create a silent AudioBuffer of given duration.
 */
export function createSilentBuffer(
  durationSeconds: number,
  sampleRate: number = 44100
): AudioBuffer {
  const ctx = new OfflineAudioContext(1, sampleRate * durationSeconds, sampleRate);
  return ctx.startRendering() as unknown as AudioBuffer;
}
