import { create } from 'zustand';

export type AnalyzerMode = 'spectrum' | 'waveform' | 'stereo' | 'reactor';

interface AnalyzerState {
  isAnalyzerOpen: boolean;
  analyzerMode: AnalyzerMode;
  setAnalyzerOpen: (open: boolean) => void;
  toggleAnalyzer: () => void;
  setAnalyzerMode: (mode: AnalyzerMode) => void;
}

export const useAnalyzerStore = create<AnalyzerState>((set) => ({
  isAnalyzerOpen: false,
  analyzerMode: 'spectrum',
  setAnalyzerOpen: (open) => set({ isAnalyzerOpen: open }),
  toggleAnalyzer: () => set((state) => ({ isAnalyzerOpen: !state.isAnalyzerOpen })),
  setAnalyzerMode: (mode) => set({ analyzerMode: mode }),
}));
