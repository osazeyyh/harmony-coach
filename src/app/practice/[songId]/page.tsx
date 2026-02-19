"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { PracticeSession } from "@/components/practice/practice-session";
import { useSessionStore } from "@/stores/session-store";
import { generateHarmonyLines } from "@/lib/music/harmony-generator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Headphones, Loader2 } from "lucide-react";
import Link from "next/link";
import type { HarmonyLine } from "@/types/music";

export default function PracticePage() {
  const { currentAnalysis } = useSessionStore();
  const [harmonyLines, setHarmonyLines] = useState<HarmonyLine[]>([]);
  const [generating, setGenerating] = useState(false);

  // Generate harmony lines when analysis is available
  useEffect(() => {
    if (currentAnalysis && currentAnalysis.melody.length > 0 && harmonyLines.length === 0) {
      setGenerating(true);
      // Run in a microtask to not block the UI
      Promise.resolve().then(() => {
        const lines = generateHarmonyLines(
          currentAnalysis.melody,
          currentAnalysis.chords
        );
        setHarmonyLines(lines);
        setGenerating(false);
      });
    }
  }, [currentAnalysis, harmonyLines.length]);

  if (!currentAnalysis) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container px-4 py-8 max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Harmony Practice</h1>
            <p className="text-muted-foreground">
              Practice singing harmony parts with real-time pitch feedback.
            </p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <div className="rounded-full w-16 h-16 bg-muted flex items-center justify-center mb-4">
                <Headphones className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Song Loaded</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Analyze a song first, then come back here to practice harmony
                parts with real-time pitch feedback.
              </p>
              <div className="flex gap-3">
                <Link href="/analyze/audio">
                  <Button variant="outline">Analyze Audio</Button>
                </Link>
                <Link href="/analyze/sheet">
                  <Button variant="outline">Analyze Sheet Music</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container px-4 py-8 max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Generating harmony lines...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">
            Practice: {currentAnalysis.songTitle}
          </h1>
          <p className="text-muted-foreground">
            Key: {currentAnalysis.key.label} &middot; Tempo: {currentAnalysis.tempo} BPM
          </p>
        </div>

        <PracticeSession
          melody={currentAnalysis.melody}
          harmonyLines={harmonyLines}
          songTitle={currentAnalysis.songTitle}
          tempo={currentAnalysis.tempo}
        />
      </main>
    </div>
  );
}
