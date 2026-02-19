"use client";

/**
 * MelodyVisualizer — the main visual component for a detected or uploaded melody.
 *
 * Layout (top to bottom):
 *   1. Header bar: Key signature badge + view-mode toggle (Keyboard / Piano Roll)
 *   2. Mini staff (OSMD) — shows the first few bars of notation, animates during playback
 *   3. Keyboard or Piano Roll — determined by visualizationMode in session store
 *   4. Playback controls row
 *   5. Chord-tone legend
 */

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Piano, BarChart2, Play, Square, Loader2 } from "lucide-react";

import { PianoKeyboard } from "@/components/music/piano-keyboard";
import { PianoRoll } from "@/components/music/piano-roll";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useSessionStore } from "@/stores/session-store";
import { useKeyboardPlayback } from "@/hooks/use-keyboard-playback";
import { getKeySignatureInfo } from "@/lib/music/key-signature";
import { buildMusicXML } from "@/lib/notation/score-builder";

import type { MelodyNote, Key } from "@/types/music";

// OSMD requires browser APIs — load dynamically (no SSR)
const ScoreViewer = dynamic(
  () => import("@/components/music/score-viewer").then((m) => m.ScoreViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading notation…</span>
      </div>
    ),
  }
);

// ────────────────────────────────────────────────────────────────
// Chord-tone legend
// ────────────────────────────────────────────────────────────────
const LEGEND = [
  { label: "Root", color: "bg-green-500" },
  { label: "3rd", color: "bg-blue-500" },
  { label: "5th", color: "bg-purple-500" },
  { label: "7th", color: "bg-orange-500" },
  { label: "Passing", color: "bg-primary/30" },
] as const;

// ────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────
interface MelodyVisualizerProps {
  melody: MelodyNote[];
  songKey?: Key;
  tempo?: number;
  totalBeats?: number;
  highlightChordTones?: boolean;
  /** When true, renders the mini OSMD staff above the keyboard */
  showStaff?: boolean;
  title?: string;
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────
export function MelodyVisualizer({
  melody,
  songKey,
  tempo = 120,
  totalBeats,
  highlightChordTones = true,
  showStaff = true,
  title = "Melody",
}: MelodyVisualizerProps) {
  const { visualizationMode, setVisualizationMode } = useSessionStore();
  const { isPlaying, activeNoteIndex, play, stop } = useKeyboardPlayback(melody, tempo);

  // Key signature info for the badge
  const keySigInfo = useMemo(
    () => (songKey ? getKeySignatureInfo(songKey) : null),
    [songKey]
  );

  // Build MusicXML for the mini staff (memoised — only changes when melody/key change)
  const musicXml = useMemo(() => {
    if (!showStaff || melody.length === 0) return null;
    try {
      return buildMusicXML(
        melody.map((n) => ({
          name: n.name,
          octave: n.octave,
          midiNumber: n.midiNumber,
          frequency: n.frequency,
          duration: n.duration,
          startBeat: n.startBeat,
        })),
        {
          title,
          key: songKey,
          tempo,
        }
      );
    } catch {
      return null;
    }
  }, [melody, songKey, tempo, title, showStaff]);

  // Currently active melody note (for keyboard highlight label)
  const activeNote =
    activeNoteIndex !== null ? melody[activeNoteIndex] : undefined;

  return (
    <div className="space-y-4">
      {/* ── Header: key badge + view toggle ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {songKey && (
            <Badge variant="secondary" className="text-sm font-semibold gap-1">
              🎵 {songKey.label}
              {keySigInfo && keySigInfo.type !== "none" && (
                <span className="ml-1 text-muted-foreground font-normal">
                  ({keySigInfo.shortDisplay})
                </span>
              )}
            </Badge>
          )}
          {keySigInfo && keySigInfo.count > 0 && (
            <span className="text-xs text-muted-foreground">
              {keySigInfo.display}
            </span>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={visualizationMode === "keyboard" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setVisualizationMode("keyboard")}
          >
            <Piano className="h-3.5 w-3.5" />
            Keyboard
          </Button>
          <Button
            variant={visualizationMode === "pianoroll" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setVisualizationMode("pianoroll")}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Piano Roll
          </Button>
        </div>
      </div>

      {/* ── Mini staff (OSMD) ── */}
      {showStaff && musicXml && (
        <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-50 px-4 py-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Staff
          </p>
          <ScoreViewer musicXml={musicXml} />
        </div>
      )}

      {/* ── Active note label (during playback) ── */}
      {isPlaying && activeNote && (
        <div className="flex items-center justify-center gap-2">
          <div className="text-2xl font-bold text-primary animate-pulse">
            {activeNote.name}
            <span className="text-base font-normal text-muted-foreground">
              {activeNote.octave}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Note {(activeNoteIndex ?? 0) + 1} / {melody.length}
          </span>
        </div>
      )}

      {/* ── Keyboard or Piano Roll ── */}
      {visualizationMode === "keyboard" ? (
        <div className="border rounded-xl overflow-hidden p-3 bg-gray-50 dark:bg-gray-900">
          <PianoKeyboard
            melody={melody}
            activeNoteIndex={isPlaying ? activeNoteIndex : null}
            songKey={songKey}
            highlightChordTones={highlightChordTones}
          />
        </div>
      ) : (
        <PianoRoll
          melody={melody}
          totalBeats={totalBeats}
          highlightChordTones={highlightChordTones}
        />
      )}

      {/* ── Playback controls ── */}
      <div className="flex items-center gap-3">
        <Button
          onClick={play}
          variant={isPlaying ? "destructive" : "default"}
          size="sm"
          className="gap-2"
          disabled={melody.length === 0}
        >
          {isPlaying ? (
            <>
              <Square className="h-3.5 w-3.5" /> Stop
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" /> Play Melody
            </>
          )}
        </Button>

        <span className="text-xs text-muted-foreground">
          {melody.length} notes · {tempo} BPM
        </span>
      </div>

      {/* ── Chord-tone legend ── */}
      {highlightChordTones && (
        <div className="flex flex-wrap gap-3 pt-1">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
