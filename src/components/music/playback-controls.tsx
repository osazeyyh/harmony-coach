"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, VolumeX, Repeat } from "lucide-react";

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentBeat: number;
  totalBeats: number;
  tempo: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek?: (beat: number) => void;
  onTempoChange?: (tempo: number) => void;
  onToggleLoop?: () => void;
  isLooping?: boolean;
}

export function PlaybackControls({
  isPlaying,
  currentBeat,
  totalBeats,
  tempo,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onTempoChange,
  onToggleLoop,
  isLooping = false,
}: PlaybackControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const progressPercent = totalBeats > 0 ? (currentBeat / totalBeats) * 100 : 0;

  function formatBeat(beat: number): string {
    const measure = Math.floor(beat / 4) + 1;
    const beatInMeasure = (beat % 4) + 1;
    return `${measure}:${beatInMeasure.toFixed(0)}`;
  }

  return (
    <div className="flex flex-col gap-2 p-3 border rounded-lg bg-card">
      {/* Progress bar */}
      <div
        className="w-full h-2 bg-muted rounded-full cursor-pointer overflow-hidden"
        onClick={(e) => {
          if (onSeek) {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            onSeek(pct * totalBeats);
          }
        }}
      >
        <div
          className="h-full bg-primary rounded-full transition-[width] duration-100"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Skip back */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSeek?.(Math.max(0, currentBeat - 4))}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Play / Pause */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        {/* Stop */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onStop}
        >
          <Square className="h-3 w-3" />
        </Button>

        {/* Skip forward */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSeek?.(Math.min(totalBeats, currentBeat + 4))}
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Loop toggle */}
        <Button
          variant={isLooping ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={onToggleLoop}
        >
          <Repeat className="h-4 w-4" />
        </Button>

        {/* Position display */}
        <span className="text-xs text-muted-foreground font-mono tabular-nums ml-auto">
          {formatBeat(currentBeat)} / {formatBeat(totalBeats)}
        </span>

        {/* Tempo */}
        <span className="text-xs text-muted-foreground">
          {tempo} BPM
        </span>
      </div>
    </div>
  );
}
