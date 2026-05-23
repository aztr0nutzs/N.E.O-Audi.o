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

export const PRESETS: Record<string, number[]> = {
  'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Club (Bass)': [10, 8, 5, 2, 0, 0, 0, 0, 0, 0],
  'Vocal': [-2, -2, -1, 2, 6, 6, 4, 1, -1, -2],
  'Night Drive': [5, 4, 0, -2, 0, 3, 5, 6, 4, 1],
  'Retro Synth': [6, 5, 2, -2, -4, 0, 2, 4, 6, 7],
};

const safeLocalStorage = (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') ? localStorage : null;
const savedCustomStr = safeLocalStorage ? safeLocalStorage.getItem('neo-custom-preset') : null;
if (savedCustomStr) {
   try {
      PRESETS['Custom'] = JSON.parse(savedCustomStr);
   } catch(e) {}
} else {
   PRESETS['Custom'] = PRESETS['Flat'];
}

interface EqualizerState {
  isOn: boolean;
  activePreset: string;
  bandValues: number[];
  spatial: number; // -1 to 1 (left to right)
  
  setIsOn: (on: boolean) => void;
  setBandValue: (index: number, value: number) => void;
  setPreset: (presetName: string) => void;
  setSpatial: (value: number) => void;
  saveCustomPreset: () => void;
}

export const useEqualizerStore = create<EqualizerState>((set, get) => ({
  isOn: true,
  activePreset: 'Flat',
  bandValues: PRESETS['Flat'],
  spatial: 0,
  
  setIsOn: (on) => set({ isOn: on }),
  
  setBandValue: (index, value) => {
    set((state) => {
      const newBands = [...state.bandValues];
      newBands[index] = value;
      return { bandValues: newBands, activePreset: 'Custom' };
    });
  },
  
  setSpatial: (spatial) => set({ spatial }),
  
  setPreset: (presetName) => {
    set({
      activePreset: presetName,
      bandValues: PRESETS[presetName] || PRESETS['Flat']
    });
  },

  saveCustomPreset: () => {
    const { bandValues } = get();
    PRESETS['Custom'] = [...bandValues];
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem('neo-custom-preset', JSON.stringify(PRESETS['Custom']));
    }
  }
}));
