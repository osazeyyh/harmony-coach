"use client";

import { useState, useRef, useCallback } from "react";

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;       // seconds
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioBuffer: AudioBuffer | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
}

/**
 * Audio recorder hook that captures raw PCM data via Web Audio API.
 * This ensures the resulting AudioBuffer is always decodable (no codec issues).
 * Also creates a WAV blob for playback preview.
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);

      // Use ScriptProcessorNode to capture raw PCM
      // Buffer size 4096 gives a good balance of latency and performance
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      pcmChunksRef.current = [];
      pausedRef.current = false;

      processor.onaudioprocess = (event) => {
        if (!pausedRef.current) {
          const inputData = event.inputBuffer.getChannelData(0);
          pcmChunksRef.current.push(new Float32Array(inputData));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;
      streamRef.current = stream;

      setIsRecording(true);
      setIsPaused(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setAudioBuffer(null);
      startTimeRef.current = Date.now();

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    // Disconnect audio nodes
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());

    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    audioContextRef.current?.close();

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Combine all PCM chunks into a single Float32Array
    const totalLength = pcmChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const fullBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of pcmChunksRef.current) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Create an AudioBuffer from the raw PCM data
    const offlineCtx = new OfflineAudioContext(1, fullBuffer.length, sampleRate);
    const buffer = offlineCtx.createBuffer(1, fullBuffer.length, sampleRate);
    buffer.getChannelData(0).set(fullBuffer);
    setAudioBuffer(buffer);

    // Create a WAV blob for playback preview
    const wavBlob = float32ToWavBlob(fullBuffer, sampleRate);
    setAudioBlob(wavBlob);
    setAudioUrl(URL.createObjectURL(wavBlob));

    setIsRecording(false);
    setIsPaused(false);
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (isRecording && !isPaused) {
      pausedRef.current = true;
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (isRecording && isPaused) {
      pausedRef.current = false;
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    }
  }, [isRecording, isPaused]);

  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioBuffer(null);
    setDuration(0);
    pcmChunksRef.current = [];
  }, [audioUrl]);

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    audioBuffer,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}

/**
 * Convert a Float32Array of PCM samples to a WAV Blob.
 */
function float32ToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeStr(view, 8, "WAVE");

  // fmt chunk
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeStr(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let pos = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
