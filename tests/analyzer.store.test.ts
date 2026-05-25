import { describe, it, expect } from 'vitest';
import { useAnalyzerStore } from '../src/store/useAnalyzerStore';

describe('analyzer store', () => {
  it('toggleAnalyzer opens and closes', () => {
    useAnalyzerStore.setState({ isAnalyzerOpen: false, analyzerMode: 'spectrum' });
    useAnalyzerStore.getState().toggleAnalyzer();
    expect(useAnalyzerStore.getState().isAnalyzerOpen).toBe(true);
    useAnalyzerStore.getState().toggleAnalyzer();
    expect(useAnalyzerStore.getState().isAnalyzerOpen).toBe(false);
  });

  it('setAnalyzerMode changes mode', () => {
    useAnalyzerStore.getState().setAnalyzerMode('reactor');
    expect(useAnalyzerStore.getState().analyzerMode).toBe('reactor');
  });
});
