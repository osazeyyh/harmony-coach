"use client";

import type { PitchFrame, NoteName, Key } from "@/types/music";
import { useMemo } from "react";
import { useSessionStore } from "@/stores/session-store";
import { formatNoteDisplay } from "@/lib/music/solfege";

interface PitchMonitorProps {
  currentPitch: PitchFrame | null;
  targetNote?: { name: NoteName; octave: number } | null;
  isTracking: boolean;
  songKey?: Key;
}

/**
 * Real-time pitch monitor: shows current sung note, target note,
 * and how close the singer is (cents off).
 * Supports both Standard and Solfege notation modes.
 */
export function PitchMonitor({
  currentPitch,
  targetNote,
  isTracking,
  songKey,
}: PitchMonitorProps) {
  const { notationMode } = useSessionStore();

  const status = useMemo(() => {
    if (!currentPitch || !currentPitch.note) return "silent";
    if (!targetNote) return "singing";

    const isCorrectNote =
      currentPitch.note === targetNote.name &&
      currentPitch.octave === targetNote.octave;
    const centsAbs = Math.abs(currentPitch.centsOff);

    if (isCorrectNote && centsAbs <= 20) return "correct";
    if (isCorrectNote && centsAbs <= 40) return "close";
    return "off";
  }, [currentPitch, targetNote]);

  const statusColors = {
    silent: "text-muted-foreground",
    singing: "text-primary",
    correct: "text-green-500",
    close: "text-yellow-500",
    off: "text-red-500",
  };

  const statusBg = {
    silent: "bg-muted",
    singing: "bg-primary/10",
    correct: "bg-green-500/10",
    close: "bg-yellow-500/10",
    off: "bg-red-500/10",
  };

  const displayNote = currentPitch?.note && currentPitch?.octave !== null
    ? formatNoteDisplay(currentPitch.note, currentPitch.octave!, notationMode, songKey)
    : "—";

  const displayTarget = targetNote
    ? formatNoteDisplay(targetNote.name, targetNote.octave, notationMode, songKey)
    : null;

  return (
    <div className={`rounded-xl p-6 text-center transition-colors ${statusBg[status]}`}>
      {/* Current note display */}
      <div className="mb-2">
        <span className={`text-5xl font-bold ${statusColors[status]}`}>
          {displayNote}
        </span>
      </div>

      {/* Small standard name shown when in solfege mode */}
      {notationMode === "solfege" && currentPitch?.note && (
        <div className="text-xs text-muted-foreground/60 font-mono mb-1">
          ({currentPitch.note}{currentPitch.octave})
        </div>
      )}

      {/* Cents deviation bar */}
      <div className="relative w-48 h-3 bg-muted rounded-full mx-auto mb-3">
        <div className="absolute top-0 left-1/2 w-0.5 h-3 bg-foreground/30" />
        {currentPitch?.note && (
          <div
            className={`absolute top-0 w-3 h-3 rounded-full transition-all duration-75 ${
              status === "correct"
                ? "bg-green-500"
                : status === "close"
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{
              left: `${50 + (currentPitch.centsOff / 50) * 50}%`,
              transform: "translateX(-50%)",
            }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground w-48 mx-auto mb-4">
        <span>Flat</span>
        <span>In Tune</span>
        <span>Sharp</span>
      </div>

      {/* Target note */}
      {displayTarget && (
        <div className="text-sm text-muted-foreground">
          Target:{" "}
          <span className="font-medium">{displayTarget}</span>
        </div>
      )}

      {/* Status */}
      {!isTracking && (
        <p className="text-sm text-muted-foreground mt-2">
          Press start to begin pitch tracking
        </p>
      )}

      {isTracking && status === "silent" && (
        <p className="text-sm text-muted-foreground mt-2">
          Listening... sing or play a note
        </p>
      )}
    </div>
  );
}
