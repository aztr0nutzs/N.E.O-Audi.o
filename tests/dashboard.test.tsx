import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

const playerRef: any = {
  current: {
    currentTrackId: null,
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
  },
};
const libraryRef: any = { current: { tracks: [], playlists: [], loadLibrary: vi.fn() } };
const downloadRef: any = { current: { jobs: [], loadJobs: vi.fn() } };
const eqRef: any = { current: { isOn: true, activePreset: 'Flat', bandValues: [0, 0, 0], spatial: 0 } };
const analyzerRef: any = { current: { setAnalyzerOpen: vi.fn() } };

vi.mock('../src/store/usePlayerStore', () => ({ usePlayerStore: () => playerRef.current }));
vi.mock('../src/store/useLibraryStore', () => ({ useLibraryStore: () => libraryRef.current }));
vi.mock('../src/store/useDownloadStore', () => ({ useDownloadStore: () => downloadRef.current }));
vi.mock('../src/store/useEqualizerStore', () => ({ useEqualizerStore: () => eqRef.current }));
vi.mock('../src/store/useAnalyzerStore', () => ({ useAnalyzerStore: () => analyzerRef.current }));

describe('Dashboard command center', () => {
  beforeEach(() => {
    playerRef.current = { ...playerRef.current, currentTrackId: null, isPlaying: false, progress: 0, duration: 0 };
    libraryRef.current = { ...libraryRef.current, tracks: [], playlists: [] };
    downloadRef.current = { ...downloadRef.current, jobs: [] };
  });

  it('renders command center sections', async () => {
    const { Dashboard } = await import('../src/pages/Dashboard');
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(screen.getByText(/n.e.o audio command center/i)).toBeInTheDocument();
    expect(screen.getByText(/now playing/i)).toBeInTheDocument();
    expect(screen.getByText(/download operations/i)).toBeInTheDocument();
    expect(screen.getByText(/library intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/eq \/ signal chain/i)).toBeInTheDocument();
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
  });

  it('shows empty signal state when no active track', async () => {
    const { Dashboard } = await import('../src/pages/Dashboard');
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByText(/no active signal/i)).toBeInTheDocument();
  });

  it('renders populated current track and failed job warning', async () => {
    libraryRef.current = {
      ...libraryRef.current,
      tracks: [{ id: 't1', title: 'Grid Runner', artist: 'Neon Unit', sourceType: 'local', localUrl: 'blob:x', format: 'mp3', bitrate: 320, duration: 120, size: 1024, createdAt: Date.now(), updatedAt: Date.now(), favorite: true }],
    };
    playerRef.current = { ...playerRef.current, currentTrackId: 't1', duration: 120, progress: 0.5 };
    downloadRef.current = {
      ...downloadRef.current,
      jobs: [{ id: 'j1', sourceUrl: 'https://x', status: 'failed', progress: 0, phase: 'download', format: 'mp3', bitrate: 320, createdAt: 1, updatedAt: 2 }],
    };

    const { Dashboard } = await import('../src/pages/Dashboard');
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(screen.getAllByText(/grid runner/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/neon unit/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/failed: 1/i)).toBeInTheDocument();
  });

  it('renders quick action controls', async () => {
    const { Dashboard } = await import('../src/pages/Dashboard');
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(screen.getAllByRole('button', { name: /open downloader/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /open library/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /open player/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /open equalizer/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /live analyzer/i })).toBeInTheDocument();
  });
});
