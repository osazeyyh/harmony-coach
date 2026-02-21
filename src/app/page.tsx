"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { FileMusic, Music, RotateCcw } from "lucide-react";
import { GradientBlobBackground } from "@/components/home/gradient-bg";
import { MicButton } from "@/components/home/mic-button";
import { ChordDisplay } from "@/components/music/chord-display";
import { MelodyVisualizer } from "@/components/music/melody-visualizer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useAnalysis } from "@/hooks/use-analysis";
import { useSessionStore } from "@/stores/session-store";
import type { AnalysisResult } from "@/types/music";

export default function Home() {
  // Hooks lifted here so their state survives MicButton re-renders
  const {
    audioBuffer,
    duration,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  const { analyzeFromBuffer, result: analysisResult, isAnalyzing, progress, reset: resetAnalysis } = useAnalysis();
  const { setAnalysis } = useSessionStore();

  // The result we show in the results panel — set after the done flash
  const [result, setResult] = useState<AnalysisResult | null>(null);
  // Signal to MicButton that analysis finished (triggers done flash)
  const [analysisReady, setAnalysisReady] = useState(false);

  // When useAnalysis has a result → signal MicButton
  useEffect(() => {
    if (analysisResult && !isAnalyzing) {
      setAnalysis(analysisResult);
      setAnalysisReady(true);
    }
  }, [analysisResult, isAnalyzing, setAnalysis]);

  // When audioBuffer appears (after stopRecording) → run analysis
  useEffect(() => {
    if (audioBuffer) {
      analyzeFromBuffer(audioBuffer, "Recording");
    }
  }, [audioBuffer, analyzeFromBuffer]);

  // MicButton calls this after its 800ms done flash
  const handleDoneFlashComplete = useCallback(() => {
    setAnalysisReady(false);
    if (analysisResult) setResult(analysisResult);
  }, [analysisResult]);

  const handleCancel = useCallback(() => {
    resetRecording();
    resetAnalysis();
    setAnalysisReady(false);
  }, [resetRecording, resetAnalysis]);

  const handleReset = useCallback(() => {
    setResult(null);
    resetRecording();
    resetAnalysis();
    setAnalysisReady(false);
  }, [resetRecording, resetAnalysis]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <GradientBlobBackground />

      {/* Top nav */}
      <header className="relative z-20 flex items-center justify-between px-6 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-violet-400" />
          <span className="font-bold text-lg tracking-tight gradient-text">Harmony Coach</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/analyze/sheet" className="text-sm text-white/50 hover:text-white/90 transition-colors">
            Sheet Music
          </Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white/90 transition-colors">
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-8">

        {/* ── Mic view ── */}
        {!result && (
          <div className="flex flex-col items-center justify-center flex-1 w-full">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
                <span className="gradient-text">Hear the harmony</span>
              </h1>
              <p className="text-white/45 text-base md:text-lg max-w-sm mx-auto">
                Tap the mic and sing or play — we&apos;ll decode the key, chords &amp; melody instantly.
              </p>
            </div>

            <MicButton
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              isAnalyzing={isAnalyzing}
              progress={progress}
              analysisReady={analysisReady}
              onDoneFlashComplete={handleDoneFlashComplete}
              duration={duration}
              onCancel={handleCancel}
            />

            <div className="mt-10">
              <Link href="/analyze/sheet">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 text-sm font-medium transition-all duration-200 backdrop-blur-sm">
                  <FileMusic className="h-4 w-4" />
                  Upload sheet music or MIDI
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Results panel ── */}
        {result && (
          <div className="slide-up w-full max-w-3xl space-y-5 pt-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-violet-400" />
                  <h2 className="text-xl font-bold text-white">{result.songTitle}</h2>
                </div>
                <p className="text-white/40 text-xs mt-0.5 ml-7">Analysis complete</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/practice/${result.id}`}>
                  <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-500 text-white border-0">
                    Practice This →
                  </Button>
                </Link>
                <Button
                  size="sm" variant="ghost" onClick={handleReset}
                  className="gap-1.5 text-white/50 hover:text-white hover:bg-white/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> New
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                `Key: ${result.key.label}`,
                `~${result.tempo} BPM`,
                `${result.timeSignature[0]}/${result.timeSignature[1]} time`,
                `${result.melody.length} notes`,
                `${result.chords.length} chords`,
              ].map((label) => (
                <Badge key={label} variant="secondary" className="bg-violet-500/20 text-violet-200 border-violet-500/30 border">
                  {label}
                </Badge>
              ))}
            </div>

            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Chord Progression</h3>
              <ChordDisplay chords={result.chords} tempo={result.tempo} />
            </div>

            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-1">Melody</h3>
              <p className="text-xs text-white/40 mb-4">Press Play or tap any key</p>
              <MelodyVisualizer
                melody={result.melody}
                songKey={result.key}
                tempo={result.tempo}
                highlightChordTones
                showStaff={false}
                title={result.songTitle}
              />
            </div>

            <div className="text-center pt-2 pb-8">
              <button
                onClick={handleReset}
                className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
              >
                Record something new
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
