import { beforeEach, describe, expect, it } from 'vitest';
import { usePlayerStore } from '../src/store/usePlayerStore';

describe('usePlayerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrackId: null, queue: [], queueIndex: 0, history: [], isPlaying: false, volume: 1, progress: 0, duration: 0,
      shuffle: false, repeat: 'off', playbackSpeed: 1, seekRequest: null, error: null, analyserNode: null,
    });
  });

  it('playTrack sets current and playing', () => {
    usePlayerStore.getState().playTrack('a', ['a', 'b']);
    const s = usePlayerStore.getState();
    expect(s.currentTrackId).toBe('a');
    expect(s.isPlaying).toBe(true);
  });

  it('setQueue can replace queue and start a track', () => {
    usePlayerStore.getState().setQueue(['a', 'b', 'c'], 'b');
    const s = usePlayerStore.getState();
    expect(s.queue).toEqual(['a', 'b', 'c']);
    expect(s.currentTrackId).toBe('b');
    expect(s.queueIndex).toBe(1);
  });

  it('addToQueue and addManyToQueue append tracks', () => {
    usePlayerStore.getState().addToQueue('a');
    usePlayerStore.getState().addManyToQueue(['b', 'c']);
    expect(usePlayerStore.getState().queue).toEqual(['a', 'b', 'c']);
  });

  it('removeFromQueue removes upcoming tracks without removing current', () => {
    const store = usePlayerStore.getState();
    store.playTrack('a', ['a', 'b', 'c']);
    store.removeFromQueue('b');
    store.removeFromQueue('a');
    expect(usePlayerStore.getState().queue).toEqual(['a', 'c']);
    expect(usePlayerStore.getState().currentTrackId).toBe('a');
  });

  it('moveQueueItem reorders tracks and keeps current index aligned', () => {
    const store = usePlayerStore.getState();
    store.playTrack('b', ['a', 'b', 'c']);
    store.moveQueueItem(2, 0);
    const s = usePlayerStore.getState();
    expect(s.queue).toEqual(['c', 'a', 'b']);
    expect(s.queueIndex).toBe(2);
  });

  it('clearQueue keeps the current track and clears upcoming tracks', () => {
    const store = usePlayerStore.getState();
    store.playTrack('a', ['a', 'b']);
    store.clearQueue();
    expect(usePlayerStore.getState().queue).toEqual(['a']);
  });

  it('clearHistory removes playback history', () => {
    usePlayerStore.setState({ history: ['a', 'b'] });
    usePlayerStore.getState().clearHistory();
    expect(usePlayerStore.getState().history).toEqual([]);
  });

  it('next and previous work with history', () => {
    const store = usePlayerStore.getState();
    store.playTrack('a', ['a', 'b']);
    store.next();
    expect(usePlayerStore.getState().currentTrackId).toBe('b');
    expect(usePlayerStore.getState().history).toEqual(['a']);
    store.previous();
    expect(usePlayerStore.getState().currentTrackId).toBe('a');
  });

  it('repeat all loops queue end to start', () => {
    usePlayerStore.setState({ repeat: 'all' });
    const store = usePlayerStore.getState();
    store.playTrack('b', ['a', 'b']);
    store.next();
    expect(usePlayerStore.getState().currentTrackId).toBe('a');
  });

  it('repeat one keeps current track', () => {
    const store = usePlayerStore.getState();
    store.playTrack('a', ['a', 'b']);
    usePlayerStore.setState({ repeat: 'one', progress: 0.5, duration: 120 });
    store.next();
    expect(usePlayerStore.getState().currentTrackId).toBe('a');
  });

  it('shuffle next does not crash', () => {
    const store = usePlayerStore.getState();
    store.playTrack('a', ['a', 'b', 'c']);
    usePlayerStore.setState({ shuffle: true });
    expect(() => store.next()).not.toThrow();
    expect(['a', 'b', 'c']).toContain(usePlayerStore.getState().currentTrackId);
  });

  it('saveQueueSnapshot returns copies of queue state', () => {
    const store = usePlayerStore.getState();
    store.playTrack('a', ['a', 'b']);
    const snapshot = store.saveQueueSnapshot();
    expect(snapshot).toEqual({ currentTrackId: 'a', queue: ['a', 'b'], history: [] });
    snapshot.queue.push('c');
    expect(usePlayerStore.getState().queue).toEqual(['a', 'b']);
  });

  it('setSpeed updates playback speed', () => {
    usePlayerStore.getState().setSpeed(1.25);
    expect(usePlayerStore.getState().playbackSpeed).toBe(1.25);
  });
});
