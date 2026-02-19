"use client";

import { useCallback } from "react";
import type { ChordWithFunction } from "@/types/music";
import { Badge } from "@/components/ui/badge";
import { playChord } from "@/lib/audio/note-player";
import { Volume2 } from "lucide-react";

interface ChordDisplayProps {
  chords: ChordWithFunction[];
  tempo?: number;
  activeChordIndex?: number;
}

/**
 * Displays a horizontal timeline of detected chords.
 * Click any chord to hear it played.
 */
export function ChordDisplay({
  chords,
  tempo = 120,
  activeChordIndex,
}: ChordDisplayProps) {
  const handleChordClick = useCallback((chord: ChordWithFunction) => {
    // Build the chord notes with octave 4 as default
    const noteNames = chord.notes.map((n, i) => `${n}${i === 0 ? 3 : 4}`);
    playChord(noteNames, "2n");
  }, []);

  if (chords.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No chords detected
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {chords.map((chord, i) => {
          const isActive = i === activeChordIndex;
          const durationBeats = chord.duration;
          const minWidth = Math.max(60, durationBeats * 30);

          return (
            <button
              key={`${chord.symbol}-${chord.startBeat}-${i}`}
              onClick={() => handleChordClick(chord)}
              className={`flex flex-col items-center justify-center rounded-lg border p-3 transition-all group cursor-pointer ${
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              }`}
              style={{ minWidth: `${minWidth}px` }}
              title={`${chord.symbol} \u2014 tap to hear`}
            >
              {/* Chord symbol */}
              <span className="text-lg font-bold">{chord.symbol}</span>

              {/* Roman numeral */}
              <span className="text-xs text-muted-foreground font-medium mt-0.5">
                {chord.romanNumeral}
              </span>

              {/* Play hint */}
              <span className="text-[10px] text-muted-foreground/40 group-hover:text-primary mt-1 flex items-center gap-0.5">
                <Volume2 className="h-2.5 w-2.5" />
                play
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact inline chord display for use above a score or piano roll.
 */
export function ChordBar({ chords }: { chords: ChordWithFunction[] }) {
  const handleChordClick = useCallback((chord: ChordWithFunction) => {
    const noteNames = chord.notes.map((n, i) => `${n}${i === 0 ? 3 : 4}`);
    playChord(noteNames, "2n");
  }, []);

  return (
    <div className="flex gap-1.5 flex-wrap">
      {chords.map((chord, i) => (
        <Badge
          key={`${chord.symbol}-${i}`}
          variant="outline"
          className="text-xs font-mono cursor-pointer hover:bg-primary/10"
          onClick={() => handleChordClick(chord)}
        >
          {chord.symbol}{" "}
          <span className="text-muted-foreground ml-1">
            {chord.romanNumeral}
          </span>
        </Badge>
      ))}
    </div>
  );
}
