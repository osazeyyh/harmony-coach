/**
 * Score Builder: generates MusicXML from analysis data.
 * Used to create renderable notation from detected/generated music.
 */

import type { Note, Key, ChordWithFunction } from "@/types/music";
import { NOTE_NAMES } from "@/lib/utils/music-utils";

// MusicXML step names (no sharps/flats in step, use alter)
const MIDI_TO_STEP: Array<[string, number]> = [
  ["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0],
  ["F", 0], ["F", 1], ["G", 0], ["G", 1], ["A", 0],
  ["A", 1], ["B", 0],
];

interface BuildScoreOptions {
  title?: string;
  key?: Key;
  tempo?: number;
  timeSignature?: [number, number];
  divisions?: number;
}

/**
 * Build a simple MusicXML document from notes.
 */
export function buildMusicXML(
  melodyNotes: Note[],
  options: BuildScoreOptions = {},
  harmonyNotes?: Note[]
): string {
  const {
    title = "Generated Score",
    key,
    tempo = 120,
    timeSignature = [4, 4],
    divisions = 4,
  } = options;

  const [beats, beatType] = timeSignature;
  const divisionsPerBeat = divisions;
  const divisionsPerMeasure = beats * divisionsPerBeat * (4 / beatType);

  // Group notes into measures
  const melodyMeasures = groupNotesIntoMeasures(melodyNotes, divisionsPerMeasure, divisionsPerBeat);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>`;

  if (harmonyNotes && harmonyNotes.length > 0) {
    xml += `\n    <score-part id="P2"><part-name>Harmony</part-name></score-part>`;
  }

  xml += `\n  </part-list>
  <part id="P1">`;

  // Build melody measures
  for (let m = 0; m < melodyMeasures.length; m++) {
    xml += `\n    <measure number="${m + 1}">`;

    if (m === 0) {
      xml += buildAttributes(divisions, key, timeSignature);
      xml += buildDirection(tempo);
    }

    for (const note of melodyMeasures[m]) {
      xml += buildNoteXml(note, divisionsPerBeat);
    }

    xml += `\n    </measure>`;
  }

  xml += `\n  </part>`;

  // Build harmony part if provided
  if (harmonyNotes && harmonyNotes.length > 0) {
    const harmonyMeasures = groupNotesIntoMeasures(harmonyNotes, divisionsPerMeasure, divisionsPerBeat);
    xml += `\n  <part id="P2">`;

    for (let m = 0; m < harmonyMeasures.length; m++) {
      xml += `\n    <measure number="${m + 1}">`;
      if (m === 0) {
        xml += buildAttributes(divisions, key, timeSignature);
      }
      for (const note of harmonyMeasures[m]) {
        xml += buildNoteXml(note, divisionsPerBeat);
      }
      xml += `\n    </measure>`;
    }

    xml += `\n  </part>`;
  }

  xml += `\n</score-partwise>`;
  return xml;
}

function groupNotesIntoMeasures(
  notes: Note[],
  divisionsPerMeasure: number,
  divisionsPerBeat: number
): Note[][] {
  if (notes.length === 0) return [[]];

  const lastNote = notes[notes.length - 1];
  const totalBeats = lastNote.startBeat + lastNote.duration;
  const beatsPerMeasure = divisionsPerMeasure / divisionsPerBeat;
  const numMeasures = Math.max(1, Math.ceil(totalBeats / beatsPerMeasure));

  const measures: Note[][] = Array.from({ length: numMeasures }, () => []);

  for (const note of notes) {
    const measureIndex = Math.floor(note.startBeat / beatsPerMeasure);
    if (measureIndex < numMeasures) {
      measures[measureIndex].push(note);
    }
  }

  return measures;
}

function buildAttributes(
  divisions: number,
  key?: Key,
  timeSignature?: [number, number]
): string {
  const fifths = key ? keyToFifths(key) : 0;
  const mode = key?.mode || "major";
  const [beats, beatType] = timeSignature || [4, 4];

  return `
      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>${fifths}</fifths><mode>${mode}</mode></key>
        <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>`;
}

function buildDirection(tempo: number): string {
  return `
      <direction placement="above">
        <direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type>
        <sound tempo="${tempo}"/>
      </direction>`;
}

function buildNoteXml(note: Note, divisionsPerBeat: number): string {
  const durationDivisions = Math.max(1, Math.round(note.duration * divisionsPerBeat));
  const [step, alter] = midiToStepAlter(note.midiNumber);
  const octave = Math.floor(note.midiNumber / 12) - 1;
  const type = durationToType(note.duration);

  let xml = `
      <note>
        <pitch>
          <step>${step}</step>`;
  if (alter !== 0) {
    xml += `\n          <alter>${alter}</alter>`;
  }
  xml += `
          <octave>${octave}</octave>
        </pitch>
        <duration>${durationDivisions}</duration>
        <type>${type}</type>
      </note>`;

  return xml;
}

function midiToStepAlter(midi: number): [string, number] {
  const noteIndex = ((midi % 12) + 12) % 12;
  return MIDI_TO_STEP[noteIndex];
}

function durationToType(beats: number): string {
  if (beats >= 4) return "whole";
  if (beats >= 2) return "half";
  if (beats >= 1) return "quarter";
  if (beats >= 0.5) return "eighth";
  if (beats >= 0.25) return "16th";
  return "32nd";
}

function keyToFifths(key: Key): number {
  const majorFifths: Record<string, number> = {
    C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6,
    F: -1, "A#": -2, "D#": -3, "G#": -4, "C#": -5,
  };
  const minorFifths: Record<string, number> = {
    A: 0, E: 1, B: 2, "F#": 3, "C#": 4, "G#": 5,
    D: -1, G: -2, C: -3, F: -4, "A#": -5, "D#": -6,
  };

  if (key.mode === "minor") {
    return minorFifths[key.tonic] ?? 0;
  }
  return majorFifths[key.tonic] ?? 0;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
