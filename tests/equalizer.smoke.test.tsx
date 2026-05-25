import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('../src/store/useEqualizerStore', async () => {
  const actual = await import('../src/store/useEqualizerStore');
  return {
    ...actual,
    useEqualizerStore: () => ({
      isOn: true, setIsOn: vi.fn(), bandValues: [0,0,0,0,0,0,0,0,0,0], setBandValue: vi.fn(), setPreset: vi.fn(), saveCustomPreset: vi.fn(), activePreset: 'Flat', spatial: 0, setSpatial: vi.fn()
    })
  };
});
vi.mock('../src/store/usePlayerStore', () => ({ usePlayerStore: () => ({ isPlaying: false, currentTrackId: null, progress: 0, analyserNode: null }) }));
vi.mock('../src/store/useLibraryStore', () => ({ useLibraryStore: (sel: any) => sel({ tracks: [] }) }));
vi.mock('../src/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));
vi.mock('motion/react', () => ({ motion: { div: (props: any) => <div {...props} /> } }));
vi.mock('../src/store/useAnalyzerStore', () => ({ useAnalyzerStore: (sel: any) => sel({ setAnalyzerOpen: vi.fn() }) }));

describe('Equalizer smoke', () => {
  it('renders 10 slider bands', async () => {
    const { Equalizer } = await import('../src/pages/Equalizer');
    render(<Equalizer />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(10);
    expect(screen.getByText(/open analyzer/i)).toBeInTheDocument();
  });
});
