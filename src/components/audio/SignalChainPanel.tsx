import { Activity, Radio, RotateCcw, Shield, Sliders } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SIGNAL_CHAIN_PRESETS, useSignalChainStore } from '../../store/useSignalChainStore';
import { SignalModuleId } from '../../types/signalChain';

const MODULES: Array<{ id: SignalModuleId; name: string; description: string }> = [
  { id: 'eq', name: 'EQ', description: '10-band curve stage from the preset vault.' },
  { id: 'bass', name: 'Bass Enhancer', description: 'Low-shelf reactor lift around the sub band.' },
  { id: 'spatial', name: 'Spatial', description: 'Honest stereo pan/intensity shaping.' },
  { id: 'compressor', name: 'Compressor', description: 'Gentle dynamic range control.' },
  { id: 'limiter', name: 'Limiter', description: 'Final safety limiter before output.' },
  { id: 'night', name: 'Night Mode', description: 'Softer highs and controlled late-night dynamics.' },
  { id: 'vocal', name: 'Vocal Clarity', description: 'Presence boost for voice and lead detail.' },
];

export function SignalChainPanel({ compact = false }: { compact?: boolean }) {
  const {
    modules,
    outputGain,
    clippingProtection,
    clippingWarning,
    estimatedPeak,
    toggleModule,
    setModuleIntensity,
    setOutputGain,
    setClippingProtection,
    resetSignalChain,
    applySignalChainPreset,
    saveSignalChainState,
  } = useSignalChainStore();

  const activeCount = Object.values(modules).filter(module => module.enabled).length;

  return (
    <section className="w-full cyber-panel border-neo-cyan/30 bg-[#050508]/90 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black italic uppercase tracking-widest text-neo-cyan drop-shadow-[0_0_8px_currentColor]">
            <Activity className="h-5 w-5" />
            SIGNAL CHAIN
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neo-magenta">
            SOURCE - EQ - BASS - SPATIAL - COMPRESSOR - LIMITER - OUTPUT
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="border border-neo-lime/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-neo-lime">
            {activeCount} ACTIVE
          </span>
          <button type="button" onClick={resetSignalChain} className="flex items-center gap-2 border border-gray-800 bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:border-neo-cyan hover:text-neo-cyan">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button type="button" onClick={saveSignalChainState} className="flex items-center gap-2 border border-gray-800 bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:border-neo-lime hover:text-neo-lime">
            <Shield className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>

      {!compact && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {SIGNAL_CHAIN_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applySignalChainPreset(preset.id)}
              className="shrink-0 border border-gray-800 bg-black px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:border-neo-magenta hover:text-neo-magenta"
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}

      <div className={cn('grid gap-3', compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3')}>
        {MODULES.map(item => {
          const module = modules[item.id];
          return (
            <article
              key={item.id}
              className={cn(
                'border bg-black/50 p-3 transition-colors',
                module.enabled ? 'border-neo-cyan shadow-[0_0_14px_rgba(0,240,255,0.2)]' : 'border-gray-800 opacity-80',
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">{item.name}</h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-gray-500">{item.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleModule(item.id)}
                  className={cn(
                    'shrink-0 border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest',
                    module.enabled ? 'border-neo-lime text-neo-lime' : 'border-gray-700 text-gray-500',
                  )}
                >
                  {module.enabled ? 'ACTIVE' : 'BYPASSED'}
                </button>
              </div>
              <label className="block font-mono text-[9px] uppercase tracking-widest text-gray-400">
                Intensity {Math.round(module.intensity * 100)}%
                <input
                  aria-label={`${item.name} intensity`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={module.intensity}
                  onChange={event => setModuleIntensity(item.id, Number(event.target.value))}
                  className="mt-2 w-full"
                />
              </label>
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="border border-gray-800 bg-black/50 p-3">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-neo-cyan">
            <Sliders className="h-4 w-4" />
            Output
          </h3>
          <label className="mt-3 block font-mono text-[9px] uppercase tracking-widest text-gray-400">
            Output gain {outputGain.toFixed(2)}x
            <input
              aria-label="Output gain"
              type="range"
              min="0"
              max="1.25"
              step="0.01"
              value={outputGain}
              onChange={event => setOutputGain(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </div>

        <div className="border border-gray-800 bg-black/50 p-3">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-neo-lime">
            <Shield className="h-4 w-4" />
            Protection
          </h3>
          <button
            type="button"
            onClick={() => setClippingProtection(!clippingProtection)}
            className={cn('mt-3 border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest', clippingProtection ? 'border-neo-lime text-neo-lime' : 'border-gray-700 text-gray-500')}
          >
            Clipping Protection {clippingProtection ? 'On' : 'Off'}
          </button>
        </div>

        <div className="border border-gray-800 bg-black/50 p-3">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-neo-magenta">
            <Radio className="h-4 w-4" />
            Peak Estimate
          </h3>
          <p className={cn('mt-3 font-mono text-xs uppercase tracking-widest', clippingWarning ? 'text-neo-red' : 'text-neo-cyan')}>
            {clippingWarning ? 'CLIPPING RISK' : 'CLEAR'} / {Math.round(estimatedPeak * 100)}%
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-gray-500">Estimated from analyser peak.</p>
        </div>
      </div>
    </section>
  );
}

