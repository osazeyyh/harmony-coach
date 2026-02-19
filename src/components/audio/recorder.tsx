"use client";

import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Pause, Play, RotateCcw } from "lucide-react";

interface RecorderProps {
  onRecordingComplete: (buffer: AudioBuffer) => void;
}

export function Recorder({ onRecordingComplete }: RecorderProps) {
  const {
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
  } = useAudioRecorder();

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function handleUseRecording() {
    if (audioBuffer) {
      onRecordingComplete(audioBuffer);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Timer */}
          <div className="text-4xl font-mono font-light tabular-nums">
            {formatTime(duration)}
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center justify-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {isPaused ? "Paused" : "Recording"}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {!isRecording && !audioBlob && (
              <Button size="lg" onClick={startRecording} className="gap-2">
                <Mic className="h-5 w-5" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                >
                  {isPaused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={stopRecording}
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button variant="outline" size="icon" onClick={resetRecording}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button size="lg" onClick={handleUseRecording} className="gap-2">
                  Analyze Recording
                </Button>
              </>
            )}
          </div>

          {/* Playback preview */}
          {audioUrl && !isRecording && (
            <div className="pt-2">
              <audio controls src={audioUrl} className="w-full max-w-sm mx-auto" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
