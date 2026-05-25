import { create } from 'zustand';

export const BANDS = [
  { label: '32', freq: 32 },
  { label: '64', freq: 64 },
  { label: '125', freq: 125 },
  { label: '250', freq: 250 },
  { label: '500', freq: 500 },
  { label: '1K', freq: 1000 },
  { label: '2K', freq: 2000 },
  { label: '4K', freq: 4000 },
  { label: '8K', freq: 8000 },
  { label: '16K', freq: 16000 },
];

export type EqPresetCategory = 'core' | 'bass' | 'vocals' | 'night' | 'retro' | 'device' | 'custom';

export type EqPreset = {
  id: string;
  name: string;
  category: EqPresetCategory;
  bandValues: number[];
  spatial?: number;
  preamp?: number;
  isBuiltIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EqPresetSnapshot = {
  name: string;
  bandValues: number[];
  spatial: number;
  preamp?: number;
};

const CUSTOM_PRESETS_KEY = 'neo-eq-custom-presets';
const ACTIVE_PRESET_KEY = 'neo-eq-active-preset';
const LEGACY_CUSTOM_KEY = 'neo-custom-preset';

const normalizeBands = (values: number[]) => {
  const next = [...values].slice(0, BANDS.length);
  while (next.length < BANDS.length) next.push(0);
  return next;
};

export const BUILT_IN_PRESETS: EqPreset[] = [
  { id: 'flat', name: 'Flat', category: 'core', bandValues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], spatial: 0, isBuiltIn: true },
  { id: 'balanced', name: 'Balanced', category: 'core', bandValues: [1.5, 1, 0.5, 0, 0, 0.5, 1, 1, 0.5, 0], spatial: 0, isBuiltIn: true },
  { id: 'loudness', name: 'Loudness', category: 'core', bandValues: [5, 4, 2, 0, -1, 0, 2, 3, 4, 5], spatial: 0.05, isBuiltIn: true },
  { id: 'bass-boost', name: 'Bass Boost', category: 'bass', bandValues: [8, 7, 5, 2, 0, 0, 0, 0, -1, -2], spatial: 0, isBuiltIn: true },
  { id: 'deep-bass', name: 'Deep Bass', category: 'bass', bandValues: [10, 9, 6, 3, 0, -1, -1, -2, -2, -2], spatial: 0, isBuiltIn: true },
  { id: 'club', name: 'Club', category: 'bass', bandValues: [10, 8, 5, 2, 0, 0, 0, 1, 2, 2], spatial: 0.08, isBuiltIn: true },
  { id: 'vocal-clarity', name: 'Vocal Clarity', category: 'vocals', bandValues: [-2, -2, -1, 1, 4, 6, 5, 2, 0, -1], spatial: 0, isBuiltIn: true },
  { id: 'podcast', name: 'Podcast', category: 'vocals', bandValues: [-4, -3, -2, 2, 5, 6, 4, 0, -2, -4], spatial: 0, isBuiltIn: true },
  { id: 'spoken-word', name: 'Spoken Word', category: 'vocals', bandValues: [-5, -4, -2, 3, 6, 5, 3, -1, -3, -5], spatial: 0, isBuiltIn: true },
  { id: 'night-drive', name: 'Night Drive', category: 'night', bandValues: [5, 4, 0, -2, 0, 3, 5, 6, 4, 1], spatial: 0.12, isBuiltIn: true },
  { id: 'soft-night', name: 'Soft Night', category: 'night', bandValues: [2, 1, 0, -1, -1, 0, 1, 0, -2, -4], spatial: 0, isBuiltIn: true },
  { id: 'low-fatigue', name: 'Low Fatigue', category: 'night', bandValues: [1, 1, 0, 0, 1, 1, 0, -2, -5, -8], spatial: 0, isBuiltIn: true },
  { id: 'retro-synth', name: 'Retro Synth', category: 'retro', bandValues: [6, 5, 2, -2, -4, 0, 2, 4, 6, 7], spatial: 0.1, isBuiltIn: true },
  { id: 'lo-fi-tape', name: 'Lo-Fi Tape', category: 'retro', bandValues: [-2, 2, 4, 3, 1, 0, -1, -3, -7, -10], spatial: -0.05, isBuiltIn: true },
  { id: 'arcade', name: 'Arcade', category: 'retro', bandValues: [3, 2, 0, -1, 2, 4, 6, 4, 2, 0], spatial: 0.15, isBuiltIn: true },
  { id: 'headphones', name: 'Headphones', category: 'device', bandValues: [2, 1, 0, -1, 0, 1, 2, 2, 1, 0], spatial: 0, isBuiltIn: true },
  { id: 'bluetooth-speaker', name: 'Bluetooth Speaker', category: 'device', bandValues: [5, 4, 2, 0, 1, 2, 3, 2, 0, -2], spatial: 0, isBuiltIn: true },
  { id: 'phone-speaker', name: 'Phone Speaker', category: 'device', bandValues: [-8, -6, -4, 0, 4, 6, 5, 2, -1, -3], spatial: 0, isBuiltIn: true },
  { id: 'car-audio', name: 'Car Audio', category: 'device', bandValues: [6, 5, 3, 0, -1, 1, 3, 4, 3, 1], spatial: 0.05, isBuiltIn: true },
];

// Compatibility map for legacy controls/tests.
export const PRESETS: Record<string, number[]> = BUILT_IN_PRESETS.reduce<Record<string, number[]>>((acc, preset) => {
  acc[preset.name] = [...preset.bandValues];
  return acc;
}, {});
PRESETS['Club (Bass)'] = [...PRESETS['Club']];
PRESETS['Vocal'] = [...PRESETS['Vocal Clarity']];
PRESETS['Custom'] = [...PRESETS['Flat']];

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const loadPersistedCustomPresets = (): EqPreset[] => {
  const persisted = readJson<EqPreset[]>(CUSTOM_PRESETS_KEY, []);
  const valid = persisted
    .filter(preset => preset && preset.name && Array.isArray(preset.bandValues))
    .map(preset => ({
      ...preset,
      id: preset.id || `custom-${preset.name.toLowerCase().replace(/\s+/g, '-')}`,
      category: 'custom' as EqPresetCategory,
      bandValues: normalizeBands(preset.bandValues),
      isBuiltIn: false,
    }));

  if (valid.length > 0) return valid;

  const legacyBands = readJson<number[]>(LEGACY_CUSTOM_KEY, []);
  if (legacyBands.length === BANDS.length) {
    const now = new Date().toISOString();
    return [{
      id: 'custom-legacy',
      name: 'Custom',
      category: 'custom',
      bandValues: normalizeBands(legacyBands),
      spatial: 0,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    }];
  }

  return [];
};

const findPreset = (presets: EqPreset[], customPresets: EqPreset[], presetIdOrName: string) => {
  const all = [...presets, ...customPresets];
  return all.find(preset => preset.id === presetIdOrName || preset.name === presetIdOrName)
    || (presetIdOrName === 'Club (Bass)' ? all.find(preset => preset.id === 'club') : null)
    || (presetIdOrName === 'Vocal' ? all.find(preset => preset.id === 'vocal-clarity') : null);
};

interface EqualizerState {
  isOn: boolean;
  activePreset: string;
  activePresetId: string | null;
  bandValues: number[];
  spatial: number;
  presets: EqPreset[];
  customPresets: EqPreset[];
  compareA: EqPresetSnapshot | null;
  compareB: EqPresetSnapshot | null;
  activeCompareSlot: 'A' | 'B';

  setIsOn: (on: boolean) => void;
  setBandValue: (index: number, value: number) => void;
  setPreset: (presetIdOrName: string) => void;
  setSpatial: (value: number) => void;
  saveCustomPreset: (name?: string) => EqPreset | null;
  renameCustomPreset: (id: string, newName: string) => void;
  deleteCustomPreset: (id: string) => void;
  loadCustomPresets: () => void;
  resetToFlat: () => void;
  setCompareSlot: (slot: 'A' | 'B') => void;
  captureCompareA: () => void;
  captureCompareB: () => void;
  applyCompareA: () => void;
  applyCompareB: () => void;
  swapCompare: () => void;
  clearCompare: () => void;
}

const persistedCustomPresets = loadPersistedCustomPresets();
const persistedActivePreset = readJson<string | null>(ACTIVE_PRESET_KEY, null);
const initialPreset = persistedActivePreset ? findPreset(BUILT_IN_PRESETS, persistedCustomPresets, persistedActivePreset) : null;

export const useEqualizerStore = create<EqualizerState>((set, get) => ({
  isOn: true,
  activePreset: initialPreset?.name || 'Flat',
  activePresetId: initialPreset?.id || 'flat',
  bandValues: normalizeBands(initialPreset?.bandValues || PRESETS['Flat']),
  spatial: initialPreset?.spatial || 0,
  presets: BUILT_IN_PRESETS,
  customPresets: persistedCustomPresets,
  compareA: null,
  compareB: null,
  activeCompareSlot: 'A',

  setIsOn: (on) => set({ isOn: on }),

  setBandValue: (index, value) => {
    set((state) => {
      const newBands = normalizeBands(state.bandValues);
      newBands[index] = value;
      PRESETS['Custom'] = [...newBands];
      return { bandValues: newBands, activePreset: 'Custom', activePresetId: null };
    });
  },

  setSpatial: (spatial) => set({ spatial }),

  setPreset: (presetIdOrName) => {
    const preset = findPreset(get().presets, get().customPresets, presetIdOrName);
    const next = preset || get().presets.find(item => item.id === 'flat')!;
    writeJson(ACTIVE_PRESET_KEY, next.id);
    set({
      activePreset: next.name,
      activePresetId: next.id,
      bandValues: normalizeBands(next.bandValues),
      spatial: next.spatial ?? get().spatial,
    });
  },

  saveCustomPreset: (name = 'Custom') => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const duplicate = get().customPresets.find(preset => preset.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate && trimmed !== 'Custom') return null;

    const now = new Date().toISOString();
    const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now());
    const preset: EqPreset = {
      id: duplicate?.id || `custom-${randomId}`,
      name: trimmed,
      category: 'custom',
      bandValues: normalizeBands(get().bandValues),
      spatial: get().spatial,
      isBuiltIn: false,
      createdAt: duplicate?.createdAt || now,
      updatedAt: now,
    };

    const nextCustomPresets = duplicate
      ? get().customPresets.map(item => item.id === duplicate.id ? preset : item)
      : [...get().customPresets, preset];

    PRESETS['Custom'] = [...preset.bandValues];
    writeJson(LEGACY_CUSTOM_KEY, preset.bandValues);
    writeJson(CUSTOM_PRESETS_KEY, nextCustomPresets);
    writeJson(ACTIVE_PRESET_KEY, preset.id);
    set({
      customPresets: nextCustomPresets,
      activePreset: preset.name,
      activePresetId: preset.id,
    });
    return preset;
  },

  renameCustomPreset: (id, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const duplicate = get().customPresets.some(preset => preset.id !== id && preset.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return;
    const updatedAt = new Date().toISOString();
    const customPresets = get().customPresets.map(preset => preset.id === id ? { ...preset, name: trimmed, updatedAt } : preset);
    writeJson(CUSTOM_PRESETS_KEY, customPresets);
    set((state) => ({
      customPresets,
      activePreset: state.activePresetId === id ? trimmed : state.activePreset,
    }));
  },

  deleteCustomPreset: (id) => {
    const customPresets = get().customPresets.filter(preset => preset.id !== id);
    writeJson(CUSTOM_PRESETS_KEY, customPresets);
    if (get().activePresetId === id) {
      const flat = get().presets.find(preset => preset.id === 'flat')!;
      set({
        customPresets,
        activePreset: flat.name,
        activePresetId: flat.id,
        bandValues: [...flat.bandValues],
        spatial: flat.spatial || 0,
      });
      return;
    }
    set({ customPresets });
  },

  loadCustomPresets: () => {
    set({ customPresets: loadPersistedCustomPresets() });
  },

  resetToFlat: () => get().setPreset('flat'),

  setCompareSlot: (activeCompareSlot) => set({ activeCompareSlot }),

  captureCompareA: () => {
    const { activePreset, bandValues, spatial } = get();
    set({ compareA: { name: `${activePreset} A`, bandValues: normalizeBands(bandValues), spatial }, activeCompareSlot: 'A' });
  },

  captureCompareB: () => {
    const { activePreset, bandValues, spatial } = get();
    set({ compareB: { name: `${activePreset} B`, bandValues: normalizeBands(bandValues), spatial }, activeCompareSlot: 'B' });
  },

  applyCompareA: () => {
    const { compareA } = get();
    if (!compareA) return;
    set({ bandValues: normalizeBands(compareA.bandValues), spatial: compareA.spatial, activePreset: compareA.name, activePresetId: null, activeCompareSlot: 'A' });
  },

  applyCompareB: () => {
    const { compareB } = get();
    if (!compareB) return;
    set({ bandValues: normalizeBands(compareB.bandValues), spatial: compareB.spatial, activePreset: compareB.name, activePresetId: null, activeCompareSlot: 'B' });
  },

  swapCompare: () => set((state) => ({ compareA: state.compareB, compareB: state.compareA })),
  clearCompare: () => set({ compareA: null, compareB: null }),
}));
