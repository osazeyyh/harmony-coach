/**
 * Key signature display utilities.
 * Converts a Key to human-readable info about sharps/flats.
 */

import type { Key } from "@/types/music";

const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];

const MAJOR_FIFTHS: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6,
  F: -1, "A#": -2, "D#": -3, "G#": -4, "C#": -5,
};

const MINOR_FIFTHS: Record<string, number> = {
  A: 0, E: 1, B: 2, "F#": 3, "C#": 4, "G#": 5,
  D: -1, G: -2, C: -3, F: -4, "A#": -5, "D#": -6,
};

export interface KeySignatureInfo {
  fifths: number;
  type: "sharps" | "flats" | "none";
  count: number;
  noteNames: string[];
  display: string;
  shortDisplay: string;
}

/**
 * Get display info for a key signature.
 * e.g. D Major → { type: "sharps", count: 2, noteNames: ["F#", "C#"], display: "2♯: F#, C#" }
 */
export function getKeySignatureInfo(key: Key): KeySignatureInfo {
  const fifths = key.mode === "minor"
    ? (MINOR_FIFTHS[key.tonic] ?? 0)
    : (MAJOR_FIFTHS[key.tonic] ?? 0);

  if (fifths === 0) {
    return {
      fifths: 0,
      type: "none",
      count: 0,
      noteNames: [],
      display: "No sharps or flats",
      shortDisplay: "",
    };
  }

  if (fifths > 0) {
    const names = SHARP_ORDER.slice(0, fifths).map((n) => `${n}#`);
    return {
      fifths,
      type: "sharps",
      count: fifths,
      noteNames: names,
      display: `${fifths}\u266F: ${names.join(", ")}`,
      shortDisplay: `${fifths}\u266F`,
    };
  }

  // fifths < 0
  const count = Math.abs(fifths);
  const names = FLAT_ORDER.slice(0, count).map((n) => `${n}\u266D`);
  return {
    fifths,
    type: "flats",
    count,
    noteNames: names,
    display: `${count}\u266D: ${names.join(", ")}`,
    shortDisplay: `${count}\u266D`,
  };
}
