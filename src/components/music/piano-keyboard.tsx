"use client";

import { useMemo, useCallback } from "react";
import type { MelodyNote, NoteName, Key } from "@/types/music";
import { midiToNote, NOTE_NAMES } from "@/lib/utils/music-utils";
import { playNote } from "@/lib/audio/note-player";
import { useSessionStore } from "@/stores/session-store";
import { formatNoteDisplay } from "@/lib/music/solfege";

interface PianoKeyboardProps {
  melody: MelodyNote[];
  activeNoteIndex?: number | null;
  songKey?: Key;
  highlightChordTones?: boolean;
  activeChordNotes?: NoteName[];
}

// Black key indices within an octave (C=0)
const BLACK_KEY_INDICES = new Set([1, 3, 6, 8, 10]);

// Chord-tone → active key background color
const CHORD_TONE_BG: Record<string, string> = {
  root: "bg-green-500 !important",
  third: "bg-blue-500 !important",
  fifth: "bg-purple-500 !important",
  seventh: "bg-orange-500 !important",
  "non-chord": "bg-primary/40 !important",
};

interface KeyData {
  midi: number;
  noteName: NoteName;
  octave: number;
  isBlack: boolean;
  // Layout
  leftPercent?: number;
  widthPercent?: number;
  whiteIndex?: number;
}

export function PianoKeyboard({
  melody,
  activeNoteIndex = null,
  songKey,
  highlightChordTones = true,
  activeChordNotes,
}: PianoKeyboardProps) {
  const { notationMode } = useSessionStore();

  // Compute keyboard range
  const { startMidi, endMidi } = useMemo(() => {
    if (melody.length === 0) {
      return { startMidi: 48, endMidi: 72 }; // C3 to C5
    }
    const midis = melody.map((n) => n.midiNumber);
    const lowest = Math.min(...midis);
    const highest = Math.max(...midis);

    // Snap to octave boundaries (start on C, end on B)
    let startOctave = Math.floor((lowest - 2) / 12);
    let endOctave = Math.floor((highest + 2) / 12);

    let start = Math.max(24, startOctave * 12); // min C1
    let end = (endOctave + 1) * 12 - 1; // B of end octave

    // Ensure 2-4 octave range
    const span = (end - start + 1) / 12;
    if (span < 2) {
      const center = Math.floor((lowest + highest) / 2 / 12) * 12;
      start = center - 12;
      end = center + 12 - 1;
    } else if (span > 4) {
      const center = Math.floor((lowest + highest) / 2 / 12);
      start = (center - 2) * 12;
      end = (center + 2) * 12 - 1;
    }

    return { startMidi: start, endMidi: end };
  }, [melody]);

  // Build key data
  const { whiteKeys, blackKeys, whiteKeyCount } = useMemo(() => {
    const whites: KeyData[] = [];
    const blacks: KeyData[] = [];
    let wIdx = 0;

    for (let midi = startMidi; midi <= endMidi; midi++) {
      const noteIndex = midi % 12;
      const isBlack = BLACK_KEY_INDICES.has(noteIndex);
      const { name, octave } = midiToNote(midi);

      if (isBlack) {
        blacks.push({ midi, noteName: name, octave, isBlack: true, whiteIndex: wIdx });
      } else {
        whites.push({ midi, noteName: name, octave, isBlack: false, whiteIndex: wIdx });
        wIdx++;
      }
    }

    return { whiteKeys: whites, blackKeys: blacks, whiteKeyCount: wIdx };
  }, [startMidi, endMidi]);

  // Build active note map
  const activeMap = useMemo(() => {
    const map = new Map<number, MelodyNote>();

    if (activeNoteIndex !== null && melody[activeNoteIndex]) {
      // Playback mode: only current note
      const note = melody[activeNoteIndex];
      map.set(note.midiNumber, note);
    } else if (melody.length > 0 && activeNoteIndex === null) {
      // Static mode: show all unique pitches
      for (const note of melody) {
        if (!map.has(note.midiNumber)) {
          map.set(note.midiNumber, note);
        }
      }
    }

    return map;
  }, [melody, activeNoteIndex]);

  // Active chord notes (pitch class mode)
  const activeChordSet = useMemo(
    () => new Set(activeChordNotes || []),
    [activeChordNotes]
  );

  const handleKeyClick = useCallback(
    (noteName: NoteName, octave: number) => {
      playNote(`${noteName}${octave}`, "8n");
    },
    []
  );

  const getKeyActiveStyle = useCallback(
    (midi: number, noteName: NoteName, isBlack: boolean) => {
      const isPlaying = activeNoteIndex !== null && melody[activeNoteIndex]?.midiNumber === midi;
      const melodyNote = activeMap.get(midi);
      const isChordActive = activeChordSet.has(noteName);

      if (!melodyNote && !isChordActive) return { className: "", isActive: false, isPlaying: false };

      let colorClass = "";
      if (melodyNote && highlightChordTones && melodyNote.chordTone) {
        const ct = melodyNote.chordTone;
        if (ct === "root") colorClass = "!bg-green-500";
        else if (ct === "third") colorClass = "!bg-blue-500";
        else if (ct === "fifth") colorClass = "!bg-purple-500";
        else if (ct === "seventh") colorClass = "!bg-orange-500";
        else colorClass = isBlack ? "!bg-primary/70" : "!bg-primary/30";
      } else if (isChordActive) {
        colorClass = "!bg-primary";
      } else {
        colorClass = isBlack ? "!bg-primary/70" : "!bg-primary/30";
      }

      return { className: colorClass, isActive: true, isPlaying };
    },
    [activeMap, activeChordSet, activeNoteIndex, melody, highlightChordTones]
  );

  if (melody.length === 0 && !activeChordNotes?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No melody to display
      </div>
    );
  }

  const whiteKeyWidthPct = 100 / whiteKeyCount;
  const blackKeyWidthPct = whiteKeyWidthPct * 0.6;

  return (
    <div className="w-full select-none">
      {/* Keyboard */}
      <div className="relative w-full" style={{ height: 160 }}>
        {/* White keys */}
        <div className="absolute inset-0 flex">
          {whiteKeys.map((key) => {
            const { className: activeClass, isActive, isPlaying } = getKeyActiveStyle(
              key.midi, key.noteName, false
            );
            const label = formatNoteDisplay(key.noteName, key.octave, notationMode, songKey);
            const isC = key.noteName === "C";

            return (
              <button
                key={key.midi}
                onClick={() => handleKeyClick(key.noteName, key.octave)}
                className={[
                  "relative border-r border-b border-gray-300 dark:border-gray-600 rounded-b-md",
                  "transition-all duration-75 cursor-pointer",
                  isActive
                    ? `${activeClass} text-white`
                    : "bg-white dark:bg-gray-100 hover:bg-gray-50 dark:hover:bg-gray-200 text-gray-600",
                  isPlaying ? "ring-2 ring-primary shadow-lg shadow-primary/30 scale-y-[0.97] origin-top z-[5]" : "",
                ].join(" ")}
                style={{ width: `${whiteKeyWidthPct}%`, height: "100%" }}
                title={`${key.noteName}${key.octave} — tap to hear`}
              >
                {/* Note label at bottom */}
                <span
                  className={[
                    "absolute bottom-2 inset-x-0 text-center font-medium",
                    isActive ? "text-white text-[11px]" : "text-[10px] text-gray-500 dark:text-gray-500",
                    isC && !isActive ? "font-bold text-gray-700 dark:text-gray-700" : "",
                  ].join(" ")}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Black keys (overlay) */}
        {blackKeys.map((key) => {
          const { className: activeClass, isActive, isPlaying } = getKeyActiveStyle(
            key.midi, key.noteName, true
          );
          const label = formatNoteDisplay(key.noteName, key.octave, notationMode, songKey);
          // Position: centered between prev and next white key
          const leftPct = (key.whiteIndex! * whiteKeyWidthPct) - (blackKeyWidthPct / 2);

          return (
            <button
              key={key.midi}
              onClick={() => handleKeyClick(key.noteName, key.octave)}
              className={[
                "absolute top-0 rounded-b-md z-10",
                "transition-all duration-75 cursor-pointer border border-gray-700",
                isActive
                  ? `${activeClass} text-white`
                  : "bg-gray-900 dark:bg-gray-950 hover:bg-gray-800 dark:hover:bg-gray-900",
                isPlaying ? "ring-2 ring-primary shadow-lg shadow-primary/40 scale-y-[0.95] origin-top z-20" : "",
              ].join(" ")}
              style={{
                left: `${leftPct}%`,
                width: `${blackKeyWidthPct}%`,
                height: "60%",
              }}
              title={`${key.noteName}${key.octave} — tap to hear`}
            >
              <span
                className={[
                  "absolute bottom-1.5 inset-x-0 text-center text-[8px] font-medium",
                  isActive ? "text-white" : "text-gray-500",
                ].join(" ")}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Octave markers below keyboard */}
      <div className="flex text-[9px] text-muted-foreground/50 mt-0.5">
        {whiteKeys
          .filter((k) => k.noteName === "C")
          .map((k) => (
            <span
              key={`oct-${k.octave}`}
              className="text-center"
              style={{
                marginLeft: `${k.whiteIndex! * whiteKeyWidthPct}%`,
                width: `${7 * whiteKeyWidthPct}%`,
                position: "absolute",
              }}
            >
              C{k.octave}
            </span>
          ))}
      </div>
    </div>
  );
}
