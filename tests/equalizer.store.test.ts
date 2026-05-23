import { beforeEach, describe, expect, it } from 'vitest';
import { PRESETS, useEqualizerStore } from '../useEqualizerStore';

describe('useEqualizerStore', () => {
  beforeEach(() => {
    useEqualizerStore.setState({ isOn: true, activePreset: 'Flat', bandValues: [...PRESETS['Flat']], spatial: 0 });
    localStorage.removeItem('neo-custom-preset');
  });

  it('Flat preset applies flat bands', () => {
    useEqualizerStore.getState().setPreset('Flat');
    expect(useEqualizerStore.getState().bandValues).toEqual(PRESETS['Flat']);
  });

  it('Club/Bass preset applies values', () => {
    useEqualizerStore.getState().setPreset('Club (Bass)');
    expect(useEqualizerStore.getState().bandValues).toEqual(PRESETS['Club (Bass)']);
  });

  it('custom band value sets active preset to Custom', () => {
    useEqualizerStore.getState().setBandValue(0, 7);
    const s = useEqualizerStore.getState();
    expect(s.bandValues[0]).toBe(7);
    expect(s.activePreset).toBe('Custom');
  });

  it('save custom preset persists values', () => {
    useEqualizerStore.getState().setBandValue(0, 9);
    useEqualizerStore.getState().saveCustomPreset();
    const saved = JSON.parse(localStorage.getItem('neo-custom-preset') || '[]');
    expect(saved[0]).toBe(9);
  });
});
