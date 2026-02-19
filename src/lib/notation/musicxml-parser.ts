/**
 * MusicXML parser: extracts structured musical data from MusicXML content.
 * Parses notes, measures, time signatures, key signatures, and chords.
 */

import type { NoteName, Note, Key, Chord, ChordQuality } from "@/types/music";
import { NOTE_NAMES, noteToMidi, midiToFrequency } from "@/lib/utils/music-utils";

export interface ParsedMeasure {
  number: number;
  notes: ParsedNote[];
  timeSignature?: [number, number];
  keySignature?: { fifths: number; mode: string };
  tempo?: number;
}

export interface ParsedNote {
  pitch: { step: string; octave: number; alter?: number };
  duration: number;       // in divisions
  type: string;           // "quarter", "eighth", etc.
  voice: number;
  staff: number;
  isRest: boolean;
  isChord: boolean;       // belongs to a chord (simultaneous)
  startDivision: number;  // position within measure
}

export interface ParsedScore {
  title: string;
  measures: ParsedMeasure[];
  divisions: number;       // divisions per quarter note
  key: Key;
  timeSignature: [number, number];
  tempo: number;
  parts: number;
}

/**
 * Parse a MusicXML string into structured data.
 */
export function parseMusicXML(xmlContent: string): ParsedScore {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "application/xml");

  // Get title
  const title =
    doc.querySelector("work-title")?.textContent ||
    doc.querySelector("movement-title")?.textContent ||
    "Untitled";

  // Get divisions (ticks per quarter note)
  const divisionsEl = doc.querySelector("attributes divisions");
  const divisions = divisionsEl ? parseInt(divisionsEl.textContent || "1") : 1;

  // Get parts count
  const partList = doc.querySelectorAll("part-list score-part");
  const parts = partList.length || 1;

  // Parse first part (melody) for MVP
  const partEl = doc.querySelector("part");
  if (!partEl) {
    return {
      title,
      measures: [],
      divisions,
      key: { tonic: "C", mode: "major", label: "C major" },
      timeSignature: [4, 4],
      tempo: 120,
      parts,
    };
  }

  const measureEls = partEl.querySelectorAll("measure");
  const measures: ParsedMeasure[] = [];
  let globalKey: Key = { tonic: "C", mode: "major", label: "C major" };
  let globalTimeSig: [number, number] = [4, 4];
  let globalTempo = 120;

  measureEls.forEach((measureEl, idx) => {
    const measureNum = parseInt(measureEl.getAttribute("number") || `${idx + 1}`);
    const measure: ParsedMeasure = { number: measureNum, notes: [] };

    // Check for attributes (key, time, etc.)
    const attributesEl = measureEl.querySelector("attributes");
    if (attributesEl) {
      // Key signature
      const keyEl = attributesEl.querySelector("key");
      if (keyEl) {
        const fifths = parseInt(keyEl.querySelector("fifths")?.textContent || "0");
        const mode = keyEl.querySelector("mode")?.textContent || "major";
        globalKey = fifthsToKey(fifths, mode);
        measure.keySignature = { fifths, mode };
      }

      // Time signature
      const timeEl = attributesEl.querySelector("time");
      if (timeEl) {
        const beats = parseInt(timeEl.querySelector("beats")?.textContent || "4");
        const beatType = parseInt(timeEl.querySelector("beat-type")?.textContent || "4");
        globalTimeSig = [beats, beatType];
        measure.timeSignature = [beats, beatType];
      }
    }

    // Check for tempo in direction
    const soundEl = measureEl.querySelector("direction sound[tempo]");
    if (soundEl) {
      const tempo = parseFloat(soundEl.getAttribute("tempo") || "120");
      globalTempo = tempo;
      measure.tempo = tempo;
    }

    // Parse notes
    let currentDivision = 0;
    const noteEls = measureEl.querySelectorAll("note");
    noteEls.forEach((noteEl) => {
      const isRest = noteEl.querySelector("rest") !== null;
      const isChord = noteEl.querySelector("chord") !== null;
      const durationEl = noteEl.querySelector("duration");
      const duration = durationEl ? parseInt(durationEl.textContent || "1") : 1;
      const typeEl = noteEl.querySelector("type");
      const type = typeEl?.textContent || "quarter";
      const voiceEl = noteEl.querySelector("voice");
      const voice = voiceEl ? parseInt(voiceEl.textContent || "1") : 1;
      const staffEl = noteEl.querySelector("staff");
      const staff = staffEl ? parseInt(staffEl.textContent || "1") : 1;

      let pitch = { step: "C", octave: 4, alter: 0 };
      if (!isRest) {
        const pitchEl = noteEl.querySelector("pitch");
        if (pitchEl) {
          const step = pitchEl.querySelector("step")?.textContent || "C";
          const octave = parseInt(pitchEl.querySelector("octave")?.textContent || "4");
          const alter = parseInt(pitchEl.querySelector("alter")?.textContent || "0");
          pitch = { step, octave, alter };
        }
      }

      if (!isChord) {
        currentDivision += duration;
      }

      measure.notes.push({
        pitch,
        duration,
        type,
        voice,
        staff,
        isRest,
        isChord,
        startDivision: isChord ? currentDivision - duration : currentDivision - duration,
      });
    });

    measures.push(measure);
  });

  return {
    title,
    measures,
    divisions,
    key: globalKey,
    timeSignature: globalTimeSig,
    tempo: globalTempo,
    parts,
  };
}

/**
 * Convert parsed notes to our Note type with beat positions.
 */
export function parsedNotesToNotes(
  score: ParsedScore
): Note[] {
  const notes: Note[] = [];
  const divisionsPerBeat = score.divisions; // divisions per quarter note
  let measureStartBeat = 0;

  for (const measure of score.measures) {
    const beatsPerMeasure = (score.timeSignature[0] * 4) / score.timeSignature[1];

    for (const parsedNote of measure.notes) {
      if (parsedNote.isRest) continue;

      const noteName = stepAlterToNoteName(
        parsedNote.pitch.step,
        parsedNote.pitch.alter || 0
      );
      const octave = parsedNote.pitch.octave;
      const midi = noteToMidi(noteName, octave);
      const durationInBeats = parsedNote.duration / divisionsPerBeat;
      const startBeat = measureStartBeat + parsedNote.startDivision / divisionsPerBeat;

      notes.push({
        name: noteName,
        octave,
        midiNumber: midi,
        frequency: midiToFrequency(midi),
        duration: durationInBeats,
        startBeat,
      });
    }

    const beatsInMeasure = (score.timeSignature[0] * 4) / score.timeSignature[1];
    measureStartBeat += beatsInMeasure;
  }

  return notes;
}

/**
 * Convert key signature fifths to our Key type.
 */
function fifthsToKey(fifths: number, mode: string): Key {
  const majorKeys: NoteName[] = [
    "C", "G", "D", "A", "E", "B", "F#",
  ];
  const majorFlats: NoteName[] = [
    "C", "F", "A#", "D#", "G#", "C#", "F#",
  ];

  let tonic: NoteName;
  if (fifths >= 0) {
    tonic = majorKeys[Math.min(fifths, 6)];
  } else {
    tonic = majorFlats[Math.min(Math.abs(fifths), 6)];
  }

  // If minor, shift by relative minor interval (3 semitones down)
  if (mode === "minor") {
    const idx = NOTE_NAMES.indexOf(tonic);
    tonic = NOTE_NAMES[((idx - 3) + 12) % 12];
  }

  const keyMode = mode === "minor" ? "minor" : "major";
  return {
    tonic,
    mode: keyMode as "major" | "minor",
    label: `${tonic} ${keyMode}`,
  };
}

/**
 * Convert MusicXML step + alter to our NoteName.
 */
function stepAlterToNoteName(step: string, alter: number): NoteName {
  const stepToIndex: Record<string, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  };
  const index = ((stepToIndex[step] || 0) + alter + 12) % 12;
  return NOTE_NAMES[index];
}
