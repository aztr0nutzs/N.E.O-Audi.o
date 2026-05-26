import { beforeEach, describe, expect, it } from 'vitest';
import { useAudioEnhancerStore } from '../src/store/useAudioEnhancerStore';

describe('audio enhancer store', () => {
  beforeEach(() => { localStorage.clear(); useAudioEnhancerStore.getState().resetEnhancer(); useAudioEnhancerStore.getState().clearAB(); });
  it('defaults', () => {
    const s = useAudioEnhancerStore.getState().settings;
    expect(s.mode).toBe('off'); expect(s.outputProfile).toBe('headphones'); expect(s.limiter).toBe(true);
  });
  it('mode and clamps', () => {
    useAudioEnhancerStore.getState().setMode('neoDps');
    useAudioEnhancerStore.getState().setBass(2);
    expect(useAudioEnhancerStore.getState().settings.mode).toBe('neoDps');
    expect(useAudioEnhancerStore.getState().settings.bass).toBe(1);
  });
  it('reset and AB', () => {
    const st = useAudioEnhancerStore.getState();
    st.setMode('vocalClarity'); st.captureA(); st.setMode('bassReactor'); st.captureB(); st.applyA();
    expect(useAudioEnhancerStore.getState().settings.mode).toBe('vocalClarity');
    st.resetEnhancer();
    expect(useAudioEnhancerStore.getState().settings.mode).toBe('off');
  });
  it('persistence does not crash', () => {
    expect(() => useAudioEnhancerStore.getState().save()).not.toThrow();
    expect(() => useAudioEnhancerStore.getState().load()).not.toThrow();
  });
});
