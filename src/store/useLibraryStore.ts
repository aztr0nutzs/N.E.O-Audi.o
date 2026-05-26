import { create } from 'zustand';
import { Track, Playlist, MoodPack, SmartPlaylist, SmartPlaylistId } from '../types';
import { storage } from '../services/storage';
import toast from 'react-hot-toast';
import { buildMoodPacks, buildSmartPlaylists } from '../lib/smartPlaylists';
import { normalizeBackendError, resolveApiAssetUrl } from '../services/apiBase';

interface LibraryState {
  tracks: Track[];
  playlists: Playlist[];
  isLoading: boolean;
  backendStatus: 'unknown' | 'online' | 'offline';
  backendMessage: string | null;
  loadLibrary: () => Promise<void>;
  // When `blob` is provided, `track` is treated as a Partial<Track> override
  // map (title/artist) and the backend derives every other field from the
  // probed file. When `blob` is omitted, this is treated as an update and the
  // store-resident track is used as the base.
  addTrack: (track: Partial<Track>, blob?: Blob) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  updateTrack: (id: string, updates: Partial<Track>) => Promise<void>;
  uploadCoverArt: (trackId: string, file: File) => Promise<Track>;
  removeCoverArt: (trackId: string) => Promise<Track>;
  getSmartPlaylists: () => SmartPlaylist[];
  getMoodPacks: () => MoodPack[];
  getTracksForSmartPlaylist: (id: SmartPlaylistId) => Track[];
  getTracksForMoodPack: (idOrMood: string) => Track[];
  recordTrackPlay: (trackId: string) => Promise<void>;
  addPlaylist: (playlist: Playlist) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  getAudioUrl: (trackId: string) => Promise<string | null>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  playlists: [],
  isLoading: true,
  backendStatus: 'unknown',
  backendMessage: null,
  
  loadLibrary: async () => {
    set({ isLoading: true });
    try {
      const tracks = await storage.getAllTracks();
      const playlists = await storage.getPlaylists();
      set({ tracks: tracks || [], playlists: playlists || [], isLoading: false, backendStatus: 'online', backendMessage: null });
    } catch (e) {
      console.error(e);
      set({
        isLoading: false,
        backendStatus: 'offline',
        backendMessage: normalizeBackendError(e),
      });
    }
  },

  addTrack: async (track, blob) => {
    if (blob) {
       await storage.uploadTrack(blob, track);
    } else {
       // Treated as an update on an existing track.
       if (!track.id) throw new Error('Cannot save track without an id');
       await storage.saveTrack(track as Track);
    }
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
    try {
      const saved = await storage.saveTrack(updated);
      set((state) => ({ tracks: state.tracks.map(t => t.id === id ? (saved || updated) : t) }));
    } catch (e) {
      throw e;
    }
  },

  uploadCoverArt: async (trackId, file) => {
    try {
      const updated = await storage.uploadCoverArt(trackId, file);
      set((state) => ({ tracks: state.tracks.map(t => t.id === trackId ? updated : t) }));
      toast.success('Cover art updated');
      return updated;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload cover art');
      throw e;
    }
  },

  removeCoverArt: async (trackId) => {
    try {
      const updated = await storage.removeCoverArt(trackId);
      set((state) => ({ tracks: state.tracks.map(t => t.id === trackId ? updated : t) }));
      toast.success('Cover art removed');
      return updated;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove cover art');
      throw e;
    }
  },

  getSmartPlaylists: () => buildSmartPlaylists(get().tracks),

  getMoodPacks: () => buildMoodPacks(get().tracks),

  getTracksForSmartPlaylist: (id) => {
    const playlist = buildSmartPlaylists(get().tracks).find(pack => pack.id === id);
    if (!playlist) return [];
    const trackMap = new Map(get().tracks.map(track => [track.id, track]));
    return playlist.trackIds.map(trackId => trackMap.get(trackId)).filter(Boolean) as Track[];
  },

  getTracksForMoodPack: (idOrMood) => {
    const pack = buildMoodPacks(get().tracks).find(item => item.id === idOrMood || item.mood === idOrMood);
    if (!pack) return [];
    const trackMap = new Map(get().tracks.map(track => [track.id, track]));
    return pack.trackIds.map(trackId => trackMap.get(trackId)).filter(Boolean) as Track[];
  },

  recordTrackPlay: async (trackId) => {
    const track = get().tracks.find(t => t.id === trackId);
    if (!track) return;
    const updated = {
      ...track,
      playCount: (track.playCount || 0) + 1,
      lastPlayedAt: new Date().toISOString(),
      updatedAt: Date.now(),
    };
    set((state) => ({ tracks: state.tracks.map(t => t.id === trackId ? updated : t) }));
    try {
      const saved = await storage.saveTrack(updated);
      if (saved) set((state) => ({ tracks: state.tracks.map(t => t.id === trackId ? saved : t) }));
    } catch (e) {
      console.warn('Failed to persist playback stats', e);
    }
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
    return resolveApiAssetUrl(track.localUrl) || null;
  }
}));
