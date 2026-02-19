"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { SheetUploader } from "@/components/sheet/sheet-uploader";
import { ChordDisplay } from "@/components/music/chord-display";
import { MelodyVisualizer } from "@/components/music/melody-visualizer";
import { parseMusicXML, parsedNotesToNotes } from "@/lib/notation/musicxml-parser";
import { parseMidiFile, extractMelodyFromMidi } from "@/lib/notation/midi-parser";
import { labelChords } from "@/lib/music/chord-labeler";
import { getDiatonicChords } from "@/lib/music/theory";
import { detectKey, buildPitchClassHistogram } from "@/lib/audio/key-detector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, Music } from "lucide-react";
import type { Key, Note, MelodyNote, ChordWithFunction, PitchFrame } from "@/types/music";

// Dynamically import ScoreViewer (no SSR — OSMD needs browser)
const ScoreViewer = dynamic(
  () => import("@/components/music/score-viewer").then((mod) => mod.ScoreViewer),
  { ssr: false, loading: () => <div className="h-48 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> }
);

interface SheetAnalysisResult {
  title: string;
  notes: Note[];
  melody: MelodyNote[];
  key: Key;
  tempo: number;
  timeSignature: [number, number];
  chords: ChordWithFunction[];
  musicXml: string | null;
  totalBeats: number;
}

export default function SheetAnalysisPage() {
  const [result, setResult] = useState<SheetAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(
    async (file: File, type: "musicxml" | "midi") => {
      setIsAnalyzing(true);
      setError(null);

      try {
        if (type === "musicxml") {
          const text = await file.text();
          const parsed = parseMusicXML(text);
          const notes = parsedNotesToNotes(parsed);

          // Build pitch frames for key detection
          const pitchFrames: PitchFrame[] = notes.map((n) => ({
            frequency: n.frequency,
            clarity: 1,
            note: n.name,
            octave: n.octave,
            centsOff: 0,
            timestamp: n.startBeat * (60000 / parsed.tempo),
          }));
          const histogram = buildPitchClassHistogram(pitchFrames);
          const keyResult = detectKey(histogram);

          // Simple chord detection from note clusters
          const chordObjects = generateChordsFromNotes(notes, keyResult.key, parsed.timeSignature);
          const labeledChords = labelChords(chordObjects, keyResult.key);

          const melody: MelodyNote[] = notes.map((n) => ({ ...n, confidence: 1 }));
          const lastNote = notes[notes.length - 1];
          const totalBeats = lastNote ? lastNote.startBeat + lastNote.duration : 16;

          setResult({
            title: parsed.title,
            notes,
            melody,
            key: keyResult.key,
            tempo: parsed.tempo,
            timeSignature: parsed.timeSignature,
            chords: labeledChords,
            musicXml: text,
            totalBeats,
          });
        } else {
          // MIDI
          const arrayBuffer = await file.arrayBuffer();
          const parsed = await parseMidiFile(arrayBuffer);
          const melody = extractMelodyFromMidi(parsed.notes);

          // Chord detection from note clusters
          const chordObjects = generateChordsFromNotes(parsed.notes, parsed.key, parsed.timeSignature);
          const labeledChords = labelChords(chordObjects, parsed.key);

          const melodyNotes: MelodyNote[] = melody.map((n) => ({ ...n, confidence: 1 }));

          setResult({
            title: file.name.replace(/\.(mid|midi)$/i, ""),
            notes: parsed.notes,
            melody: melodyNotes,
            key: parsed.key,
            tempo: parsed.tempo,
            timeSignature: parsed.timeSignature,
            chords: labeledChords,
            musicXml: null,
            totalBeats: parsed.totalBeats,
          });
        }
      } catch (err) {
        console.error("Sheet analysis error:", err);
        setError(err instanceof Error ? err.message : "Failed to analyze file");
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  function reset() {
    setResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Sheet Music Analysis</h1>
          <p className="text-muted-foreground">
            Upload MusicXML or MIDI files to see notation with chord labels and playback.
          </p>
        </div>

        {/* Upload section */}
        {!result && !isAnalyzing && (
          <SheetUploader onFileSelected={handleFileSelected} />
        )}

        {/* Loading */}
        {isAnalyzing && (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Analyzing sheet music...</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-6 text-center">
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={reset} className="mt-3 gap-2">
                <RotateCcw className="h-4 w-4" /> Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" /> {result.title}
                    </CardTitle>
                    <CardDescription className="mt-1">Sheet music analysis</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                    <RotateCcw className="h-4 w-4" /> New File
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="secondary">Key: {result.key.label}</Badge>
                  <Badge variant="secondary">Tempo: {result.tempo} BPM</Badge>
                  <Badge variant="secondary">Time: {result.timeSignature[0]}/{result.timeSignature[1]}</Badge>
                  <Badge variant="secondary">{result.notes.length} notes</Badge>
                  <Badge variant="secondary">{result.chords.length} chords</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Original Score (MusicXML only) */}
            {result.musicXml && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Original Score</CardTitle>
                  <CardDescription>Uploaded notation</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScoreViewer musicXml={result.musicXml} />
                </CardContent>
              </Card>
            )}

            {/* Chords */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chord Progression</CardTitle>
                <CardDescription>Detected chords in {result.key.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChordDisplay chords={result.chords} tempo={result.tempo} />
              </CardContent>
            </Card>

            {/* Melody — keyboard / piano roll */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Melody</CardTitle>
                <CardDescription>
                  Press Play to hear it, or tap any key to hear a single note
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MelodyVisualizer
                  melody={result.melody}
                  songKey={result.key}
                  tempo={result.tempo}
                  totalBeats={result.totalBeats}
                  highlightChordTones={false}
                  showStaff={false}
                  title={result.title}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Simple chord generation from note clusters.
 * Groups simultaneous notes into chords per beat.
 */
function generateChordsFromNotes(
  notes: Note[],
  key: Key,
  timeSig: [number, number]
) {
  // Group notes by beat (1-beat windows)
  const beatGroups: Map<number, Set<string>> = new Map();
  for (const note of notes) {
    const beat = Math.floor(note.startBeat);
    if (!beatGroups.has(beat)) beatGroups.set(beat, new Set());
    beatGroups.get(beat)!.add(note.name);
  }

  // Use diatonic chords of the key as candidates
  const diatonicChords = getDiatonicChords(key);
  const chords: Array<{ root: string; quality: string; symbol: string; notes: string[]; startBeat: number; duration: number }> = [];

  const sortedBeats = Array.from(beatGroups.keys()).sort((a, b) => a - b);

  for (const beat of sortedBeats) {
    const pitchClasses = Array.from(beatGroups.get(beat)!);
    if (pitchClasses.length === 0) continue;

    // Find best matching diatonic chord
    let bestMatch = diatonicChords[0];
    let bestScore = 0;

    for (const candidate of diatonicChords) {
      const overlap = pitchClasses.filter((p) => candidate.notes.includes(p as any)).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        bestMatch = candidate;
      }
    }

    // Merge with previous if same chord
    const prev = chords[chords.length - 1];
    if (prev && prev.symbol === bestMatch.symbol) {
      prev.duration += 1;
    } else {
      chords.push({
        root: bestMatch.root,
        quality: bestMatch.quality,
        symbol: bestMatch.symbol,
        notes: bestMatch.notes,
        startBeat: beat,
        duration: 1,
      });
    }
  }

  return chords as any[];
}
