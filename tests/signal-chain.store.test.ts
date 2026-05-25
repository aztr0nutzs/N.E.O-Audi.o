import { beforeEach, describe, expect, it } from 'vitest';
import { useSignalChainStore } from '../src/store/useSignalChainStore';

describe('useSignalChainStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSignalChainStore.getState().resetSignalChain();
  });

  it('creates default modules with limiter enabled', () => {
    const { modules } = useSignalChainStore.getState();
    expect(Object.keys(modules)).toEqual(expect.arrayContaining(['eq', 'bass', 'spatial', 'compressor', 'limiter', 'night', 'vocal']));
    expect(modules.eq.enabled).toBe(true);
    expect(modules.limiter.enabled).toBe(true);
  });

  it('toggleModule works', () => {
    useSignalChainStore.getState().toggleModule('bass');
    expect(useSignalChainStore.getState().modules.bass.enabled).toBe(true);
  });

  it('setModuleIntensity clamps values', () => {
    useSignalChainStore.getState().setModuleIntensity('bass', 9);
    expect(useSignalChainStore.getState().modules.bass.intensity).toBe(1);
    useSignalChainStore.getState().setModuleIntensity('bass', -1);
    expect(useSignalChainStore.getState().modules.bass.intensity).toBe(0);
  });

  it('resetSignalChain restores defaults', () => {
    useSignalChainStore.getState().setModuleEnabled('bass', true);
    useSignalChainStore.getState().resetSignalChain();
    expect(useSignalChainStore.getState().modules.bass.enabled).toBe(false);
  });

  it('apply preset updates modules', () => {
    useSignalChainStore.getState().applySignalChainPreset('bass-reactor');
    const state = useSignalChainStore.getState();
    expect(state.modules.bass.enabled).toBe(true);
    expect(state.modules.limiter.enabled).toBe(true);
    expect(state.activePreset).toBe('bass-reactor');
  });

  it('saves and loads persisted state', () => {
    useSignalChainStore.getState().setModuleEnabled('vocal', true);
    useSignalChainStore.getState().setOutputGain(1.2);
    useSignalChainStore.getState().saveSignalChainState();
    useSignalChainStore.getState().resetSignalChain();
    useSignalChainStore.getState().loadSignalChainState();
    expect(useSignalChainStore.getState().modules.vocal.enabled).toBe(true);
    expect(useSignalChainStore.getState().outputGain).toBe(1.2);
  });
});

