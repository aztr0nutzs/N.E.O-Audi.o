import { cn } from '../../lib/utils';
import { useAudioEnhancerStore } from '../../store/useAudioEnhancerStore';

const modes = [
  ['cleanBoost', 'Clean Boost'],
  ['neoDps', 'N.E.O DPS'],
  ['spatial3d', '3D Spatial Field'],
  ['bassReactor', 'Bass Reactor'],
  ['vocalClarity', 'Vocal Clarity'],
  ['nightMode', 'Night Drive Safe Mode'],
] as const;

const profiles = [
  ['headphones', 'Headphones'], ['phoneSpeaker', 'Phone Speaker'], ['bluetoothSpeaker', 'Bluetooth Speaker'], ['carAudio', 'Car Audio'], ['earbuds', 'Earbuds'], ['outdoor', 'Outdoor'],
] as const;

export function NeoAudioEnhancerPanel() {
  const s = useAudioEnhancerStore();
  const st = s.settings;
  const slider = (label: string, value: number, onChange: (v: number) => void) => <label className="space-y-1"><div className="text-[10px] uppercase tracking-widest text-neo-cyan">{label}</div><input aria-label={label} type="range" min={0} max={1} step={0.01} value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full"/></label>;
  return <section className="cyber-panel neo-mobile-card mt-4">
    <h2 className="text-lg font-black uppercase tracking-widest text-neo-cyan">N.E.O AUDIO ENHANCER</h2>
    <p className="text-[10px] uppercase tracking-widest text-neo-magenta">DYNAMIC SIGNAL PROCESSING</p>
    <div className="mt-3 flex items-center justify-between"><span>Enabled</span><button onClick={()=>s.setEnabled(!st.enabled)}>{st.enabled?'ON':'OFF'}</button></div>
    <div className="mt-3 grid grid-cols-2 gap-2">{modes.map(([id,label])=><button key={id} onClick={()=>s.setMode(id)} className={cn('border p-2 text-xs',st.mode===id?'border-neo-cyan text-neo-cyan':'border-gray-800 text-gray-300')}>{label}</button>)}</div>
    <select aria-label="Output profile" className="mt-3 w-full bg-black border border-gray-700 p-2" value={st.outputProfile} onChange={e=>s.setOutputProfile(e.target.value as any)}>{profiles.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
    <div className="mt-3 space-y-2">{slider('Intensity',st.intensity,s.setIntensity)}{slider('Bass',st.bass,s.setBass)}{slider('Clarity',st.clarity,s.setClarity)}{slider('Spatial',st.spatial,s.setSpatial)}{slider('Loudness',st.loudness,s.setLoudness)}</div>
    <div className="mt-3 flex gap-2"><button onClick={()=>s.setLimiter(!st.limiter)}>Limiter: {st.limiter?'ON':'OFF'}</button><button onClick={()=>s.setSafeGain(!st.safeGain)}>Safe Gain: {st.safeGain?'ON':'OFF'}</button></div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><button onClick={s.captureA}>Capture A</button><button onClick={s.captureB}>Capture B</button><button onClick={s.applyA}>Apply A</button><button onClick={s.applyB}>Apply B</button><button onClick={s.swapAB}>Swap</button><button onClick={s.clearAB}>Clear</button></div>
    {!st.limiter && <p className="text-orange-400 text-xs mt-2">Limiter disabled: clipping risk</p>}
    {st.safeGain && (st.bass + st.loudness + st.intensity) / 3 > 0.7 && <p className="text-neo-lime text-xs mt-1">High boost detected: safe gain active</p>}
    <p className="text-gray-400 text-xs mt-1">Spatial is stereo widening, not licensed AM3D.</p>
  </section>
}
