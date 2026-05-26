import { create } from 'zustand';
import type { NeoEnhancerMode, NeoEnhancerSettings, NeoOutputProfile } from '../types';
import { clamp01 } from '../lib/neoEnhancerPresets';

const KEY = 'neo-audio-enhancer-settings';

const defaults: NeoEnhancerSettings = {
  enabled: false,
  mode: 'off',
  outputProfile: 'headphones',
  intensity: 0.6,
  bass: 0.5,
  clarity: 0.5,
  spatial: 0.3,
  loudness: 0.5,
  limiter: true,
  safeGain: true,
};

const safeLocalStorage = {
  get: () => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  },
  set: (v: string) => {
    try { localStorage.setItem(KEY, v); } catch { /* noop */ }
  },
};

interface State {
  settings: NeoEnhancerSettings;
  compareA: NeoEnhancerSettings | null;
  compareB: NeoEnhancerSettings | null;
  activeCompareSlot: 'A' | 'B';
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: NeoEnhancerMode) => void;
  setOutputProfile: (profile: NeoOutputProfile) => void;
  setIntensity: (value: number) => void;
  setBass: (value: number) => void;
  setClarity: (value: number) => void;
  setSpatial: (value: number) => void;
  setLoudness: (value: number) => void;
  setLimiter: (enabled: boolean) => void;
  setSafeGain: (enabled: boolean) => void;
  resetEnhancer: () => void;
  captureA: () => void;
  captureB: () => void;
  applyA: () => void;
  applyB: () => void;
  swapAB: () => void;
  clearAB: () => void;
  load: () => void;
  save: () => void;
}

const update = (state: NeoEnhancerSettings, patch: Partial<NeoEnhancerSettings>): NeoEnhancerSettings => ({ ...state, ...patch });

export const useAudioEnhancerStore = create<State>((set, get) => ({
  settings: defaults,
  compareA: null,
  compareB: null,
  activeCompareSlot: 'A',
  setEnabled: (enabled) => set((s) => ({ settings: update(s.settings, { enabled }) })),
  setMode: (mode) => set((s) => ({ settings: update(s.settings, { mode, enabled: mode !== 'off' ? true : s.settings.enabled }) })),
  setOutputProfile: (outputProfile) => set((s) => ({ settings: update(s.settings, { outputProfile }) })),
  setIntensity: (intensity) => set((s) => ({ settings: update(s.settings, { intensity: clamp01(intensity) }) })),
  setBass: (bass) => set((s) => ({ settings: update(s.settings, { bass: clamp01(bass) }) })),
  setClarity: (clarity) => set((s) => ({ settings: update(s.settings, { clarity: clamp01(clarity) }) })),
  setSpatial: (spatial) => set((s) => ({ settings: update(s.settings, { spatial: clamp01(spatial) }) })),
  setLoudness: (loudness) => set((s) => ({ settings: update(s.settings, { loudness: clamp01(loudness) }) })),
  setLimiter: (limiter) => set((s) => ({ settings: update(s.settings, { limiter }) })),
  setSafeGain: (safeGain) => set((s) => ({ settings: update(s.settings, { safeGain }) })),
  resetEnhancer: () => set({ settings: defaults }),
  captureA: () => set((s) => ({ compareA: { ...s.settings }, activeCompareSlot: 'A' })),
  captureB: () => set((s) => ({ compareB: { ...s.settings }, activeCompareSlot: 'B' })),
  applyA: () => set((s) => s.compareA ? ({ settings: { ...s.compareA }, activeCompareSlot: 'A' }) : s),
  applyB: () => set((s) => s.compareB ? ({ settings: { ...s.compareB }, activeCompareSlot: 'B' }) : s),
  swapAB: () => set((s) => ({ compareA: s.compareB, compareB: s.compareA })),
  clearAB: () => set({ compareA: null, compareB: null, activeCompareSlot: 'A' }),
  load: () => {
    const raw = safeLocalStorage.get();
    if (!raw) return;
    try { set({ settings: { ...defaults, ...JSON.parse(raw) } }); } catch { /* noop */ }
  },
  save: () => safeLocalStorage.set(JSON.stringify(get().settings)),
}));

useAudioEnhancerStore.getState().load();
useAudioEnhancerStore.subscribe((state) => state.save());
