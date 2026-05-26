import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

let libraryState: any;
vi.mock('../src/store/useLibraryStore', () => ({ useLibraryStore: (sel: any) => sel(libraryState) }));
vi.mock('../src/store/useDownloadStore', () => ({ useDownloadStore: (sel: any) => sel({ jobs: [] }) }));
vi.mock('../src/store/usePlayerStore', () => ({ usePlayerStore: (sel: any) => sel({ playTrack: vi.fn(), addToQueue: vi.fn() }) }));

const base = {
  tracks: [{ id: 't1', title: 'Track One', artist: 'Artist', sourceType: 'downloaded', localUrl: 'blob:x', format: 'mp3', duration: 10, size: 10, createdAt: 0, updatedAt: 0, favorite: false }],
  playlists: [], backendStatus: 'online', backendMessage: null, loadLibrary: vi.fn(),
};

describe('Library smoke', () => {
  it('renders clean archive tabs', async () => {
    libraryState = base;
    const { Library } = await import('../src/pages/Library');
    render(<MemoryRouter><Library /></MemoryRouter>);
    expect(screen.getByText(/n\.e\.o archive vault/i)).toBeInTheDocument();
    expect(screen.getByTestId('library-tabs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mood packs/i })).toBeInTheDocument();
  });

  it('shows clean offline message with collapsed technical details', async () => {
    libraryState = { ...base, tracks: [], backendStatus: 'offline', backendMessage: 'Unexpected token < <!doctype html>' };
    const { Library } = await import('../src/pages/Library');
    render(<MemoryRouter><Library /></MemoryRouter>);
    expect(screen.getByText(/library backend unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/unexpected token/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show technical details/i }));
    expect(screen.getByText(/unexpected token/i)).toBeInTheDocument();
  });
});
