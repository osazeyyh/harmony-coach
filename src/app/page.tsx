"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { FileMusic, Music } from "lucide-react";
import { GradientBlobBackground } from "@/components/home/gradient-bg";
import { MicButton } from "@/components/home/mic-button";
import { ChordDisplay } from "@/components/music/chord-display";
import { MelodyVisualizer } from "@/components/music/melody-visualizer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/types/music";

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleResult = useCallback((r: AnalysisResult) => {
    setResult(r);
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Fixed animated blob background */}
      <GradientBlobBackground />

      {/* Minimal top nav */}
      <header className="relative z-20 flex items-center justify-between px-6 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-violet-400" />
          <span className="font-bold text-lg tracking-tight gradient-text">
            Harmony Coach
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/analyze/sheet"
            className="text-sm text-white/50 hover:text-white/90 transition-colors"
          >
            Sheet Music
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-white/50 hover:text-white/90 transition-colors"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        {!result && (
          <>
            {/* Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
                <span className="gradient-text">Hear the harmony</span>
              </h1>
              <p className="text-white/45 text-base md:text-lg max-w-sm mx-auto">
                Tap the mic and sing or play — we&apos;ll decode the key,
                chords &amp; melody instantly.
              </p>
            </div>

            {/* ── Centrepiece mic button ── */}
            <MicButton onResult={handleResult} />

            {/* Secondary: sheet music option */}
            <div className="mt-10">
              <Link href="/analyze/sheet">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 text-sm font-medium transition-all duration-200 backdrop-blur-sm">
                  <FileMusic className="h-4 w-4" />
                  Upload sheet music or MIDI
                </button>
              </Link>
            </div>
          </>
        )}

        {/* ── Results panel (slides up after analysis) ── */}
        {result && (
          <div className="slide-up w-full max-w-3xl space-y-5">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-violet-400" />
                <h2 className="text-xl font-bold text-white">
                  {result.songTitle}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/practice/${result.id}`}>
                  <Button
                    size="sm"
                    className="gap-2 bg-violet-600 hover:bg-violet-500 text-white border-0"
                  >
                    Practice This →
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="border-white/15 text-white/70 hover:text-white hover:bg-white/10"
                >
                  New
                </Button>
              </div>
            </div>

            {/* Key / tempo badges */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="bg-violet-500/20 text-violet-200 border-violet-500/30 border"
              >
                Key: {result.key.label}
              </Badge>
              <Badge
                variant="secondary"
                className="bg-violet-500/20 text-violet-200 border-violet-500/30 border"
              >
                ~{result.tempo} BPM
              </Badge>
              <Badge
                variant="secondary"
                className="bg-violet-500/20 text-violet-200 border-violet-500/30 border"
              >
                {result.timeSignature[0]}/{result.timeSignature[1]} time
              </Badge>
              <Badge
                variant="secondary"
                className="bg-violet-500/20 text-violet-200 border-violet-500/30 border"
              >
                {result.melody.length} notes
              </Badge>
              <Badge
                variant="secondary"
                className="bg-violet-500/20 text-violet-200 border-violet-500/30 border"
              >
                {result.chords.length} chords
              </Badge>
            </div>

            {/* Chords */}
            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
                Chord Progression
              </h3>
              <ChordDisplay chords={result.chords} tempo={result.tempo} />
            </div>

            {/* Melody */}
            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-1">
                Melody
              </h3>
              <p className="text-xs text-white/40 mb-4">
                Press Play or tap any key
              </p>
              <MelodyVisualizer
                melody={result.melody}
                songKey={result.key}
                tempo={result.tempo}
                highlightChordTones
                showStaff={false}
                title={result.songTitle}
              />
            </div>

            {/* Record again link */}
            <div className="text-center pt-2">
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
