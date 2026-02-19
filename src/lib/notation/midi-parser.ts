/**
 * MIDI parser: wraps midi-json-parser to extract melody and note data.
 */

import type { Note, NoteName, Key } from "@/types/music";
import { NOTE_NAMES, midiToFrequency, midiToNote } from "@/lib/utils/music-utils";
import { detectKey, buildPitchClassHistogram } from "@/lib/audio/key-detector";
import type { PitchFrame } from "@/types/music";

// midi-json-parser types
interface MidiNote {
  noteOn: { noteNumber: number; velocity: number };
  noteOff?: { noteNumber: number; velocity: number };
  delta: number;
}

interface MidiTrack {
  [index: number]: MidiNoteEvent | MidiMetaEvent | MidiControlEvent;
}

interface MidiNoteEvent {
  noteOn?: { noteNumber: number; velocity: number };
  noteOff?: { noteNumber: number; velocity: number };
  delta: number;
}

interface MidiMetaEvent {
  setTempo?: { microsecondsPerBeat: number };
  timeSignature?: { numerator: number; denominator: number };
  delta: number;
}

interface MidiControlEvent {
  delta: number;
}

interface MidiJson {
  division: number;  // ticks per quarter note
  format: number;
  tracks: Array<Array<Record<string, unknown>>>;
}

export interface ParsedMidiData {
  notes: Note[];
  tempo: number;
  timeSignature: [number, number];
  key: Key;
  ticksPerBeat: number;
  totalBeats: number;
}

/**
 * Parse a MIDI file (ArrayBuffer) into structured note data.
 */
export async function parseMidiFile(arrayBuffer: ArrayBuffer): Promise<ParsedMidiData> {
  // Dynamic import to avoid SSR issues
  const { parseArrayBuffer } = await import("midi-json-parser");
  const midiJson = await parseArrayBuffer(arrayBuffer) as MidiJson;

  const ticksPerBeat = midiJson.division;
  let tempo = 120; // default BPM
  let timeSignature: [number, number] = [4, 4];

  // Extract tempo and time signature from first track (usually conductor track)
  const allTracks = midiJson.tracks;
  for (const track of allTracks) {
    for (const event of track) {
      const ev = event as Record<string, unknown>;
      if (ev.setTempo) {
        const st = ev.setTempo as { microsecondsPerBeat: number };
        tempo = Math.round(60_000_000 / st.microsecondsPerBeat);
      }
      if (ev.timeSignature) {
        const ts = ev.timeSignature as { numerator: number; denominator: number };
        timeSignature = [ts.numerator, Math.pow(2, ts.denominator)];
      }
    }
  }

  // Extract notes from all tracks
  const notes: Note[] = [];
  const activeNotes: Map<number, { startTick: number; velocity: number }> = new Map();

  for (const track of allTracks) {
    let currentTick = 0;
    activeNotes.clear();

    for (const event of track) {
      const ev = event as Record<string, unknown>;
      const delta = (ev.delta as number) || 0;
      currentTick += delta;

      // Note on
      if (ev.noteOn) {
        const noteOn = ev.noteOn as { noteNumber: number; velocity: number };
        if (noteOn.velocity > 0) {
          activeNotes.set(noteOn.noteNumber, {
            startTick: currentTick,
            velocity: noteOn.velocity,
          });
        } else {
          // velocity 0 = note off
          finishNote(noteOn.noteNumber, currentTick);
        }
      }

      // Note off
      if (ev.noteOff) {
        const noteOff = ev.noteOff as { noteNumber: number };
        finishNote(noteOff.noteNumber, currentTick);
      }
    }

    function finishNote(midiNumber: number, endTick: number) {
      const active = activeNotes.get(midiNumber);
      if (!active) return;
      activeNotes.delete(midiNumber);

      const startBeat = active.startTick / ticksPerBeat;
      const durationBeats = (endTick - active.startTick) / ticksPerBeat;
      if (durationBeats <= 0) return;

      const { name, octave } = midiToNote(midiNumber);

      notes.push({
        name,
        octave,
        midiNumber,
        frequency: midiToFrequency(midiNumber),
        duration: durationBeats,
        startBeat,
      });
    }
  }

  // Sort by start time, then pitch (highest first for melody extraction)
  notes.sort((a, b) => a.startBeat - b.startBeat || b.midiNumber - a.midiNumber);

  // Detect key from note distribution
  const pitchFrames: PitchFrame[] = notes.map((n) => ({
    frequency: n.frequency,
    clarity: 1,
    note: n.name,
    octave: n.octave,
    centsOff: 0,
    timestamp: n.startBeat * (60000 / tempo),
  }));

  const histogram = buildPitchClassHistogram(pitchFrames);
  const keyResult = detectKey(histogram);

  // Calculate total beats
  const lastNote = notes[notes.length - 1];
  const totalBeats = lastNote ? lastNote.startBeat + lastNote.duration : 0;

  return {
    notes,
    tempo,
    timeSignature,
    key: keyResult.key,
    ticksPerBeat,
    totalBeats,
  };
}

/**
 * Extract the top melody line from MIDI notes
 * (highest note at each time position).
 */
export function extractMelodyFromMidi(notes: Note[]): Note[] {
  // Group notes by approximate start beat (within 0.1 beat)
  const groups: Map<number, Note[]> = new Map();
  const quantize = 0.125; // 32nd note resolution

  for (const note of notes) {
    const key = Math.round(note.startBeat / quantize) * quantize;
    const group = groups.get(key) || [];
    group.push(note);
    groups.set(key, group);
  }

  // Take highest pitch from each group
  const melody: Note[] = [];
  for (const [, group] of groups) {
    group.sort((a, b) => b.midiNumber - a.midiNumber);
    melody.push(group[0]);
  }

  return melody.sort((a, b) => a.startBeat - b.startBeat);
}
