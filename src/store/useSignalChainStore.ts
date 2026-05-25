import { create } from 'zustand';
import { SignalModuleConfig, SignalModuleId } from '../types/signalChain';

const STORAGE_KEY = 'neo-signal-chain-state';

const MODULE_IDS: SignalModuleId[] = ['eq', 'bass', 'spatial', 'compressor', 'limiter', 'night', 'vocal'];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const defaultModules = (): Record<SignalModuleId, SignalModuleConfig> => ({
  eq: { id: 'eq', enabled: true, intensity: 1 },
  bass: { id: 'bass', enabled: false, intensity: 0.5 },
  spatial: { id: 'spatial', enabled: false, intensity: 0.3 },
  compressor: { id: 'compressor', enabled: false, intensity: 0.5 },
  limiter: { id: 'limiter', enabled: true, intensity: 0.7 },
  night: { id: 'night', enabled: false, intensity: 0.5 },
  vocal: { id: 'vocal', enabled: false, intensity: 0.5 },
});

const presets: Record<string, { modules: Partial<Record<SignalModuleId, Partial<SignalModuleConfig>>>; outputGain?: number; clippingProtection?: boolean }> = {
  clean: {
    modules: {
      eq: { enabled: true, intensity: 1 },
      bass: { enabled: false, intensity: 0.5 },
      spatial: { enabled: false, intensity: 0.3 },
      compressor: { enabled: false, intensity: 0.4 },
      limiter: { enabled: true, intensity: 0.7 },
      night: { enabled: false, intensity: 0.5 },
      vocal: { enabled: false, intensity: 0.5 },
    },
    outputGain: 1,
    clippingProtection: true,
  },
  'bass-reactor': {
    modules: { bass: { enabled: true, intensity: 0.85 }, compressor: { enabled: true, intensity: 0.45 }, limiter: { enabled: true, intensity: 0.8 } },
    outputGain: 0.95,
    clippingProtection: true,
  },
  'night-drive': {
    modules: { night: { enabled: true, intensity: 0.65 }, compressor: { enabled: true, intensity: 0.55 }, limiter: { enabled: true, intensity: 0.85 }, spatial: { enabled: true, intensity: 0.25 } },
    outputGain: 0.9,
    clippingProtection: true,
  },
  'vocal-focus': {
    modules: { vocal: { enabled: true, intensity: 0.75 }, bass: { enabled: false, intensity: 0.35 }, compressor: { enabled: true, intensity: 0.45 }, limiter: { enabled: true, intensity: 0.75 } },
    outputGain: 1,
    clippingProtection: true,
  },
  'safe-loud': {
    modules: { compressor: { enabled: true, intensity: 0.8 }, limiter: { enabled: true, intensity: 1 }, bass: { enabled: false, intensity: 0.45 } },
    outputGain: 1.05,
    clippingProtection: true,
  },
  'wide-space': {
    modules: { spatial: { enabled: true, intensity: 0.8 }, compressor: { enabled: true, intensity: 0.35 }, limiter: { enabled: true, intensity: 0.7 } },
    outputGain: 1,
    clippingProtection: true,
  },
};

interface SignalChainStore {
  modules: Record<SignalModuleId, SignalModuleConfig>;
  outputGain: number;
  clippingProtection: boolean;
  activePreset: string | null;
  estimatedPeak: number;
  clippingWarning: boolean;
  toggleModule: (id: SignalModuleId) => void;
  setModuleEnabled: (id: SignalModuleId, enabled: boolean) => void;
  setModuleIntensity: (id: SignalModuleId, intensity: number) => void;
  setOutputGain: (value: number) => void;
  setClippingProtection: (enabled: boolean) => void;
  setEstimatedPeak: (peak: number) => void;
  resetSignalChain: () => void;
  applySignalChainPreset: (presetId: string) => void;
  saveSignalChainState: () => void;
  loadSignalChainState: () => void;
}

const readPersisted = () => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const sanitizeModules = (raw: unknown): Record<SignalModuleId, SignalModuleConfig> => {
  const defaults = defaultModules();
  const input = raw && typeof raw === 'object' ? raw as Partial<Record<SignalModuleId, Partial<SignalModuleConfig>>> : {};
  for (const id of MODULE_IDS) {
    defaults[id] = {
      id,
      enabled: typeof input[id]?.enabled === 'boolean' ? input[id]!.enabled! : defaults[id].enabled,
      intensity: clamp(typeof input[id]?.intensity === 'number' ? input[id]!.intensity! : defaults[id].intensity),
    };
  }
  return defaults;
};

const initial = readPersisted();

export const useSignalChainStore = create<SignalChainStore>((set, get) => ({
  modules: sanitizeModules(initial?.modules),
  outputGain: clamp(typeof initial?.outputGain === 'number' ? initial.outputGain : 1, 0, 1.25),
  clippingProtection: typeof initial?.clippingProtection === 'boolean' ? initial.clippingProtection : true,
  activePreset: typeof initial?.activePreset === 'string' ? initial.activePreset : null,
  estimatedPeak: 0,
  clippingWarning: false,

  toggleModule: (id) => set((state) => ({
    activePreset: null,
    modules: { ...state.modules, [id]: { ...state.modules[id], enabled: !state.modules[id].enabled } },
  })),

  setModuleEnabled: (id, enabled) => set((state) => ({
    activePreset: null,
    modules: { ...state.modules, [id]: { ...state.modules[id], enabled } },
  })),

  setModuleIntensity: (id, intensity) => set((state) => ({
    activePreset: null,
    modules: { ...state.modules, [id]: { ...state.modules[id], intensity: clamp(intensity) } },
  })),

  setOutputGain: (outputGain) => set({ outputGain: clamp(outputGain, 0, 1.25), activePreset: null }),
  setClippingProtection: (clippingProtection) => set({ clippingProtection, activePreset: null }),
  setEstimatedPeak: (estimatedPeak) => set({ estimatedPeak: clamp(estimatedPeak, 0, 1.5), clippingWarning: estimatedPeak >= 0.96 }),

  resetSignalChain: () => set({ modules: defaultModules(), outputGain: 1, clippingProtection: true, activePreset: null, estimatedPeak: 0, clippingWarning: false }),

  applySignalChainPreset: (presetId) => {
    const preset = presets[presetId];
    if (!preset) return;
    set((state) => {
      const modules = sanitizeModules(state.modules);
      for (const id of MODULE_IDS) {
        const patch = preset.modules[id];
        if (!patch) continue;
        modules[id] = { ...modules[id], ...patch, id, intensity: clamp(patch.intensity ?? modules[id].intensity) };
      }
      return {
        modules,
        outputGain: clamp(preset.outputGain ?? state.outputGain, 0, 1.25),
        clippingProtection: preset.clippingProtection ?? state.clippingProtection,
        activePreset: presetId,
      };
    });
  },

  saveSignalChainState: () => {
    if (typeof localStorage === 'undefined') return;
    const { modules, outputGain, clippingProtection, activePreset } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ modules, outputGain, clippingProtection, activePreset }));
  },

  loadSignalChainState: () => {
    const persisted = readPersisted();
    if (!persisted) return;
    set({
      modules: sanitizeModules(persisted.modules),
      outputGain: clamp(typeof persisted.outputGain === 'number' ? persisted.outputGain : 1, 0, 1.25),
      clippingProtection: typeof persisted.clippingProtection === 'boolean' ? persisted.clippingProtection : true,
      activePreset: typeof persisted.activePreset === 'string' ? persisted.activePreset : null,
    });
  },
}));

export const SIGNAL_CHAIN_PRESETS = [
  { id: 'clean', name: 'Clean' },
  { id: 'bass-reactor', name: 'Bass Reactor' },
  { id: 'night-drive', name: 'Night Drive' },
  { id: 'vocal-focus', name: 'Vocal Focus' },
  { id: 'safe-loud', name: 'Safe Loud' },
  { id: 'wide-space', name: 'Wide Space' },
];

