import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

let libraryState: any;
const addToQueue = vi.fn();
const addManyToQueue = vi.fn();

vi.mock('../src/store/useLibraryStore', () => ({
  useLibraryStore: (sel: any) => sel(libraryState || {
    tracks: [{ id: 't1', title: 'Track One', artist: 'Artist', sourceType: 'downloaded', localUrl: 'blob:x', format: 'mp3', duration: 10, size: 10, createdAt: 0, updatedAt: 0, favorite: false }],
    playlists: [],
    removeTrack: vi.fn(),
    addPlaylist: vi.fn(),
    updatePlaylist: vi.fn(),
  }),
}));
vi.mock('../src/store/usePlayerStore', () => ({
  usePlayerStore: (sel: any) => sel({
    playTrack: vi.fn(),
    addToQueue,
    addManyToQueue,
    currentTrackId: null,
    isPlaying: false,
  }),
}));
vi.mock('../src/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));

describe('Library smoke', () => {
  it('renders archive vault categories and details action', async () => {
    libraryState = {
      tracks: [{ id: 't1', title: 'Track One', artist: 'Artist', sourceType: 'downloaded', localUrl: 'blob:x', format: 'mp3', duration: 10, size: 10, createdAt: 0, updatedAt: 0, favorite: false }],
      playlists: [],
      removeTrack: vi.fn(),
      addPlaylist: vi.fn(),
      updatePlaylist: vi.fn(),
    };
    const { Library } = await import('../src/pages/Library');
    render(<MemoryRouter><Library /></MemoryRouter>);
    expect(screen.getByRole('img', { name: /n\.e\.o audio lab library/i }).querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('neo_audio_header4.png'),
    );
    expect(screen.getAllByText(/downloaded/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/recently added/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/lossless/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/mood packs/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/playlists/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /downloaded indexed/i }));
    expect(screen.getByTestId('generated-cover-art')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /track details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /metadata lab/i })).toBeInTheDocument();
  });

  it('renders Add to Queue action for a track', async () => {
    libraryState = {
      tracks: [
        { id: 'a', title: 'Alpha', artist: 'Artist A', sourceType: 'downloaded', localUrl: '', format: 'mp3', duration: 120, size: 1, createdAt: 1, updatedAt: 1, favorite: false },
      ],
      playlists: [],
      removeTrack: vi.fn(),
      addPlaylist: vi.fn(),
      updatePlaylist: vi.fn(),
    };
    const { Library } = await import('../src/pages/Library');
    render(<MemoryRouter initialEntries={['/library?q=Alpha']}><Library /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: /add alpha to queue/i })).toBeInTheDocument();
  });

  it('renders Smart Playlists and opens a matching smart pack', async () => {
    libraryState = {
      tracks: [
        { id: 'fav', title: 'Favorite Signal', artist: 'Artist A', sourceType: 'downloaded', localUrl: '', format: 'mp3', duration: 120, size: 1, createdAt: 2, updatedAt: 2, favorite: true },
        { id: 'plain', title: 'Plain Signal', artist: 'Artist B', sourceType: 'local', localUrl: '', format: 'mp3', duration: 120, size: 1, createdAt: 1, updatedAt: 1, favorite: false },
      ],
      playlists: [],
      removeTrack: vi.fn(),
      addPlaylist: vi.fn(),
      updatePlaylist: vi.fn(),
    };
    const { Library } = await import('../src/pages/Library');
    render(<MemoryRouter><Library /></MemoryRouter>);
    expect(screen.getByText(/smart playlists/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/^Favorites$/i));
    expect(screen.getByText(/favorite signal/i)).toBeInTheDocument();
    expect(screen.queryByText(/plain signal/i)).not.toBeInTheDocument();
  });

  it('renders Mood Packs and empty pack state', async () => {
    libraryState = {
      tracks: [{ id: 'a', title: 'No Favorite', artist: 'Artist A', sourceType: 'local', localUrl: '', format: 'mp3', duration: 120, size: 1, createdAt: 1, updatedAt: 1, favorite: false, mood: 'Night Drive' }],
      playlists: [],
      removeTrack: vi.fn(),
      addPlaylist: vi.fn(),
      updatePlaylist: vi.fn(),
    };
    const { Library } = await import('../src/pages/Library');
    render(<MemoryRouter><Library /></MemoryRouter>);
    expect(screen.getAllByText(/mood packs/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/night drive/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText(/^Favorites$/i));
    expect(screen.getByText(/no signals match this pack/i)).toBeInTheDocument();
  });
});
