"use client";

import { useState, useCallback } from "react";
import type { AnalysisResult } from "@/types/music";
import { analyzeAudio, type AnalysisOptions } from "@/lib/audio/audio-analyzer";
import { decodeAudioFile } from "@/lib/utils/audio-utils";

export interface UseAnalysisReturn {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  progress: string;
  analyzeFromFile: (file: File, title?: string) => Promise<void>;
  analyzeFromBlob: (blob: Blob, title?: string) => Promise<void>;
  analyzeFromBuffer: (buffer: AudioBuffer, title?: string) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const runAnalysis = useCallback(
    async (audioBuffer: AudioBuffer, title: string) => {
      setIsAnalyzing(true);
      setError(null);
      setProgress("Detecting pitches...");

      try {
        setProgress("Analyzing audio...");
        const analysisResult = await analyzeAudio(audioBuffer, { title });
        setProgress("Done!");
        setResult(analysisResult);
      } catch (err) {
        console.error("Analysis error:", err);
        setError(
          err instanceof Error ? err.message : "Analysis failed"
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const analyzeFromFile = useCallback(
    async (file: File, title?: string) => {
      try {
        setProgress("Decoding audio file...");
        setIsAnalyzing(true);
        const audioBuffer = await decodeAudioFile(file);
        await runAnalysis(audioBuffer, title || file.name);
      } catch (err) {
        setError("Failed to decode audio file");
        setIsAnalyzing(false);
      }
    },
    [runAnalysis]
  );

  const analyzeFromBlob = useCallback(
    async (blob: Blob, title?: string) => {
      try {
        setProgress("Decoding recording...");
        setIsAnalyzing(true);
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioContext.close();
        await runAnalysis(audioBuffer, title || "Recording");
      } catch (err) {
        setError("Failed to decode recording");
        setIsAnalyzing(false);
      }
    },
    [runAnalysis]
  );

  const analyzeFromBuffer = useCallback(
    async (buffer: AudioBuffer, title?: string) => {
      try {
        setProgress("Preparing analysis...");
        setIsAnalyzing(true);
        await runAnalysis(buffer, title || "Recording");
      } catch (err) {
        console.error("Analysis from buffer error:", err);
        setError(
          err instanceof Error ? err.message : "Analysis failed"
        );
        setIsAnalyzing(false);
      }
    },
    [runAnalysis]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress("");
  }, []);

  return {
    result,
    isAnalyzing,
    error,
    progress,
    analyzeFromFile,
    analyzeFromBlob,
    analyzeFromBuffer,
    reset,
  };
}
