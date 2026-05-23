import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('../store/useEqualizerStore', async () => {
  const actual = await import('../useEqualizerStore');
  return {
    ...actual,
    useEqualizerStore: () => ({
      isOn: true, setIsOn: vi.fn(), bandValues: [0,0,0,0,0,0,0,0,0,0], setBandValue: vi.fn(), setPreset: vi.fn(), saveCustomPreset: vi.fn(), activePreset: 'Flat', spatial: 0, setSpatial: vi.fn()
    })
  };
});
vi.mock('../store/usePlayerStore', () => ({ usePlayerStore: () => ({ isPlaying: false, currentTrackId: null, progress: 0, analyserNode: null }) }));
vi.mock('../store/useLibraryStore', () => ({ useLibraryStore: (sel: any) => sel({ tracks: [] }) }));
vi.mock('../lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));
vi.mock('motion/react', () => ({ motion: { div: (props: any) => <div {...props} /> } }));

describe('Equalizer smoke', () => {
  it('renders 10 slider bands', async () => {
    const { Equalizer } = await import('../Equalizer');
    render(<Equalizer />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(10);
  });
});
