import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/store/useAppStore', () => ({
  useAppStore: (sel?: any) => {
    const state = { loadSettings: vi.fn() };
    return typeof sel === 'function' ? sel(state) : state;
  },
}));

vi.mock('../src/store/useLibraryStore', () => ({
  useLibraryStore: (sel?: any) => {
    const state = {
      tracks: [],
      playlists: [],
      loadLibrary: vi.fn(),
    };
    return typeof sel === 'function' ? sel(state) : state;
  },
}));

vi.mock('../src/store/useDownloadStore', () => ({
  useDownloadStore: (sel?: any) => {
    const state = { jobs: [], loadJobs: vi.fn() };
    return typeof sel === 'function' ? sel(state) : state;
  },
}));

vi.mock('../src/store/usePlayerStore', () => ({
  usePlayerStore: (sel?: any) => {
    const state = {
      currentTrackId: null,
      queue: [],
      queueIndex: 0,
      isPlaying: false,
      progress: 0,
      duration: 0,
      repeat: 'off',
      shuffle: false,
      volume: 1,
      playbackSpeed: 1,
      analyserNode: null,
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
      playTrack: vi.fn(),
      addManyToQueue: vi.fn(),
    };
    return typeof sel === 'function' ? sel(state) : state;
  },
}));

vi.mock('../src/store/useEqualizerStore', () => ({
  useEqualizerStore: (sel?: any) => {
    const state = { isOn: false, activePreset: 'Flat', bandValues: [0, 0, 0], spatial: 0 };
    return typeof sel === 'function' ? sel(state) : state;
  },
}));

vi.mock('../src/store/useSignalChainStore', () => ({
  useSignalChainStore: (sel?: any) => {
    const state = {
      modules: {
        eq: { enabled: true },
        bass: { enabled: false },
        spatial: { enabled: false },
        limiter: { enabled: true },
      },
      clippingWarning: false,
    };
    return typeof sel === 'function' ? sel(state) : state;
  },
}));

vi.mock('../src/store/useAnalyzerStore', () => ({
  useAnalyzerStore: (sel?: any) => {
    const state = { setAnalyzerOpen: vi.fn(), isAnalyzerOpen: false };
    return typeof sel === 'function' ? sel(state) : state;
  },
}));

vi.mock('../src/components/layout/AudioDriver', () => ({ AudioDriver: () => null }));
vi.mock('../src/components/audio/AudioAnalyzerOverlay', () => ({ AudioAnalyzerOverlay: () => null }));
vi.mock('../src/components/layout/BottomDock', () => ({ BottomDock: () => <nav aria-label="Bottom dock" /> }));
vi.mock('../src/components/ui/ReactorCoreVisual', () => ({ ReactorCoreVisual: () => <div data-testid="reactor" /> }));
vi.mock('../src/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));

describe('App boot sequence integration', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  it('shows startup boot overlay and then leaves the app rendered', async () => {
    const App = (await import('../src/App')).default;
    render(<App />);

    expect(screen.getByTestId('boot-sequence')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell')).toHaveStyle({
      '--neo-audio-background': 'url("/assets/neo_audio/neo_audio_backround.png")',
    });
    expect(screen.getByText(/n\.e\.o audio command center/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /n\.e\.o audio lab dashboard/i }).querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('neo_audio_header3.png'),
    );

    act(() => {
      vi.advanceTimersByTime(3800);
    });

    expect(screen.queryByTestId('boot-sequence')).not.toBeInTheDocument();
    expect(screen.getByText(/n\.e\.o audio command center/i)).toBeInTheDocument();
  });

  it('does not replay during the same browser session', async () => {
    window.sessionStorage.setItem('neo-audio-boot-sequence-complete', 'true');
    const App = (await import('../src/App')).default;

    render(<App />);

    expect(screen.queryByTestId('boot-sequence')).not.toBeInTheDocument();
    expect(screen.getByText(/n\.e\.o audio command center/i)).toBeInTheDocument();
  });
});
