import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const libRef: any = { current: { tracks: [], isLoading: false, loadLibrary: vi.fn(), updateTrack: vi.fn(), removeTrack: vi.fn() } };
const playerRef: any = { current: { currentTrackId: null, isPlaying: false, playTrack: vi.fn(), pause: vi.fn(), resume: vi.fn(), addToQueue: vi.fn(), analyserNode: null } };

vi.mock('../src/store/useLibraryStore', () => ({ useLibraryStore: () => libRef.current }));
vi.mock('../src/store/usePlayerStore', () => ({ usePlayerStore: () => playerRef.current }));
vi.mock('../src/lib/utils', () => ({ formatDuration: () => '01:00', cn: (...a: string[]) => a.filter(Boolean).join(' ') }));

describe('TrackDetail', () => {
  it('renders missing track state', async () => {
    const { TrackDetail } = await import('../src/pages/TrackDetail');
    render(<MemoryRouter initialEntries={['/track/missing']}><Routes><Route path="/track/:id" element={<TrackDetail />} /></Routes></MemoryRouter>);
    expect(screen.getByText(/track signal lost/i)).toBeInTheDocument();
    expect(screen.getByText(/return to library/i)).toBeInTheDocument();
  });

  it('renders known track and key actions', async () => {
    libRef.current = { ...libRef.current, tracks: [{ id:'t1', title:'Known Track', artist:'Known Artist', album:'Known Album', genre:'synth', sourceType:'downloaded', sourceUrl:'https://x', localUrl:'blob:x', format:'mp3', bitrate:320, duration:60, size:2048, createdAt:1, updatedAt:1, favorite:false }] };
    playerRef.current = { ...playerRef.current, currentTrackId: 't1' };
    const { TrackDetail } = await import('../src/pages/TrackDetail');
    render(<MemoryRouter initialEntries={['/track/t1']}><Routes><Route path="/track/:id" element={<TrackDetail />} /></Routes></MemoryRouter>);
    expect(screen.getByText(/known track/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play \/ pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open player/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open equalizer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to library/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit metadata/i })).toBeInTheDocument();
  });
});
