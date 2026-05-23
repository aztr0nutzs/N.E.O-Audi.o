import { create } from 'zustand';
import { Track } from '../types';
import { useLibraryStore } from './useLibraryStore';

interface PlayerState {
  currentTrackId: string | null;
  queue: string[];
  queueIndex: number;
  history: string[];
  isPlaying: boolean;
  volume: number;
  progress: number; // 0 to 1
  duration: number; // seconds
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  playbackSpeed: number;
  seekRequest: number | null;
  error: string | null;
  analyserNode: AnalyserNode | null;
  
  playTrack: (trackId: string, queue?: string[]) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (v: number) => void;
  setProgress: (p: number) => void;
  setDuration: (d: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setSpeed: (s: number) => void;
  addToQueue: (trackId: string) => void;
  seekTo: (progress: number) => void;
  clearSeekRequest: () => void;
  setError: (e: string | null) => void;
  setAnalyserNode: (node: AnalyserNode) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrackId: null,
  queue: [],
  queueIndex: 0,
  history: [],
  isPlaying: false,
  volume: 1,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',
  playbackSpeed: 1,
  seekRequest: null,
  error: null,
  analyserNode: null,

  playTrack: (trackId, newQueue) => {
    set((state) => {
      const q = newQueue || state.queue;
      const index = q.indexOf(trackId);
      return {
        history: state.currentTrackId ? [...state.history, state.currentTrackId] : state.history,
        currentTrackId: trackId,
        queue: q,
        queueIndex: index !== -1 ? index : 0,
        isPlaying: true,
        progress: 0,
        seekRequest: null,
        error: null,
      };
    });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true, error: null }),

  next: () => {
    const { queue, queueIndex, currentTrackId, repeat, shuffle } = get();
    if (!currentTrackId) return;
    
    if (repeat === 'one') {
      get().seekTo(0);
      set({ isPlaying: true, error: null });
      return;
    }

    if (queue.length === 0) {
      set({ isPlaying: false, progress: 0 });
      return;
    }

    let nextIndex = queueIndex + 1;
    let nextId = currentTrackId;

    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
      nextId = queue[nextIndex];
    } else {
      if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0;
          nextId = queue[nextIndex];
        } else {
          set({ isPlaying: false, progress: 0, error: null });
          return;
        }
      } else {
        nextId = queue[nextIndex];
      }
    }
    
    set((state) => ({
      history: [...state.history, state.currentTrackId!],
      currentTrackId: nextId,
      queueIndex: nextIndex,
      progress: 0,
      error: null
    }));
  },

  previous: () => {
    const { history, progress, duration } = get();
    
    // If we've played more than 3 seconds, just restart this song
    if (progress * duration > 3) {
      get().seekTo(0);
      return;
    }

    if (history.length === 0) {
      get().seekTo(0);
      return;
    }
    
    const prevId = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    set((state) => ({
      currentTrackId: prevId,
      history: newHistory,
      queueIndex: state.queue.indexOf(prevId) !== -1 ? state.queue.indexOf(prevId) : state.queueIndex,
      progress: 0,
      error: null
    }));
  },

  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
  toggleRepeat: () => set((state) => {
    const order: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const idx = order.indexOf(state.repeat);
    return { repeat: order[(idx + 1) % order.length] };
  }),
  
  setSpeed: (playbackSpeed) => set({ playbackSpeed }),
  
  addToQueue: (trackId) => set((state) => ({ queue: [...state.queue, trackId] })),

  seekTo: (progress) => set({ seekRequest: progress, progress }),
  clearSeekRequest: () => set({ seekRequest: null }),
  setError: (error) => set({ error }),
  setAnalyserNode: (node) => set({ analyserNode: node }),
}));
