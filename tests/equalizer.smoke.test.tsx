import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const setPreset = vi.fn();

vi.mock('../src/store/useEqualizerStore', async () => {
  const actual = await import('../src/store/useEqualizerStore');
  return {
    ...actual,
    useEqualizerStore: () => ({
      isOn: true,
      setIsOn: vi.fn(),
      bandValues: [0,0,0,0,0,0,0,0,0,0],
      setBandValue: vi.fn(),
      setPreset,
      saveCustomPreset: vi.fn(),
      renameCustomPreset: vi.fn(),
      deleteCustomPreset: vi.fn(),
      resetToFlat: vi.fn(),
      activePreset: 'Flat',
      activePresetId: 'flat',
      spatial: 0,
      setSpatial: vi.fn(),
      presets: actual.BUILT_IN_PRESETS,
      customPresets: [],
      compareA: null,
      compareB: null,
      activeCompareSlot: 'A',
      setCompareSlot: vi.fn(),
      captureCompareA: vi.fn(),
      captureCompareB: vi.fn(),
      applyCompareA: vi.fn(),
      applyCompareB: vi.fn(),
      swapCompare: vi.fn(),
      clearCompare: vi.fn(),
    })
  };
});
vi.mock('../src/store/usePlayerStore', () => ({ usePlayerStore: () => ({ isPlaying: false, currentTrackId: null, progress: 0, analyserNode: null }) }));
vi.mock('../src/store/useLibraryStore', () => ({ useLibraryStore: (sel: any) => sel({ tracks: [] }) }));
vi.mock('../src/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));
vi.mock('motion/react', () => ({ motion: { div: (props: any) => <div {...props} /> } }));
vi.mock('../src/store/useAnalyzerStore', () => ({ useAnalyzerStore: (sel: any) => sel({ setAnalyzerOpen: vi.fn() }) }));

describe('Equalizer smoke', () => {
  it('renders preset vault, compare controls, and 10 slider bands', async () => {
    const { Equalizer } = await import('../src/pages/Equalizer');
    render(<Equalizer />);
    expect(screen.getByText(/eq preset vault/i)).toBeInTheDocument();
    expect(screen.getByText(/audio signal chain/i)).toBeInTheDocument();
    expect(screen.getByText(/^signal chain$/i)).toBeInTheDocument();
    expect(screen.getByText(/signal curves \/ a-b tuning/i)).toBeInTheDocument();
    expect(screen.getByText(/N.E.O AUDIO ENHANCER/i)).toBeInTheDocument();
    ['Core', 'Bass', 'Vocals', 'Night', 'Retro', 'Device', 'Custom'].forEach(label => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
    expect(screen.getByText(/a\/b compare/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capture a/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply b/i })).toBeInTheDocument();
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(10);
    expect(screen.getAllByText(/open analyzer/i).length).toBeGreaterThan(0);
  });

  it('applying a preset calls store action when mocked', async () => {
    const { Equalizer } = await import('../src/pages/Equalizer');
    render(<Equalizer />);
    fireEvent.click(screen.getAllByRole('button', { name: /apply/i })[0]);
    expect(setPreset).toHaveBeenCalled();
  });
});
