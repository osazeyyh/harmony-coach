import { create } from "zustand";
import type { AnalysisResult, HarmonyLine, PracticeResult } from "@/types/music";

interface SessionState {
  // Current analysis
  currentAnalysis: AnalysisResult | null;
  setAnalysis: (analysis: AnalysisResult | null) => void;

  // Generated harmony lines
  harmonyLines: HarmonyLine[];
  setHarmonyLines: (lines: HarmonyLine[]) => void;

  // Practice history (local, before saving to DB)
  practiceResults: PracticeResult[];
  addPracticeResult: (result: PracticeResult) => void;

  // Notation mode
  notationMode: "standard" | "solfege";
  setNotationMode: (mode: "standard" | "solfege") => void;

  // Visualization mode: piano keyboard vs. technical piano roll
  visualizationMode: "keyboard" | "pianoroll";
  setVisualizationMode: (mode: "keyboard" | "pianoroll") => void;

  // Reset
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentAnalysis: null,
  setAnalysis: (analysis) => set({ currentAnalysis: analysis }),

  harmonyLines: [],
  setHarmonyLines: (lines) => set({ harmonyLines: lines }),

  practiceResults: [],
  addPracticeResult: (result) =>
    set((state) => ({
      practiceResults: [...state.practiceResults, result],
    })),

  notationMode: "solfege",
  setNotationMode: (mode) => set({ notationMode: mode }),

  visualizationMode: "keyboard",
  setVisualizationMode: (mode) => set({ visualizationMode: mode }),

  reset: () =>
    set({
      currentAnalysis: null,
      harmonyLines: [],
      practiceResults: [],
    }),
}));
