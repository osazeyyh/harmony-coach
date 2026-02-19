// Core musical data types used across the application

export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type NoteNameWithFlats = NoteName | 'Db' | 'Eb' | 'Gb' | 'Ab' | 'Bb';

export interface Note {
  name: NoteName;
  octave: number;
  midiNumber: number;
  frequency: number;
  duration: number;      // in beats
  startBeat: number;     // position in the measure/song
}

export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented' | 'dominant7' | 'major7' | 'minor7' | 'diminished7' | 'half-diminished7' | 'sus2' | 'sus4';

export interface Chord {
  root: NoteName;
  quality: ChordQuality;
  symbol: string;        // e.g., "Am7", "Cmaj7"
  notes: NoteName[];     // pitch classes in the chord
  startBeat: number;
  duration: number;      // in beats
}

export type KeyMode = 'major' | 'minor';

export interface Key {
  tonic: NoteName;
  mode: KeyMode;
  label: string;         // e.g., "C major", "A minor"
}

export type RomanNumeral = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' |
  'i' | 'ii' | 'iii' | 'iv' | 'v' | 'vi' | 'vii';

export interface ChordWithFunction extends Chord {
  romanNumeral: string;  // e.g., "I", "iv", "V7", "ii°"
}

export interface MelodyNote extends Note {
  chordTone?: 'root' | 'third' | 'fifth' | 'seventh' | 'non-chord';
  confidence?: number;   // 0-1, how confident the detection is
}

export interface HarmonyLine {
  id: string;
  partName: string;      // e.g., "Harmony Above", "Harmony Below", "Bass"
  voiceType: 'soprano' | 'alto' | 'tenor' | 'bass';
  notes: Note[];
}

export interface ChordProgression {
  key: Key;
  chords: ChordWithFunction[];
  timeSignature: [number, number]; // [beats per measure, beat unit]
  tempo: number;                    // BPM
}

export interface AnalysisResult {
  id: string;
  songTitle: string;
  sourceType: 'audio' | 'sheet' | 'midi' | 'musicxml';
  key: Key;
  tempo: number;
  timeSignature: [number, number];
  melody: MelodyNote[];
  chords: ChordWithFunction[];
  harmonyLines: HarmonyLine[];
  musicXml?: string;     // Generated or parsed MusicXML
  createdAt: string;
}

export interface PitchFrame {
  frequency: number;
  clarity: number;       // 0-1 confidence
  note: NoteName | null;
  octave: number | null;
  centsOff: number;      // cents deviation from nearest note
  timestamp: number;     // ms from start
}

export interface PracticeResult {
  songId: string;
  part: 'melody' | 'harmony1' | 'harmony2' | 'harmony3';
  pitchAccuracy: number;   // 0-100
  rhythmAccuracy: number;  // 0-100
  completion: number;      // 0-100
  durationSeconds: number;
  barFeedback: BarFeedback[];
}

export interface BarFeedback {
  barNumber: number;
  pitchAccuracy: number;
  rhythmAccuracy: number;
  status: 'correct' | 'close' | 'off';
  message?: string;
}

export type SourceType = 'audio' | 'sheet' | 'midi' | 'musicxml';
