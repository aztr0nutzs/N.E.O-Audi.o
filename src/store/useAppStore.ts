import { create } from 'zustand';
import { AppSettings } from '../types';
import { storage } from '../services/storage';

interface AppState {
  settings: AppSettings;
  isSidebarOpen: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  toggleSidebar: () => void;
}

const defaultSettings: AppSettings = {
  defaultFormat: 'mp3',
  defaultBitrate: 320,
  themeIntensity: 'neon',
  autoFillMetadata: true,
  confirmDelete: true,
};

export const useAppStore = create<AppState>((set, get) => ({
  settings: defaultSettings,
  isSidebarOpen: false,
  loadSettings: async () => {
    const saved = await storage.getSettings();
    if (saved) {
      set({ settings: saved });
    }
  },
  updateSettings: async (newSettings) => {
    const current = get().settings;
    const updated = { ...current, ...newSettings };
    await storage.saveSettings(updated);
    set({ settings: updated });
  },
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
