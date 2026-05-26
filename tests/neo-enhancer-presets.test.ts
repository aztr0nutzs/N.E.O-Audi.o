import { describe, expect, it } from 'vitest';
import { NEO_ENHANCER_PRESETS, applyEnhancerProfile, dbToGain } from '../src/lib/neoEnhancerPresets';

describe('neo enhancer presets', () => {
  it('all modes exist', () => {
    expect(Object.keys(NEO_ENHANCER_PRESETS).sort()).toEqual(['bassReactor','cleanBoost','neoDps','nightMode','off','spatial3d','vocalClarity'].sort());
  });
  it('dbToGain works', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(6)).toBeGreaterThan(1);
  });
  it('apply profile clamps output and safe gain works', () => {
    const base = applyEnhancerProfile({ enabled: true, mode: 'bassReactor', outputProfile: 'headphones', intensity: 1, bass: 1, clarity: 0.5, spatial: 0.5, loudness: 1, limiter: true, safeGain: false });
    const safe = applyEnhancerProfile({ enabled: true, mode: 'bassReactor', outputProfile: 'headphones', intensity: 1, bass: 1, clarity: 0.5, spatial: 0.5, loudness: 1, limiter: true, safeGain: true });
    expect(base.outputGain).toBeLessThanOrEqual(1);
    expect(base.outputGain).toBeGreaterThanOrEqual(0.55);
    expect(safe.outputGain).toBeLessThanOrEqual(base.outputGain);
  });
});
