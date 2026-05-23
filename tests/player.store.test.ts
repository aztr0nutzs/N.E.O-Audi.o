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

  it('next and previous work with history', () => {
    const store = usePlayerStore.getState();
    store.playTrack('a', ['a', 'b']);
    store.next();
    expect(usePlayerStore.getState().currentTrackId).toBe('b');
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

  it('setSpeed updates playback speed', () => {
    usePlayerStore.getState().setSpeed(1.25);
    expect(usePlayerStore.getState().playbackSpeed).toBe(1.25);
  });
});
