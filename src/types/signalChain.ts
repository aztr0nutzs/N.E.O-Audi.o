export type SignalModuleId =
  | 'eq'
  | 'bass'
  | 'spatial'
  | 'compressor'
  | 'limiter'
  | 'night'
  | 'vocal';

export type SignalModuleConfig = {
  id: SignalModuleId;
  enabled: boolean;
  intensity: number;
};

export type SignalChainState = {
  modules: Record<SignalModuleId, SignalModuleConfig>;
  outputGain: number;
  clippingProtection: boolean;
};

