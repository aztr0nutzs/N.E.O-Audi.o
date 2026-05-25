import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, Menu, Activity, Sliders, Disc, Radio, Save, Cloud, Move } from 'lucide-react';
import { cn, formatDuration } from '../lib/utils';
import { usePlayerStore } from '../store/usePlayerStore';
import { useEqualizerStore, BANDS } from '../store/useEqualizerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { NeoAudioHeader } from '../components/layout/NeoAudioHeader';
import { useAnalyzerStore } from '../store/useAnalyzerStore';

export function Equalizer() {
  const { isOn, setIsOn, bandValues, setBandValue, setPreset, saveCustomPreset, activePreset, spatial, setSpatial } = useEqualizerStore();
  const { isPlaying, currentTrackId, progress, analyserNode } = usePlayerStore();
  const tracks = useLibraryStore(state => state.tracks);
  const setAnalyzerOpen = useAnalyzerStore(state => state.setAnalyzerOpen);
  
  const currentTrack = tracks.find(t => t.id === currentTrackId);
  const visualizerBarsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
     if (!analyserNode || !isPlaying || !isOn) return;
     let animationId: number;
     const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
     
     const draw = () => {
        animationId = requestAnimationFrame(draw);
        analyserNode.getByteFrequencyData(dataArray);
        
        // Render to 40 bars
        const step = Math.floor(dataArray.length / 80); // use lower half of freq for better visuals
        for (let i = 0; i < 40; i++) {
           const val = dataArray[i * step]; // 0 to 255
           const percent = 10 + (val / 255) * 90; 
           if (visualizerBarsRef.current[i]) {
              visualizerBarsRef.current[i]!.style.height = `${percent}%`;
           }
        }
     };
     draw();
     return () => cancelAnimationFrame(animationId);
  }, [analyserNode, isPlaying, isOn]);

  const handleBandChange = (index: number, value: number) => {
    setBandValue(index, value);
  };

  const generatePath = () => {
    if (bandValues.length === 0) return '';
    const width = 400;
    const height = 100;
    const step = width / (bandValues.length - 1);
    
    const getY = (val: number) => {
       const mappedVal = Math.max(-24, Math.min(12, val));
       return 50 - (mappedVal * (50 / 12));
    };

    let path = `M 0 ${getY(bandValues[0])}`;
    for (let i = 0; i < bandValues.length - 1; i++) {
        const x1 = i * step;
        const y1 = getY(bandValues[i]);
        const x2 = (i + 1) * step;
        const y2 = getY(bandValues[i + 1]);
        const cp1x = x1 + step / 2;
        const cp2x = x2 - step / 2;
        path += ` C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
    }
    return path;
  };

  const leftBands = BANDS.slice(0, 5);
  const rightBands = BANDS.slice(5, 10);
  
  const leftColors = ['neo-cyan', 'neo-magenta', 'neo-yellow', 'neo-lime', 'neo-orange'];
  const rightColors = ['neo-cyan', 'neo-magenta', 'neo-yellow', 'neo-lime', 'neo-orange'];

  return (
    <div className="max-w-6xl mx-auto min-h-[calc(100vh-100px)] pb-32 flex flex-col items-center p-2 sm:p-4 font-sans overflow-x-hidden pt-8">

      <NeoAudioHeader className="w-full mb-6" alt="N.E.O Audio Lab equalizer" />

      {/* Header */}
      <header className="w-full flex justify-between items-center armored-frame border-2 border-[#1a1a24] bg-[#0a0a0f] p-2 md:p-4 mb-8 shadow-[0_0_20px_rgba(0,0,0,0.8)] relative">
         <div className="absolute inset-0 pointer-events-none border border-neo-cyan/20 rounded-xl m-1" />
         
         <button className="text-neo-cyan hover:text-white transition-colors px-2">
            <Menu className="w-6 h-6" />
         </button>

         <div className="flex-1 flex justify-center items-center gap-2 md:gap-8 overflow-hidden whitespace-nowrap">
            <div className="flex items-center gap-2 text-neo-cyan px-2 hidden sm:flex">
               <Activity className="w-4 h-4" />
               <span className="font-mono text-[10px] md:text-xs tracking-widest italic font-bold">FREQ MATRIX</span>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neo-cyan via-neo-magenta to-neo-lime drop-shadow-[0_0_10px_rgba(255,0,255,0.5)]">
               CORE TUNE
            </h1>
            
            <div className="flex items-center gap-2 text-neo-yellow px-2 hidden sm:flex">
               <span className="font-mono text-[10px] md:text-xs tracking-widest italic font-bold">LIVE RESPONSE</span>
               <Activity className="w-4 h-4" />
            </div>
         </div>

         <button className="text-neo-cyan hover:text-white transition-colors px-2">
            <Settings className="w-6 h-6" />
         </button>
      </header>

      {/* Main Layout containing Sliders and Reactor */}
      <div className="w-full flex flex-col lg:flex-row justify-center items-stretch gap-4 md:gap-8 z-10 relative mt-4">
         
         {/* Left Sliders */}
         <div className="flex-1 armored-frame bg-[#0a0a0f] p-4 flex flex-row justify-between relative shadow-[0_0_20px_rgba(0,0,0,0.8)] min-w-[300px]">
             <div className="absolute -top-3 left-4 text-[9px] font-mono text-neo-cyan tracking-widest bg-[#0a0a0f] px-2 flex items-center gap-1 border border-neo-cyan/50 rounded shadow-[0_0_5px_#00f0ff_inset]">
                <Activity className="w-3 h-3" /> SYSTEM STATUS +
             </div>
             
             {leftBands.map((band, idx) => (
                <VerticalSlider 
                   key={band.freq} 
                   band={band} 
                   value={bandValues[idx]} 
                   onChange={(v: number) => handleBandChange(idx, v)} 
                   colorClass={`text-${leftColors[idx]}`}
                   bgClass={`bg-${leftColors[idx]}`}
                   borderColor={`border-${leftColors[idx]}`}
                />
             ))}
         </div>

         {/* Center Core Area */}
         <div className="flex-[1.5] flex flex-col items-center relative min-w-[320px]">
            {/* Spatial Control */}
            <div className="w-48 mb-4 armored-frame p-2 bg-black/80 flex flex-col items-center gap-1 border-neo-cyan/30 shadow-[0_0_10px_rgba(0,240,255,0.1)]">
               <span className="text-[8px] font-mono text-neo-cyan tracking-[0.2em] font-bold">SPATIAL PANNING</span>
               <div className="w-full flex items-center justify-between px-2 text-[8px] font-mono text-neo-cyan/50">
                  <span>L</span>
                  <span>C</span>
                  <span>R</span>
               </div>
               <input 
                  type="range" min="-1" max="1" step="0.01" 
                  value={spatial}
                  onChange={(e) => setSpatial(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-900 appearance-none cursor-pointer rounded-full"
               />
               <span className="text-[9px] font-mono text-neo-cyan mt-1">{spatial === 0 ? 'CENTER' : spatial < 0 ? `${Math.abs(Math.round(spatial * 100))}% LEFT` : `${Math.abs(Math.round(spatial * 100))}% RIGHT`}</span>
            </div>

            {/* The Reactor */}
            <div className={`relative w-72 h-72 lg:w-96 lg:h-96 rounded-full flex items-center justify-center mb-8 drop-shadow-[0_0_30px_rgba(0,0,0,1)] z-20 ${!isOn ? 'grayscale opacity-50' : ''}`}>
               {/* Base Dark Iron Ring */}
               <div className="absolute inset-0 rounded-full border-[20px] md:border-[30px] border-[#151520] shadow-[inset_0_0_30px_rgba(0,0,0,1),0_0_20px_rgba(0,0,0,1)] flex items-center justify-center">
                  <div className="absolute inset-[-10px] border-[3px] border-dashed border-gray-600 rounded-full" />
                  
                  {/* Glowing Cyan Track */}
                  <div className={`absolute inset-[10px] md:inset-[20px] rounded-full border-[6px] border-neo-cyan shadow-[0_0_20px_#00f0ff,inset_0_0_20px_#00f0ff] opacity-80 ${isOn && isPlaying ? 'animate-[ping_3s_linear_infinite]' : ''}`} />
                  <div className={`absolute inset-[10px] md:inset-[20px] rounded-full border-[6px] border-neo-cyan shadow-[0_0_20px_#00f0ff,inset_0_0_20px_#00f0ff] ${isOn && isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`} style={{ clipPath: 'polygon(0 0, 50% 0, 50% 50%, 0 50%)' }} />
                  
                  {/* Thick Rainbow Core */}
                  <div className="absolute inset-[25px] md:inset-[40px] rounded-full border-[10px] md:border-[15px] border-transparent" style={{ background: 'linear-gradient(135deg, #00f0ff, #ff00ff, #fce205) border-box', WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
                  
                  {/* Center Hub */}
                  <div className="absolute inset-[40px] md:inset-[60px] bg-[#050508] rounded-full shadow-[inset_0_0_50px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden">
                     {/* subtle background spin */}
                     <div className={`absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent,transparent,#00f0ff,transparent)] opacity-30 ${isOn && isPlaying ? 'animate-[spin_5s_linear_infinite]' : ''}`} />
                     
                     <span className="text-6xl md:text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-neo-cyan to-white drop-shadow-[0_0_20px_#00f0ff] z-10 pl-2">
                        N
                     </span>
                  </div>
                  
                  {/* Number Readout overlaid */}
                  <div className="absolute bottom-[20px] md:bottom-[30px] flex flex-col items-center bg-black/80 px-6 py-1 rounded-full border-t border-neo-cyan shadow-[0_0_15px_rgba(0,240,255,0.4)] backdrop-blur-md z-30">
                     <span className="text-2xl md:text-4xl font-bold italic text-neo-cyan drop-shadow-[0_0_10px_#00f0ff]">{activePreset}</span>
                     <span className="text-[6px] md:text-[8px] font-mono text-neo-lime tracking-widest text-center mt-1 uppercase leading-tight">{isOn ? 'ACTIVE' : 'BYPASS'}<br/>LIVE SPECTRUM ENGINE</span>
                  </div>
               </div>
            </div>

            {/* Spectrum & Curve Display */}
            <div className="w-full max-w-sm armored-frame bg-[#0a0a0f] border border-gray-700 p-4 -mt-24 pt-24 z-10 relative shadow-[0_0_30px_rgba(0,0,0,0.8)]">
               
               {/* Live Spectrum (Analyser) */}
               <div className="relative border border-neo-cyan/30 rounded p-2 mb-4 h-24 bg-black/50 overflow-hidden flex items-end justify-center gap-[2px] shadow-[inset_0_0_15px_rgba(0,240,255,0.1)]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neo-cyan tracking-widest bg-[#0a0a0f] px-2 z-10 border border-neo-cyan/50 rounded shadow-[0_0_5px_#00f0ff_inset]">LIVE SPECTRUM -</div>
                  
                  {Array.from({length: 40}).map((_, i) => (
                    <div
                      key={i}
                      ref={el => { visualizerBarsRef.current[i] = el; }}
                      className="flex-1 w-[2px] rounded-t-sm transition-all duration-75"
                      style={{ 
                          background: i < 15 ? '#00f0ff' : i < 30 ? '#39ff14' : '#fce205',
                          height: '10%'
                      }}
                    />
                  ))}
               </div>

               {/* Response Curve */}
               <div className="relative border border-neo-magenta/30 rounded p-2 h-32 bg-black/50 overflow-hidden shadow-[inset_0_0_15px_rgba(255,0,255,0.1)]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neo-cyan tracking-widest bg-[#0a0a0f] px-2 z-10 border border-neo-cyan/50 rounded shadow-[0_0_5px_#00f0ff_inset]">RESPONSE CURVE +</div>
                  
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none opacity-20">
                     {[12, 0, -12].map((label) => (
                        <div key={label} className="w-full h-[1px] bg-neo-cyan relative">
                           <span className="absolute -left-2 -top-2 text-[6px] font-mono text-neo-cyan bg-[#0a0a0f] px-1">
                              {label > 0 ? `+${label}` : label}
                           </span>
                        </div>
                     ))}
                  </div>

                  <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full p-2 drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]">
                     <defs>
                       <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#00f0ff" />
                          <stop offset="50%" stopColor="#ff00ff" />
                          <stop offset="100%" stopColor="#fce205" />
                       </linearGradient>
                     </defs>
                     <path 
                       d={generatePath()} 
                       fill="none" 
                       stroke="url(#curveGrad)" 
                       strokeWidth="3" 
                       vectorEffect="non-scaling-stroke"
                     />
                     {/* Control Points */}
                     {bandValues.map((val, idx) => {
                        const step = 400 / (bandValues.length - 1);
                        const x = idx * step;
                        const getY = (v: number) => 50 - (Math.max(-24, Math.min(12, v)) * (50 / 12));
                        const y = getY(val);
                        return (
                           <circle key={idx} cx={x} cy={y} r="4" fill="#0a0a0f" stroke="url(#curveGrad)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        );
                     })}
                  </svg>
                  
                  <div className="absolute bottom-0 w-full flex justify-between px-2 text-[6px] font-mono text-gray-500">
                     {BANDS.map(b => <span key={b.freq}>{b.label}</span>)}
                  </div>
               </div>

            </div>
         </div>

         {/* Right Sliders */}
         <div className="flex-1 armored-frame bg-[#0a0a0f] p-4 flex flex-row justify-between relative shadow-[0_0_20px_rgba(0,0,0,0.8)] min-w-[300px]">
             <div className="absolute -top-3 right-4 text-[9px] font-mono text-neo-cyan tracking-widest bg-[#0a0a0f] px-2 flex items-center gap-1 border border-neo-cyan/50 rounded shadow-[0_0_5px_#00f0ff_inset]">
                AUDIO PROFILE + <Activity className="w-3 h-3" />
             </div>
             
             {rightBands.map((band, idx) => (
                <VerticalSlider 
                   key={band.freq} 
                   band={band} 
                   value={bandValues[idx + 5]} 
                   onChange={(v: number) => handleBandChange(idx + 5, v)} 
                   colorClass={`text-${rightColors[idx]}`}
                   bgClass={`bg-${rightColors[idx]}`}
                   borderColor={`border-${rightColors[idx]}`}
                />
             ))}
         </div>
      </div>

      {/* Track Info Bar */}
      <div className="w-full max-w-5xl armored-frame border border-neo-magenta mt-8 bg-[#0a0a0f] p-3 px-6 flex flex-wrap md:flex-nowrap justify-between items-center text-xs md:text-sm font-mono shadow-[0_0_15px_rgba(255,0,255,0.2)] z-20">
         <div className="flex items-center gap-4 border-r border-gray-800 pr-4 md:pr-8 w-full md:w-auto mb-2 md:mb-0">
            <Activity className="w-6 h-6 text-neo-cyan animate-pulse" />
            <div>
               <div className="text-[10px] text-neo-cyan mb-1 font-bold">TRACK</div>
               <div className="font-sans font-bold text-white uppercase italic truncate max-w-[200px]">{currentTrack?.title || 'System Idle'}</div>
            </div>
         </div>
         <div className="flex-1 flex justify-around">
            <div className="text-center">
               <div className="text-[10px] text-gray-400 mb-1">BPM</div>
               <div className="text-neo-magenta font-bold">---</div>
            </div>
            <div className="text-center">
               <div className="text-[10px] text-gray-400 mb-1">KEY</div>
               <div className="text-neo-yellow font-bold">---</div>
            </div>
            <div className="text-center">
               <div className="text-[10px] text-gray-400 mb-1">TIME</div>
               <div className="text-neo-lime font-bold">
                  {formatDuration(progress * (currentTrack?.duration || 0))}
               </div>
            </div>
            <div className="text-center hidden sm:block">
               <div className="text-[10px] text-gray-400 mb-1">QUALITY</div>
               <div className="text-neo-orange font-bold">
                  {(() => {
                     const fmt = (currentTrack?.format || '').toLowerCase();
                     if (fmt === 'wav' || fmt === 'flac') return 'LOSSLESS';
                     if (currentTrack?.bitrate) return `${currentTrack.bitrate} kbps`;
                     return '---';
                  })()}
               </div>
            </div>
         </div>
      </div>

      {/* Hex Action Buttons */}
      <div className="w-full max-w-5xl mt-6 flex flex-wrap justify-center gap-2 md:gap-6 z-20">
         <HexAction icon={<Activity className="w-8 h-8"/>} label={isOn ? 'BYPASS EQ' : 'ENABLE EQ'} color="border-neo-orange text-neo-orange" onClick={() => setIsOn(!isOn)} />
         <HexAction icon={<Sliders className="w-8 h-8"/>} label="RESET" color="border-neo-cyan text-neo-cyan" onClick={() => setPreset('Flat')} />
         <HexAction icon={<Disc className="w-8 h-8"/>} label="BASS BOOST" color="border-neo-magenta text-neo-magenta" onClick={() => setPreset('Club (Bass)')} />
         <HexAction icon={<Move className="w-8 h-8"/>} label="SYNTH" color="border-neo-lime text-neo-lime" onClick={() => setPreset('Retro Synth')} />
         <HexAction icon={<Save className="w-8 h-8"/>} label="SAVE" color="border-neo-yellow text-neo-yellow" onClick={saveCustomPreset} />
         <HexAction icon={<Radio className="w-8 h-8"/>} label="OPEN ANALYZER" color="border-neo-cyan text-neo-cyan" onClick={() => setAnalyzerOpen(true)} />
      </div>

      <div className="mt-8 mb-2 font-mono text-[9px] uppercase tracking-widest text-[#00f0ff] opacity-50 block md:hidden">
         N.E.O. AUDIO REACTOR v2.6
      </div>
    </div>
  );
}

function VerticalSlider({ band, value, onChange, colorClass, bgClass, borderColor }: any) {
  return (
    <div className="flex flex-col items-center h-full min-h-[350px] w-12 lg:w-14 pt-4 pb-2 group">
      
      {/* Top Freq Label */}
      <div className={cn("font-bold text-[12px] mb-3 font-mono border border-transparent rounded px-1 group-hover:border-current bg-black/50 shadow-[0_0_5px_currentColor]", colorClass)}>
         {band.label}
      </div>

      <div className="relative flex-1 flex justify-center w-full my-2">
         {/* The outer physical slot */}
         <div className="w-4 h-full bg-[#050508] border border-[#1a1a24] rounded-full shadow-[inset_0_0_10px_rgba(0,0,0,1)] relative flex justify-center">
             
             {/* The glowing track value fill */}
             <div className="absolute bottom-0 w-2 bg-[#0a0a0f] rounded-full mb-[2px] flex items-end justify-center shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] overflow-hidden" 
                  style={{ height: 'calc(100% - 4px)' }}>
                <div 
                   className={cn("w-full transition-all duration-100 opacity-60 shadow-[0_0_10px_currentColor]", bgClass)}
                   style={{ height: `${((value + 24) / 36) * 100}%` }}
                />
             </div>

             {/* The actual HTML range input overlays entirely */}
             <input
                type="range"
                min="-24" max="12" step="0.1"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                style={{ appearance: 'slider-vertical', WebkitAppearance: 'slider-vertical' }}
             />
             
             {/* Rendered Physical Thumb - we position this absolutely based on value */}
             <div 
                className={cn("absolute w-10 lg:w-12 h-6 rounded bg-[#111] border group-hover:border-2 shadow-[0_0_15px_currentColor] pointer-events-none z-0 transition-all duration-75 flex flex-col items-center justify-center gap-[2px]", borderColor, colorClass)}
                style={{ bottom: `calc(${((value + 24) / 36) * 100}% - 12px)` }}
             >
                <div className={cn("w-6 h-px opacity-80", bgClass)} />
                <div className={cn("w-6 h-px opacity-80", bgClass)} />
             </div>
         </div>

         {/* Scale Marks */}
         <div className="absolute h-full left-1/2 -translate-x-1/2 w-8 lg:w-10 flex flex-col justify-between pointer-events-none opacity-20 py-2">
            <div className="w-full h-px bg-white" />
            <div className="w-3 h-px bg-white mx-auto" />
            <div className="w-full h-px bg-white" />
            <div className="w-3 h-px bg-white mx-auto" />
            <div className="w-full h-px bg-white" />
            <div className="w-3 h-px bg-white mx-auto" />
            <div className="w-full h-px bg-white" />
         </div>
      </div>

      {/* Bottom Labels */}
      <div className={cn("flex flex-col items-center mt-3 group-hover:scale-110 transition-transform", colorClass)}>
         <span className="text-[10px] font-mono text-gray-500 mb-[2px]">dB</span>
         <span className="font-bold font-mono text-[12px] leading-tight mt-1">{value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}</span>
      </div>
    </div>
  )
}

function HexAction({ icon, label, color, onClick }: any) {
   return (
      <button onClick={onClick} className={cn("hex-btn w-24 h-28 md:w-32 md:h-36 flex flex-col items-center justify-center p-2 group bg-black shadow-[0_0_20px_currentColor_inset]", color)}>
         <div className="mb-3 transition-transform group-hover:scale-110 drop-shadow-[0_0_10px_currentColor]">
            {icon}
         </div>
         <span className="text-[9px] md:text-[11px] font-bold tracking-widest uppercase font-mono drop-shadow-[0_0_5px_currentColor] text-center">{label}</span>
      </button>
   )
}
