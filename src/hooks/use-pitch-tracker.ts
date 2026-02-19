"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createRealtimePitchDetector } from "@/lib/audio/pitch-detector";
import type { PitchFrame } from "@/types/music";

export interface UsePitchTrackerReturn {
  isTracking: boolean;
  currentPitch: PitchFrame | null;
  pitchHistory: PitchFrame[];
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

/**
 * Hook for real-time pitch tracking from the microphone.
 * Uses Pitchy for autocorrelation-based detection at ~30fps.
 */
export function usePitchTracker(): UsePitchTrackerReturn {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchFrame | null>(null);
  const [pitchHistory, setPitchHistory] = useState<PitchFrame[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<ReturnType<typeof createRealtimePitchDetector> | null>(null);
  const rafRef = useRef<number>(0);

  const startTracking = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      streamRef.current = stream;

      const detector = createRealtimePitchDetector(
        analyser,
        audioContext.sampleRate,
        { clarityThreshold: 0.75 }
      );
      detectorRef.current = detector;

      setIsTracking(true);
      setPitchHistory([]);

      // Start detection loop (~30fps)
      function detect() {
        if (detectorRef.current) {
          const pitch = detectorRef.current();
          setCurrentPitch(pitch);
          if (pitch.note !== null) {
            setPitchHistory((prev) => [...prev.slice(-300), pitch]); // Keep last 300
          }
        }
        rafRef.current = requestAnimationFrame(detect);
      }
      detect();
    } catch (error) {
      console.error("Failed to start pitch tracking:", error);
      throw error;
    }
  }, []);

  const stopTracking = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    setIsTracking(false);
    detectorRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  return {
    isTracking,
    currentPitch,
    pitchHistory,
    startTracking,
    stopTracking,
  };
}
