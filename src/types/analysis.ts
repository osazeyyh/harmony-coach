import type { AnalysisResult, PracticeResult } from './music';

// Database row types (matching Supabase schema)

export interface ProfileRow {
  id: string;
  display_name: string | null;
  role: 'student' | 'teacher';
  created_at: string;
}

export interface SongRow {
  id: string;
  user_id: string;
  title: string;
  source_type: 'audio' | 'sheet' | 'midi' | 'musicxml';
  file_url: string | null;
  key: string | null;
  tempo: number | null;
  time_signature: string | null;
  analysis_data: AnalysisResult | null;
  musicxml_data: string | null;
  created_at: string;
}

export interface PracticeSessionRow {
  id: string;
  user_id: string;
  song_id: string;
  part: 'melody' | 'harmony1' | 'harmony2' | 'harmony3';
  pitch_accuracy: number | null;
  rhythm_accuracy: number | null;
  completion: number | null;
  duration_seconds: number | null;
  feedback_data: PracticeResult | null;
  recorded_audio_url: string | null;
  created_at: string;
}

export interface HarmonyLineRow {
  id: string;
  song_id: string;
  part_name: string;
  notes_data: Array<{ pitch: number; duration: number; startBeat: number }>;
  voice_type: string | null;
  created_at: string;
}

// Analysis pipeline types

export interface AudioAnalysisInput {
  audioBuffer: AudioBuffer;
  sampleRate: number;
}

export interface PitchDetectionResult {
  frames: Array<{
    frequency: number;
    clarity: number;
    timestamp: number;
  }>;
  sampleRate: number;
}

export interface ChromaVector {
  bins: Float32Array; // 12 bins, one per pitch class C through B
  timestamp: number;
}

export interface ChordRecognitionResult {
  chordName: string;
  root: string;
  quality: string;
  confidence: number;
  startTime: number;
  endTime: number;
}

export interface KeyDetectionResult {
  key: string;
  mode: 'major' | 'minor';
  confidence: number;
  correlations: Record<string, number>;
}
