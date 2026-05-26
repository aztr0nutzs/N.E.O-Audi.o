import type { NeoEnhancerMode, NeoEnhancerSettings, NeoOutputProfile } from '../types';

export type NeoEnhancerProfile = {
  preampDb: number;
  lowShelfDb: number;
  bassFreq: number;
  mudCutDb: number;
  mudFreq: number;
  presenceDb: number;
  presenceFreq: number;
  airDb: number;
  airFreq: number;
  compressor: { threshold: number; knee: number; ratio: number; attack: number; release: number };
  limiter: { threshold: number; knee: number; ratio: number; attack: number; release: number };
  stereoWidth: number;
  outputGain: number;
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const dbToGain = (db: number) => Math.pow(10, db / 20);

export const NEO_ENHANCER_PRESETS: Record<NeoEnhancerMode, NeoEnhancerProfile> = {
  off: { preampDb: 0, lowShelfDb: 0, bassFreq: 95, mudCutDb: 0, mudFreq: 260, presenceDb: 0, presenceFreq: 3100, airDb: 0, airFreq: 10500, compressor: { threshold: 0, knee: 40, ratio: 1, attack: 0.003, release: 0.25 }, limiter: { threshold: -2, knee: 0, ratio: 20, attack: 0.001, release: 0.08 }, stereoWidth: 0, outputGain: 1 },
  cleanBoost: { preampDb: 0.8, lowShelfDb: 1.8, bassFreq: 100, mudCutDb: -1.2, mudFreq: 280, presenceDb: 1.3, presenceFreq: 3300, airDb: 1, airFreq: 11000, compressor: { threshold: -20, knee: 18, ratio: 2.1, attack: 0.007, release: 0.2 }, limiter: { threshold: -2.5, knee: 0, ratio: 16, attack: 0.002, release: 0.08 }, stereoWidth: 0.08, outputGain: 0.96 },
  neoDps: { preampDb: 1.2, lowShelfDb: 2.4, bassFreq: 92, mudCutDb: -1.5, mudFreq: 260, presenceDb: 1.8, presenceFreq: 3200, airDb: 1.4, airFreq: 10800, compressor: { threshold: -22, knee: 16, ratio: 2.7, attack: 0.006, release: 0.18 }, limiter: { threshold: -3, knee: 0, ratio: 18, attack: 0.001, release: 0.07 }, stereoWidth: 0.12, outputGain: 0.93 },
  spatial3d: { preampDb: 0.2, lowShelfDb: 0.8, bassFreq: 98, mudCutDb: -0.8, mudFreq: 300, presenceDb: 1.2, presenceFreq: 3500, airDb: 2, airFreq: 12000, compressor: { threshold: -19, knee: 20, ratio: 1.8, attack: 0.01, release: 0.22 }, limiter: { threshold: -2.8, knee: 0, ratio: 14, attack: 0.001, release: 0.08 }, stereoWidth: 0.22, outputGain: 0.95 },
  bassReactor: { preampDb: 0.4, lowShelfDb: 3.2, bassFreq: 86, mudCutDb: -1.8, mudFreq: 240, presenceDb: 0.8, presenceFreq: 2800, airDb: 0.4, airFreq: 10000, compressor: { threshold: -24, knee: 14, ratio: 3.3, attack: 0.005, release: 0.18 }, limiter: { threshold: -3.4, knee: 0, ratio: 20, attack: 0.001, release: 0.065 }, stereoWidth: 0.06, outputGain: 0.9 },
  vocalClarity: { preampDb: 0.6, lowShelfDb: 0.4, bassFreq: 102, mudCutDb: -2.4, mudFreq: 310, presenceDb: 2.8, presenceFreq: 3600, airDb: 1.8, airFreq: 12500, compressor: { threshold: -20, knee: 15, ratio: 2.2, attack: 0.006, release: 0.19 }, limiter: { threshold: -2.6, knee: 0, ratio: 15, attack: 0.001, release: 0.08 }, stereoWidth: 0.09, outputGain: 0.95 },
  nightMode: { preampDb: -0.6, lowShelfDb: 1.2, bassFreq: 95, mudCutDb: -0.9, mudFreq: 280, presenceDb: 0.2, presenceFreq: 2900, airDb: -2.2, airFreq: 7800, compressor: { threshold: -26, knee: 24, ratio: 4.2, attack: 0.003, release: 0.32 }, limiter: { threshold: -4, knee: 0, ratio: 22, attack: 0.001, release: 0.09 }, stereoWidth: 0.04, outputGain: 0.9 },
};

export const NEO_OUTPUT_PROFILES: Record<NeoOutputProfile, { lowShelfTrimDb: number; presenceTrimDb: number; loudnessTrim: number }> = {
  headphones: { lowShelfTrimDb: 0, presenceTrimDb: 0, loudnessTrim: 0 },
  phoneSpeaker: { lowShelfTrimDb: -2.2, presenceTrimDb: 1.2, loudnessTrim: 0.1 },
  bluetoothSpeaker: { lowShelfTrimDb: -0.8, presenceTrimDb: 0.5, loudnessTrim: 0.06 },
  carAudio: { lowShelfTrimDb: -1, presenceTrimDb: 0.3, loudnessTrim: 0.08 },
  earbuds: { lowShelfTrimDb: -0.3, presenceTrimDb: 0.8, loudnessTrim: 0.04 },
  outdoor: { lowShelfTrimDb: -1.4, presenceTrimDb: 1.1, loudnessTrim: 0.12 },
};

export const applyEnhancerProfile = (settings: NeoEnhancerSettings) => {
  const preset = NEO_ENHANCER_PRESETS[settings.mode];
  const profile = NEO_OUTPUT_PROFILES[settings.outputProfile];
  const intensity = clamp01(settings.intensity);
  const bass = clamp01(settings.bass);
  const clarity = clamp01(settings.clarity);
  const spatial = clamp01(settings.spatial);
  const loudness = clamp01(settings.loudness);
  const boostRisk = (intensity + bass + loudness) / 3;
  const safeCut = settings.safeGain ? Math.max(0, (boostRisk - 0.58) * 0.34) : 0;

  return {
    preampGain: dbToGain((preset.preampDb + loudness * 1.4) * intensity),
    lowShelfDb: (preset.lowShelfDb + bass * 4 + profile.lowShelfTrimDb) * intensity,
    bassFreq: preset.bassFreq,
    mudCutDb: (preset.mudCutDb - bass * 0.8) * intensity,
    mudFreq: preset.mudFreq,
    presenceDb: (preset.presenceDb + clarity * 3 + profile.presenceTrimDb) * intensity,
    presenceFreq: preset.presenceFreq,
    airDb: (preset.airDb + clarity * 1.4) * intensity,
    airFreq: preset.airFreq,
    compressor: preset.compressor,
    limiter: preset.limiter,
    stereoPanAmount: (preset.stereoWidth + spatial * 0.25) * intensity,
    outputGain: Math.max(0.55, Math.min(1, preset.outputGain - profile.loudnessTrim - safeCut)),
  };
};
