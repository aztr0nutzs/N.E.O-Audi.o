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

  it('stop pauses playback, resets progress, and clears error', () => {
    usePlayerStore.setState({ isPlaying: true, progress: 0.5, error: 'boom' });
    usePlayerStore.getState().stop();
    const s = usePlayerStore.getState();
    expect(s.isPlaying).toBe(false);
    expect(s.progress).toBe(0);
    expect(s.error).toBeNull();
    expect(s.seekRequest).toBe(0);
  });

  it('seekForward advances by seconds and clamps to <= 1', () => {
    usePlayerStore.setState({ duration: 100, progress: 0.5 });
    usePlayerStore.getState().seekForward(15);
    expect(usePlayerStore.getState().progress).toBeCloseTo(0.65, 5);

    usePlayerStore.setState({ duration: 100, progress: 0.95 });
    usePlayerStore.getState().seekForward(60);
    expect(usePlayerStore.getState().progress).toBeLessThanOrEqual(1);
    expect(usePlayerStore.getState().progress).toBe(1);
  });

  it('seekBackward rewinds by seconds and clamps to >= 0', () => {
    usePlayerStore.setState({ duration: 100, progress: 0.5 });
    usePlayerStore.getState().seekBackward(15);
    expect(usePlayerStore.getState().progress).toBeCloseTo(0.35, 5);

    usePlayerStore.setState({ duration: 100, progress: 0.05 });
    usePlayerStore.getState().seekBackward(60);
    expect(usePlayerStore.getState().progress).toBeGreaterThanOrEqual(0);
    expect(usePlayerStore.getState().progress).toBe(0);
  });

  it('seekForward and seekBackward are no-ops when duration is missing', () => {
    usePlayerStore.setState({ duration: 0, progress: 0 });
    expect(() => usePlayerStore.getState().seekForward(15)).not.toThrow();
    expect(() => usePlayerStore.getState().seekBackward(15)).not.toThrow();
    expect(usePlayerStore.getState().progress).toBe(0);
  });
});
