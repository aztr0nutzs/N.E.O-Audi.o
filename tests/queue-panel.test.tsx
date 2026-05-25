import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueuePanel } from '../src/components/player/QueuePanel';
import { usePlayerStore } from '../src/store/usePlayerStore';
import { useLibraryStore } from '../src/store/useLibraryStore';
import { Track } from '../src/types';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const makeTrack = (id: string, title: string): Track => ({
  id,
  title,
  artist: `Artist ${id}`,
  sourceType: 'local',
  localUrl: `/audio/${id}.mp3`,
  format: 'mp3',
  bitrate: 320,
  duration: 90,
  size: 1000,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  favorite: false,
});

describe('QueuePanel', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrackId: 'a',
      queue: ['a', 'b', 'c'],
      queueIndex: 0,
      history: ['d'],
      isPlaying: true,
      volume: 1,
      progress: 0,
      duration: 0,
      shuffle: false,
      repeat: 'off',
      playbackSpeed: 1,
      seekRequest: null,
      error: null,
      analyserNode: null,
    });
    useLibraryStore.setState({
      tracks: [
        makeTrack('a', 'Current Track'),
        makeTrack('b', 'Next Track'),
        makeTrack('c', 'Later Track'),
        makeTrack('d', 'Old Track'),
      ],
      playlists: [],
      isLoading: false,
    });
  });

  it('renders current track, up next, and history', () => {
    render(<MemoryRouter><QueuePanel mode="inline" /></MemoryRouter>);
    expect(screen.getByText('Current Track')).toBeInTheDocument();
    expect(screen.getByText('Next Track')).toBeInTheDocument();
    expect(screen.getByText('Old Track')).toBeInTheDocument();
  });

  it('renders clear queue button and removes a queued track', () => {
    render(<MemoryRouter><QueuePanel mode="inline" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /clear queue/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove next track from queue/i }));
    expect(usePlayerStore.getState().queue).toEqual(['a', 'c']);
  });

  it('move up and move down reorder queue items', () => {
    render(<MemoryRouter><QueuePanel mode="inline" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /move later track up/i }));
    expect(usePlayerStore.getState().queue).toEqual(['a', 'c', 'b']);
    fireEvent.click(screen.getByRole('button', { name: /move later track down/i }));
    expect(usePlayerStore.getState().queue).toEqual(['a', 'b', 'c']);
  });

  it('renders empty upcoming state', () => {
    usePlayerStore.setState({ queue: ['a'], queueIndex: 0 });
    render(<MemoryRouter><QueuePanel mode="inline" /></MemoryRouter>);
    expect(screen.getByText(/queue empty \/ no upcoming signals/i)).toBeInTheDocument();
  });
});
