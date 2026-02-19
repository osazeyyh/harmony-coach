"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { playSequence, disposeSynth } from "@/lib/audio/note-player";
import type { MelodyNote } from "@/types/music";

interface UseKeyboardPlaybackReturn {
  isPlaying: boolean;
  activeNoteIndex: number | null;
  play: () => void;
  stop: () => void;
}

/**
 * Hook for playing back a melody and tracking which note is currently active.
 * Used by MelodyVisualizer to animate the piano keyboard during playback.
 */
export function useKeyboardPlayback(
  melody: MelodyNote[],
  tempo: number
): UseKeyboardPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRef.current?.();
      disposeSynth();
    };
  }, []);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setIsPlaying(false);
    setActiveNoteIndex(null);
  }, []);

  const play = useCallback(async () => {
    if (isPlaying) {
      stop();
      return;
    }
    if (melody.length === 0) return;

    setIsPlaying(true);
    setActiveNoteIndex(null);

    const sequenceNotes = melody.map((n) => ({
      note: `${n.name}${n.octave}`,
      duration: n.duration,
      startBeat: n.startBeat,
    }));

    const stopFn = await playSequence(
      sequenceNotes,
      tempo,
      (idx) => setActiveNoteIndex(idx),
      () => {
        setIsPlaying(false);
        setActiveNoteIndex(null);
      }
    );

    stopRef.current = stopFn;
  }, [melody, tempo, isPlaying, stop]);

  return { isPlaying, activeNoteIndex, play, stop };
}
