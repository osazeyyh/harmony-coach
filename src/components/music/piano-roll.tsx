"use client";

import { useMemo, useCallback } from "react";
import type { MelodyNote } from "@/types/music";
import { NOTE_NAMES } from "@/lib/utils/music-utils";
import { playNote } from "@/lib/audio/note-player";
import { useSessionStore } from "@/stores/session-store";
import { formatNoteDisplay } from "@/lib/music/solfege";

interface PianoRollProps {
  melody: MelodyNote[];
  totalBeats?: number;
  highlightChordTones?: boolean;
}

const CHORD_TONE_COLORS: Record<string, string> = {
  root: "bg-green-500",
  third: "bg-blue-500",
  fifth: "bg-purple-500",
  seventh: "bg-orange-500",
  "non-chord": "bg-muted-foreground/40",
};

const CHORD_TONE_HOVER: Record<string, string> = {
  root: "hover:bg-green-400",
  third: "hover:bg-blue-400",
  fifth: "hover:bg-purple-400",
  seventh: "hover:bg-orange-400",
  "non-chord": "hover:bg-muted-foreground/60",
};

export function PianoRoll({
  melody,
  totalBeats,
  highlightChordTones = true,
}: PianoRollProps) {
  const { notationMode } = useSessionStore();

  const { minMidi, maxMidi, maxBeat } = useMemo(() => {
    if (melody.length === 0) {
      return { minMidi: 60, maxMidi: 72, maxBeat: 16 };
    }
    const midis = melody.map((n) => n.midiNumber);
    const beats = melody.map((n) => n.startBeat + n.duration);
    return {
      minMidi: Math.min(...midis) - 2,
      maxMidi: Math.max(...midis) + 2,
      maxBeat: totalBeats || Math.ceil(Math.max(...beats)),
    };
  }, [melody, totalBeats]);

  const handleNoteClick = useCallback((note: MelodyNote) => {
    playNote(`${note.name}${note.octave}`, "8n");
  }, []);

  const noteRange = maxMidi - minMidi + 1;
  const rowHeight = 18;
  const beatWidth = 40;
  const svgHeight = noteRange * rowHeight;
  const svgWidth = maxBeat * beatWidth;

  if (melody.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No melody detected
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border rounded-lg bg-background">
      <div className="flex">
        {/* Piano key labels */}
        <div className="flex-shrink-0 border-r bg-muted/30" style={{ width: 48 }}>
          {Array.from({ length: noteRange }, (_, i) => {
            const midi = maxMidi - i;
            const noteName = NOTE_NAMES[midi % 12];
            const octave = Math.floor(midi / 12) - 1;
            const isBlackKey = noteName.includes("#");

            return (
              <div
                key={midi}
                className={`flex items-center justify-end pr-2 text-[10px] font-mono border-b ${
                  isBlackKey ? "bg-muted/50 text-muted-foreground" : ""
                }`}
                style={{ height: rowHeight }}
              >
                {noteName}{octave}
              </div>
            );
          })}
        </div>

        {/* Roll grid */}
        <div className="relative" style={{ width: svgWidth, height: svgHeight }}>
          {/* Grid lines */}
          <svg width={svgWidth} height={svgHeight} className="absolute inset-0">
            {Array.from({ length: noteRange }, (_, i) => {
              const midi = maxMidi - i;
              const isC = midi % 12 === 0;
              return (
                <line
                  key={`h-${i}`}
                  x1={0} y1={i * rowHeight} x2={svgWidth} y2={i * rowHeight}
                  stroke={isC ? "hsl(var(--border))" : "hsl(var(--border) / 0.3)"}
                  strokeWidth={isC ? 1 : 0.5}
                />
              );
            })}
            {Array.from({ length: maxBeat + 1 }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={i * beatWidth} y1={0} x2={i * beatWidth} y2={svgHeight}
                stroke={i % 4 === 0 ? "hsl(var(--border))" : "hsl(var(--border) / 0.3)"}
                strokeWidth={i % 4 === 0 ? 1 : 0.5}
              />
            ))}
          </svg>

          {/* Clickable notes */}
          {melody.map((note, i) => {
            const y = (maxMidi - note.midiNumber) * rowHeight;
            const x = note.startBeat * beatWidth;
            const width = Math.max(note.duration * beatWidth - 1, 8);
            const colorClass = highlightChordTones && note.chordTone
              ? CHORD_TONE_COLORS[note.chordTone]
              : "bg-primary";
            const hoverClass = highlightChordTones && note.chordTone
              ? CHORD_TONE_HOVER[note.chordTone]
              : "hover:bg-primary/80";

            const label = formatNoteDisplay(note.name, note.octave, notationMode);

            return (
              <button
                key={`${note.startBeat}-${note.midiNumber}-${i}`}
                onClick={() => handleNoteClick(note)}
                className={`absolute rounded-sm ${colorClass} ${hoverClass} opacity-80 hover:opacity-100 transition-all cursor-pointer flex items-center justify-center`}
                style={{
                  left: x,
                  top: y + 1,
                  width,
                  height: rowHeight - 2,
                }}
                title={`${label} \u2014 tap to hear`}
              >
                {width > 28 && (
                  <span className="text-[8px] text-white font-medium truncate px-0.5">
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {highlightChordTones && (
        <div className="flex flex-wrap gap-3 px-3 py-2 border-t text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500" /> Root</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> 3rd</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-500" /> 5th</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-500" /> 7th</span>
          <span className="ml-auto text-muted-foreground/60">Tap any note to hear it</span>
        </div>
      )}
    </div>
  );
}
