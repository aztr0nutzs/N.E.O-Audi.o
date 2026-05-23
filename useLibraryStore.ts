import { create } from 'zustand';
import { Track, Playlist } from '../types';
import { storage } from '../services/storage';
import toast from 'react-hot-toast';

interface LibraryState {
  tracks: Track[];
  playlists: Playlist[];
  isLoading: boolean;
  loadLibrary: () => Promise<void>;
  addTrack: (track: Track, blob?: Blob) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  updateTrack: (id: string, updates: Partial<Track>) => Promise<void>;
  addPlaylist: (playlist: Playlist) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  getAudioUrl: (trackId: string) => Promise<string | null>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  playlists: [],
  isLoading: true,
  
  loadLibrary: async () => {
    set({ isLoading: true });
    try {
      const tracks = await storage.getAllTracks();
      const playlists = await storage.getPlaylists();
      set({ tracks: tracks || [], playlists: playlists || [], isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  addTrack: async (track, blob) => {
    await storage.saveTrack(track, blob);
    await get().loadLibrary();
  },

  removeTrack: async (id) => {
    await storage.deleteTrack(id);
    set((state) => ({ 
      tracks: state.tracks.filter(t => t.id !== id),
      playlists: state.playlists.map(p => ({
        ...p,
        trackIds: p.trackIds.filter(tid => tid !== id)
      }))
    }));
  },

  updateTrack: async (id, updates) => {
    const track = get().tracks.find(t => t.id === id);
    if (!track) return;
    const updated = { ...track, ...updates, updatedAt: Date.now() };
    await storage.saveTrack(updated);
    set((state) => ({
      tracks: state.tracks.map(t => t.id === id ? updated : t)
    }));
  },

  addPlaylist: async (playlist) => {
    await storage.savePlaylist(playlist);
    set((state) => ({ playlists: [...state.playlists, playlist] }));
  },

  removePlaylist: async (id) => {
    await storage.deletePlaylist(id);
    set((state) => ({ playlists: state.playlists.filter(p => p.id !== id) }));
  },

  updatePlaylist: async (id, updates) => {
    const playlist = get().playlists.find(p => p.id === id);
    if (!playlist) return;
    const updated = { ...playlist, ...updates, updatedAt: Date.now() };
    await storage.savePlaylist(updated);
    set((state) => ({
      playlists: state.playlists.map(p => p.id === id ? updated : p)
    }));
  },

  getAudioUrl: async (trackId: string) => {
    const track = get().tracks.find(t => t.id === trackId);
    if (!track) return null;
    return track.localUrl;
  }
}));
