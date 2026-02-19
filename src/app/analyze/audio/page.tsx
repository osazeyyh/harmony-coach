"use client";

import { useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Recorder } from "@/components/audio/recorder";
import { FileUploader } from "@/components/audio/file-uploader";
import { ChordDisplay } from "@/components/music/chord-display";
import { MelodyVisualizer } from "@/components/music/melody-visualizer";
import { useAnalysis } from "@/hooks/use-analysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, Upload, Loader2, RotateCcw, Music } from "lucide-react";
import { useSessionStore } from "@/stores/session-store";
import Link from "next/link";

export default function AudioAnalysisPage() {
  const { result, isAnalyzing, error, progress, analyzeFromFile, analyzeFromBuffer, reset } =
    useAnalysis();
  const { setAnalysis } = useSessionStore();
  const savedResultId = useRef<string | null>(null);

  // Store analysis result in session store for practice page
  useEffect(() => {
    if (result && !isAnalyzing && result.id !== savedResultId.current) {
      savedResultId.current = result.id;
      setAnalysis(result);
    }
  }, [result, isAnalyzing, setAnalysis]);

  function handleRecordingComplete(buffer: AudioBuffer) {
    analyzeFromBuffer(buffer, "My Recording");
  }

  function handleFileSelected(file: File) {
    analyzeFromFile(file);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Audio Analysis</h1>
          <p className="text-muted-foreground">
            Record or upload audio and we&apos;ll break down the key, chords, and melody.
          </p>
        </div>

        {/* Input section */}
        {!result && !isAnalyzing && (
          <Tabs defaultValue="record" className="mb-8">
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
              <TabsTrigger value="record" className="gap-2">
                <Mic className="h-4 w-4" />
                Record
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            </TabsList>
            <TabsContent value="record" className="mt-4">
              <Recorder onRecordingComplete={handleRecordingComplete} />
            </TabsContent>
            <TabsContent value="upload" className="mt-4">
              <FileUploader
                onFileSelected={handleFileSelected}
                accept="audio/*"
                label="Drop an audio file here, or click to browse"
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Analyzing spinner */}
        {isAnalyzing && (
          <Card className="mb-8">
            <CardContent className="flex flex-col items-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Listening...</p>
              <p className="text-sm text-muted-foreground mt-1">{progress}</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="mb-8 border-destructive">
            <CardContent className="py-6 text-center">
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={reset} className="mt-3 gap-2">
                <RotateCcw className="h-4 w-4" />
                Try Again
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
                      <Music className="h-5 w-5" />
                      {result.songTitle}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Here&apos;s what we found
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/practice/${result.id}`}>
                      <Button size="sm" className="gap-2">
                        Practice This
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      New
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="secondary" className="text-sm">
                    Key: {result.key.label}
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    ~{result.tempo} BPM
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {result.timeSignature[0]}/{result.timeSignature[1]} time
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {result.melody.length} notes
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {result.chords.length} chords
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Chords — tap to hear */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chords</CardTitle>
                <CardDescription>Tap any chord to hear it</CardDescription>
              </CardHeader>
              <CardContent>
                <ChordDisplay chords={result.chords} tempo={result.tempo} />
              </CardContent>
            </Card>

            {/* Melody — keyboard / piano roll / mini staff */}
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
                  highlightChordTones
                  showStaff
                  title={result.songTitle}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
