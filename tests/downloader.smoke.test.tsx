import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../store/useDownloadStore', () => ({
  useDownloadStore: () => ({ jobs: [], loadJobs: vi.fn(), addJob: vi.fn(), startJob: vi.fn(), retryJob: vi.fn(), removeJob: vi.fn(), cancelJob: vi.fn() })
}));
vi.mock('../store/usePlayerStore', () => ({ usePlayerStore: () => vi.fn() }));
vi.mock('../store/useAppStore', () => ({ useAppStore: (sel: any) => sel({ settings: { defaultFormat: 'mp3', defaultBitrate: 320 } }) }));
vi.mock('../lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' ') }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../types', () => ({ SUPPORTED_FORMATS: ['mp3', 'wav', 'm4a'] }));

describe('Downloader smoke', () => {
  it('renders url input, add/start, formats, bitrates', async () => {
    const { Downloader } = await import('../Downloader');
    render(<MemoryRouter><Downloader /></MemoryRouter>);
    expect(screen.getByPlaceholderText(/enter http\/https url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add & start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'mp3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'wav' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'm4a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '128' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '320' })).toBeInTheDocument();
  });
});
