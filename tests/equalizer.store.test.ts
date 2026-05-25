import { beforeEach, describe, expect, it } from 'vitest';
import { BUILT_IN_PRESETS, PRESETS, useEqualizerStore } from '../src/store/useEqualizerStore';

const resetStore = () => {
  localStorage.clear();
  useEqualizerStore.setState({
    isOn: true,
    activePreset: 'Flat',
    activePresetId: 'flat',
    bandValues: [...PRESETS['Flat']],
    spatial: 0,
    presets: BUILT_IN_PRESETS,
    customPresets: [],
    compareA: null,
    compareB: null,
    activeCompareSlot: 'A',
  });
};

describe('useEqualizerStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('built-in presets exist by category', () => {
    const presets = useEqualizerStore.getState().presets;
    expect(presets.filter(preset => preset.category === 'core').map(preset => preset.name)).toContain('Flat');
    expect(presets.filter(preset => preset.category === 'bass').map(preset => preset.name)).toContain('Bass Boost');
    expect(presets.filter(preset => preset.category === 'vocals').map(preset => preset.name)).toContain('Vocal Clarity');
    expect(presets.filter(preset => preset.category === 'night').map(preset => preset.name)).toContain('Night Drive');
    expect(presets.filter(preset => preset.category === 'retro').map(preset => preset.name)).toContain('Retro Synth');
    expect(presets.filter(preset => preset.category === 'device').map(preset => preset.name)).toContain('Headphones');
    expect(presets.every(preset => preset.bandValues.length === 10)).toBe(true);
  });

  it('Flat preset applies flat bands', () => {
    useEqualizerStore.getState().setPreset('Flat');
    expect(useEqualizerStore.getState().bandValues).toEqual(PRESETS['Flat']);
  });

  it('Club/Bass preset applies values', () => {
    useEqualizerStore.getState().setPreset('Club (Bass)');
    expect(useEqualizerStore.getState().bandValues).toEqual(PRESETS['Club (Bass)']);
  });

  it('setPreset applies built-in preset by id', () => {
    useEqualizerStore.getState().setPreset('bass-boost');
    const s = useEqualizerStore.getState();
    expect(s.activePreset).toBe('Bass Boost');
    expect(s.bandValues).toEqual(BUILT_IN_PRESETS.find(preset => preset.id === 'bass-boost')!.bandValues);
  });

  it('custom band value sets active preset to Custom', () => {
    useEqualizerStore.getState().setBandValue(0, 7);
    const s = useEqualizerStore.getState();
    expect(s.bandValues[0]).toBe(7);
    expect(s.activePreset).toBe('Custom');
    expect(s.activePresetId).toBeNull();
  });

  it('save custom preset persists values', () => {
    useEqualizerStore.getState().setBandValue(0, 9);
    const savedPreset = useEqualizerStore.getState().saveCustomPreset('Sub Lab');
    const saved = JSON.parse(localStorage.getItem('neo-eq-custom-presets') || '[]');
    expect(savedPreset?.name).toBe('Sub Lab');
    expect(saved[0].bandValues[0]).toBe(9);
    expect(useEqualizerStore.getState().customPresets[0].name).toBe('Sub Lab');
  });

  it('renameCustomPreset works', () => {
    const preset = useEqualizerStore.getState().saveCustomPreset('Draft')!;
    useEqualizerStore.getState().renameCustomPreset(preset.id, 'Final Curve');
    expect(useEqualizerStore.getState().customPresets[0].name).toBe('Final Curve');
  });

  it('deleteCustomPreset works', () => {
    const preset = useEqualizerStore.getState().saveCustomPreset('Delete Me')!;
    useEqualizerStore.getState().deleteCustomPreset(preset.id);
    expect(useEqualizerStore.getState().customPresets).toEqual([]);
  });

  it('resetToFlat applies flat values', () => {
    useEqualizerStore.getState().setPreset('deep-bass');
    useEqualizerStore.getState().resetToFlat();
    expect(useEqualizerStore.getState().activePreset).toBe('Flat');
    expect(useEqualizerStore.getState().bandValues).toEqual(PRESETS['Flat']);
  });

  it('captureCompareA/B stores snapshots', () => {
    useEqualizerStore.getState().setBandValue(0, 4);
    useEqualizerStore.getState().captureCompareA();
    useEqualizerStore.getState().setBandValue(0, -4);
    useEqualizerStore.getState().captureCompareB();
    expect(useEqualizerStore.getState().compareA?.bandValues[0]).toBe(4);
    expect(useEqualizerStore.getState().compareB?.bandValues[0]).toBe(-4);
  });

  it('applyCompareA/B restores snapshots', () => {
    useEqualizerStore.setState({ compareA: { name: 'A', bandValues: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], spatial: -0.5 }, compareB: { name: 'B', bandValues: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0], spatial: 0.5 } });
    useEqualizerStore.getState().applyCompareA();
    expect(useEqualizerStore.getState().bandValues[0]).toBe(1);
    expect(useEqualizerStore.getState().spatial).toBe(-0.5);
    useEqualizerStore.getState().applyCompareB();
    expect(useEqualizerStore.getState().bandValues[0]).toBe(2);
    expect(useEqualizerStore.getState().spatial).toBe(0.5);
  });

  it('swapCompare swaps snapshots', () => {
    useEqualizerStore.setState({ compareA: { name: 'A', bandValues: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], spatial: 0 }, compareB: { name: 'B', bandValues: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0], spatial: 0 } });
    useEqualizerStore.getState().swapCompare();
    expect(useEqualizerStore.getState().compareA?.name).toBe('B');
    expect(useEqualizerStore.getState().compareB?.name).toBe('A');
  });
});
