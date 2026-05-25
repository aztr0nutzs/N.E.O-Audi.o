import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('../src/store/usePlayerStore', () => ({
  usePlayerStore: () => ({
    currentTrackId: null,
    isPlaying: false,
    next: vi.fn(),
    setProgress: vi.fn(),
    setDuration: vi.fn(),
    volume: 1,
    seekRequest: null,
    clearSeekRequest: vi.fn(),
    playbackSpeed: 1,
    setError: vi.fn(),
    setAnalyserNode: vi.fn(),
  }),
}));

vi.mock('../src/store/useLibraryStore', () => ({
  useLibraryStore: (sel: any) => sel({ getAudioUrl: vi.fn() }),
}));

describe('AudioDriver signal chain', () => {
  it('renders without crashing when signal chain store exists', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const { AudioDriver } = await import('../src/components/layout/AudioDriver');
    const { container } = render(<AudioDriver />);
    expect(container.querySelector('audio')).toBeInTheDocument();
  });
});
