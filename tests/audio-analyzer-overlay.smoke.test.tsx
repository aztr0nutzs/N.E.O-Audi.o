import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const setAnalyzerOpen = vi.fn();

const analyzerState = { isAnalyzerOpen: true, analyzerMode: 'spectrum', setAnalyzerMode: vi.fn(), setAnalyzerOpen };
vi.mock('../src/store/useAnalyzerStore', () => ({
  useAnalyzerStore: (sel?: any) => (typeof sel === 'function' ? sel(analyzerState) : analyzerState)
}));

vi.mock('../src/store/usePlayerStore', () => ({
  usePlayerStore: () => ({ analyserNode: null, isPlaying: false, currentTrackId: null })
}));

describe('AudioAnalyzerOverlay smoke', () => {
  it('renders analyzer title and modes and closes', async () => {
    const { AudioAnalyzerOverlay } = await import('../src/components/audio/AudioAnalyzerOverlay');
    render(<AudioAnalyzerOverlay />);

    expect(screen.getByText(/audio analyzer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /spectrum/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /waveform/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stereo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reactor/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close analyzer/i }));
    expect(setAnalyzerOpen).toHaveBeenCalledWith(false);
  });
});
