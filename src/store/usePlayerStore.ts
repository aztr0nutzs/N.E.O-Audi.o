import { create } from 'zustand';

export interface QueueSnapshot {
  currentTrackId: string | null;
  queue: string[];
  history: string[];
}

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
  setQueue: (trackIds: string[], startTrackId?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (v: number) => void;
  setProgress: (p: number) => void;
  setDuration: (d: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setSpeed: (s: number) => void;
  addToQueue: (trackId: string) => void;
  addManyToQueue: (trackIds: string[]) => void;
  removeFromQueue: (trackId: string) => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  playQueueFromIndex: (index: number) => void;
  shuffleQueue: () => void;
  saveQueueSnapshot: () => QueueSnapshot;
  clearHistory: () => void;
  seekTo: (progress: number) => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  clearSeekRequest: () => void;
  setError: (e: string | null) => void;
  setAnalyserNode: (node: AnalyserNode) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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
      const q = newQueue && newQueue.length > 0 ? newQueue : (state.queue.length > 0 ? state.queue : [trackId]);
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

  setQueue: (trackIds, startTrackId) => {
    const nextQueue = [...trackIds];
    set((state) => {
      const requestedTrack = startTrackId && nextQueue.includes(startTrackId) ? startTrackId : null;
      const currentInQueue = state.currentTrackId ? nextQueue.indexOf(state.currentTrackId) : -1;

      if (requestedTrack) {
        return {
          history: state.currentTrackId ? [...state.history, state.currentTrackId] : state.history,
          currentTrackId: requestedTrack,
          queue: nextQueue,
          queueIndex: nextQueue.indexOf(requestedTrack),
          isPlaying: true,
          progress: 0,
          seekRequest: null,
          error: null,
        };
      }

      return {
        queue: nextQueue,
        queueIndex: currentInQueue !== -1 ? currentInQueue : 0,
      };
    });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true, error: null }),
  stop: () => set({ isPlaying: false, progress: 0, seekRequest: 0, error: null }),

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
    } else if (nextIndex >= queue.length) {
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

    set((state) => ({
      history: [...state.history, state.currentTrackId!],
      currentTrackId: nextId,
      queueIndex: nextIndex,
      progress: 0,
      error: null,
    }));
  },

  previous: () => {
    const { history, progress, duration } = get();

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
      error: null,
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

  addManyToQueue: (trackIds) => {
    if (trackIds.length === 0) return;
    set((state) => ({ queue: [...state.queue, ...trackIds] }));
  },

  removeFromQueue: (trackId) => {
    set((state) => {
      if (trackId === state.currentTrackId) return state;

      const removedBeforeCursor = state.queue
        .slice(0, state.queueIndex)
        .filter(id => id === trackId).length;
      const queue = state.queue.filter(id => id !== trackId);
      const queueIndex = queue.length === 0 ? 0 : clamp(state.queueIndex - removedBeforeCursor, 0, queue.length - 1);

      return { queue, queueIndex };
    });
  },

  moveQueueItem: (fromIndex, toIndex) => {
    set((state) => {
      if (state.queue.length === 0) return state;
      const from = clamp(Math.trunc(fromIndex), 0, state.queue.length - 1);
      const to = clamp(Math.trunc(toIndex), 0, state.queue.length - 1);
      if (from === to) return state;

      const queue = [...state.queue];
      const [item] = queue.splice(from, 1);
      queue.splice(to, 0, item);
      const currentIndex = state.currentTrackId ? queue.indexOf(state.currentTrackId) : -1;

      return {
        queue,
        queueIndex: currentIndex !== -1 ? currentIndex : clamp(state.queueIndex, 0, queue.length - 1),
      };
    });
  },

  clearQueue: () => {
    set((state) => ({
      queue: state.currentTrackId ? [state.currentTrackId] : [],
      queueIndex: 0,
    }));
  },

  playQueueFromIndex: (index) => {
    const { queue } = get();
    if (queue.length === 0) return;
    const queueIndex = clamp(Math.trunc(index), 0, queue.length - 1);
    const trackId = queue[queueIndex];
    set((state) => ({
      history: state.currentTrackId ? [...state.history, state.currentTrackId] : state.history,
      currentTrackId: trackId,
      queueIndex,
      isPlaying: true,
      progress: 0,
      seekRequest: null,
      error: null,
    }));
  },

  shuffleQueue: () => {
    set((state) => {
      const currentId = state.currentTrackId;
      const currentIndex = currentId ? state.queue.indexOf(currentId) : state.queueIndex;
      const locked = currentId && currentIndex !== -1 ? state.queue.slice(0, currentIndex + 1) : [];
      const upcoming = currentId && currentIndex !== -1 ? state.queue.slice(currentIndex + 1) : [...state.queue];

      for (let i = upcoming.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
      }

      return {
        queue: [...locked, ...upcoming],
        queueIndex: currentId ? locked.length - 1 : 0,
      };
    });
  },

  saveQueueSnapshot: () => {
    const { currentTrackId, queue, history } = get();
    return {
      currentTrackId,
      queue: [...queue],
      history: [...history],
    };
  },

  clearHistory: () => set({ history: [] }),

  seekTo: (progress) => {
    const clamped = Math.max(0, Math.min(1, progress));
    set({ seekRequest: clamped, progress: clamped });
  },
  seekForward: (seconds = 15) => {
    const { duration, progress } = get();
    if (!duration || duration <= 0) return;
    const currentSeconds = (progress || 0) * duration;
    const nextSeconds = Math.min(duration, currentSeconds + seconds);
    get().seekTo(nextSeconds / duration);
  },
  seekBackward: (seconds = 15) => {
    const { duration, progress } = get();
    if (!duration || duration <= 0) return;
    const currentSeconds = (progress || 0) * duration;
    const nextSeconds = Math.max(0, currentSeconds - seconds);
    get().seekTo(nextSeconds / duration);
  },
  clearSeekRequest: () => set({ seekRequest: null }),
  setError: (error) => set({ error }),
  setAnalyserNode: (node) => set({ analyserNode: node }),
}));
