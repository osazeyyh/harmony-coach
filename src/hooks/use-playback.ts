"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Note } from "@/types/music";

/**
 * Hook for audio playback of notes using Tone.js.
 * Handles play, pause, stop, seek, and tempo control.
 */
export function usePlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isLooping, setIsLooping] = useState(false);

  const toneRef = useRef<typeof import("tone") | null>(null);
  const synthRef = useRef<unknown>(null);
  const partRef = useRef<unknown>(null);
  const animFrameRef = useRef<number>(0);

  // Load Tone.js lazily
  const loadTone = useCallback(async () => {
    if (!toneRef.current) {
      toneRef.current = await import("tone");
    }
    return toneRef.current;
  }, []);

  /**
   * Schedule and play a set of notes.
   */
  const playNotes = useCallback(
    async (notes: Note[], tempo: number) => {
      const Tone = await loadTone();

      // Ensure audio context is started (browser autoplay policy)
      await Tone.start();

      // Stop any previous playback
      Tone.getTransport().stop();
      Tone.getTransport().cancel();

      // Set tempo
      Tone.getTransport().bpm.value = tempo;

      // Create a synth
      if (synthRef.current) {
        (synthRef.current as { dispose: () => void }).dispose();
      }
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.8 },
      }).toDestination();
      synth.volume.value = -6;
      synthRef.current = synth;

      // Schedule notes
      const events = notes.map((note) => ({
        time: `0:0:${note.startBeat * (Tone.getTransport().PPQ)}i`,
        note: `${note.name}${note.octave}`,
        duration: `0:0:${note.duration * (Tone.getTransport().PPQ)}i`,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const part = new (Tone.Part as any)((time: number, event: { note: string; duration: string }) => {
        synth.triggerAttackRelease(event.note, event.duration, time);
      }, events.map((e) => [e.time, { note: e.note, duration: e.duration }]));

      part.start(0);
      if (isLooping) {
        const totalBeats = Math.max(...notes.map((n) => n.startBeat + n.duration));
        part.loop = true;
        part.loopEnd = `0:0:${totalBeats * Tone.getTransport().PPQ}i`;
      }
      partRef.current = part;

      // Start transport
      Tone.getTransport().start();
      setIsPlaying(true);

      // Update current beat
      const updateBeat = () => {
        const seconds = Tone.getTransport().seconds;
        const beat = (seconds / 60) * tempo;
        setCurrentBeat(beat);
        animFrameRef.current = requestAnimationFrame(updateBeat);
      };
      updateBeat();
    },
    [loadTone, isLooping]
  );

  const pause = useCallback(async () => {
    const Tone = await loadTone();
    Tone.getTransport().pause();
    setIsPlaying(false);
    cancelAnimationFrame(animFrameRef.current);
  }, [loadTone]);

  const resume = useCallback(async () => {
    const Tone = await loadTone();
    Tone.getTransport().start();
    setIsPlaying(true);

    const updateBeat = () => {
      const seconds = Tone.getTransport().seconds;
      const beat = (seconds / 60) * Tone.getTransport().bpm.value;
      setCurrentBeat(beat);
      animFrameRef.current = requestAnimationFrame(updateBeat);
    };
    updateBeat();
  }, [loadTone]);

  const stop = useCallback(async () => {
    const Tone = await loadTone();
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    setIsPlaying(false);
    setCurrentBeat(0);
    cancelAnimationFrame(animFrameRef.current);
  }, [loadTone]);

  const seek = useCallback(
    async (beat: number) => {
      const Tone = await loadTone();
      const seconds = (beat / Tone.getTransport().bpm.value) * 60;
      Tone.getTransport().seconds = seconds;
      setCurrentBeat(beat);
    },
    [loadTone]
  );

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (synthRef.current) {
        (synthRef.current as { dispose: () => void }).dispose();
      }
    };
  }, []);

  return {
    isPlaying,
    currentBeat,
    isLooping,
    playNotes,
    pause,
    resume,
    stop,
    seek,
    toggleLoop,
  };
}
