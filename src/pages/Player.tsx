import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { ReactorCoreVisual } from '../components/ui/ReactorCoreVisual';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Network, Sliders, AlertTriangle } from 'lucide-react';
import { formatDuration } from '../lib/utils';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { NavLink } from 'react-router-dom';
import { NeoAudioHeader } from '../components/layout/NeoAudioHeader';

export function Player() {
  const { currentTrackId, isPlaying, pause, resume, next, previous, progress, volume, setVolume, repeat, toggleRepeat, shuffle, toggleShuffle, seekTo, analyserNode, error, duration: audioDuration, playbackSpeed, setSpeed } = usePlayerStore();
  const tracks = useLibraryStore(state => state.tracks);
  
  const track = tracks.find(t => t.id === currentTrackId);
  const duration = audioDuration || track?.duration || 0;
  const visualizerBarsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
     if (!analyserNode || !isPlaying) return;
     let animationId: number;
     const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
     
     const draw = () => {
        animationId = requestAnimationFrame(draw);
        analyserNode.getByteFrequencyData(dataArray);
        
        const step = Math.floor(dataArray.length / 72); 
        for (let i = 0; i < 36; i++) {
           const val = dataArray[i * step]; // 0 to 255
           const percent = 70 + (val / 255) * 40; 
           if (visualizerBarsRef.current[i]) {
              visualizerBarsRef.current[i]!.style.height = `${percent}%`;
           }
        }
     };
     draw();
     return () => cancelAnimationFrame(animationId);
  }, [analyserNode, isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
  };

  const activeRepeatColor = repeat === 'one' ? 'text-neo-cyan drop-shadow-[0_0_5px_currentColor]' : repeat === 'all' ? 'text-neo-lime drop-shadow-[0_0_5px_currentColor]' : 'text-gray-500 hover:text-white';

  if (!track) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4 gap-6 w-full max-w-lg mx-auto">
        <NeoAudioHeader className="w-full" alt="N.E.O Audio Lab player" />
        <div className="hud-panel w-full max-w-sm aspect-square flex flex-col items-center justify-center border-gray-800">
           <ReactorCoreVisual className="w-1/2 h-1/2 opacity-20" intensity="low" />
           <p className="mt-8 font-mono text-sm tracking-widest text-gray-600">AWAITING SIGNAL</p>
        </div>
      </div>
    );
  }

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-24 flex flex-col items-center p-4 space-y-6">

      <NeoAudioHeader className="w-full" alt="N.E.O Audio Lab player" />

      {/* Top Title HUD */}
      <div className="armored-frame p-2 px-6 border-neo-cyan/50 shadow-[0_0_15px_rgba(0,240,255,0.2)] w-full relative h-[52px]">
         <button onClick={toggleShuffle} className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", shuffle ? "text-neo-magenta drop-shadow-[0_0_5px_currentColor]" : "text-gray-500 hover:text-white")}>
            <Shuffle className="w-5 h-5" />
         </button>
         <h1 className="text-xl md:text-2xl font-bold italic text-white tracking-widest uppercase text-center drop-shadow-md">
            <span className="text-neo-cyan">N.E.O.</span> the <span className="text-neo-nerd">AUDIO ENGINE</span>
         </h1>
         <button onClick={toggleRepeat} className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors", activeRepeatColor)}>
            <Repeat className="w-5 h-5" />
            {repeat === 'one' && <span className="absolute -bottom-2 -right-1 text-[8px] font-bold">1</span>}
         </button>
      </div>

      {/* Info Panels */}
      <div className="w-full flex justify-between px-2 font-mono text-[10px] tracking-widest text-neo-cyan uppercase">
         <div className="flex flex-col">
            <span className="border-b border-neo-cyan/30 mb-1">TRACK INFO</span>
            <span>TYPE: {track.format || 'AUDIO'}</span>
            <span>RES: {track.bitrate ? `${track.bitrate}KBPS` : 'UNKNOWN'}</span>
         </div>
         <div className="flex flex-col items-end">
            <span className="border-b border-neo-cyan/30 mb-1">SYSTEM CLOCK</span>
            <span>SPEED {playbackSpeed}X</span>
            <span>LVL 49.3KHZ</span>
         </div>
      </div>

      {/* Main Reactor Vector Graphic Visualizer */}
      <div className="relative w-full aspect-square flex items-center justify-center pointer-events-none mt-4">
         <div className="absolute inset-0 rounded-full border border-neo-cyan/10" style={{ background: 'conic-gradient(from 180deg at 50% 50%, rgba(0, 240, 255, 0.1) 0deg, transparent 180deg, rgba(255, 0, 255, 0.1) 360deg)' }} />
         
         {/* Live Analyser Bars */}
         <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({length: 36}).map((_, i) => (
                <div 
                  key={i}
                  ref={el => { visualizerBarsRef.current[i] = el; }}
                  className="absolute w-1 rounded-t-sm transition-all duration-75"
                  style={{ 
                     height: '70%',
                     transformOrigin: 'bottom',
                     transform: `rotate(${i * 10}deg) translateY(-50%)`,
                     background: `linear-gradient(to top, ${i < 18 ? '#00f0ff' : '#ff00ff'}, transparent)`
                  }}
                />
            ))}
         </div>

         {/* Inner Reactor */}
         <div className="absolute inset-[15%] rounded-full bg-black">
            <ReactorCoreVisual className="w-full h-full" intensity={isPlaying ? 'high' : 'low'} />
         </div>
      </div>

      {/* Song Title */}
      <div className="text-center w-full px-6 mt-2 z-10 cyber-panel py-2 border-neo-magenta/30 min-h-[64px] flex flex-col justify-center">
         <h2 className="text-lg font-bold tracking-tight text-white truncate drop-shadow-[0_0_5px_currentColor]">{track.title}</h2>
         <p className="text-[10px] tracking-widest text-neo-cyan truncate uppercase">{track.artist}</p>
         {error && (
            <div className="flex items-center justify-center gap-2 mt-2 text-xs font-mono text-neo-red animate-pulse">
               <AlertTriangle className="w-3 h-3" />
               {error}
            </div>
         )}
      </div>

      {/* Bottom Interface */}
      <div className="w-full space-y-4 mt-auto">
         {/* Progress Bar Container */}
         <div className="flex items-center gap-3 px-2">
           <span className="text-[10px] font-mono text-neo-lime w-12 text-right">
             {formatDuration((progress || 0) * duration)}
           </span>
           <div className="relative flex-1 h-3 flex items-center bg-gray-900 border border-gray-700 rounded-full">
              <input 
                type="range" 
                min="0" max="1" step="0.001" 
                value={progress || 0} 
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              <div className="absolute left-0 h-full bg-neo-lime shadow-[0_0_10px_#39ff14] rounded-full pointer-events-none" style={{ width: `${(progress || 0) * 100}%` }} />
           </div>
           <span className="text-[10px] font-mono text-neo-lime w-12">
             {formatDuration(duration)}
           </span>
         </div>

         {/* Transport Controls Block */}
         <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-gray-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-neo-cyan shadow-[0_0_10px_#00f0ff]" />
            <button className="text-gray-400 hover:text-neo-cyan transition-colors" target-id="prev-btn" onClick={previous}>
              <SkipBack className="w-7 h-7 fill-current" />
            </button>
            <button 
              className="w-16 h-16 flex items-center justify-center rounded-full cyber-panel border-neo-cyan text-neo-cyan hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all active:scale-95"
              onClick={isPlaying ? pause : resume}
            >
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
            <button className="text-gray-400 hover:text-neo-cyan transition-colors" target-id="next-btn" onClick={next}>
              <SkipForward className="w-7 h-7 fill-current" />
            </button>
         </div>

         {/* Lower Option Buttons */}
         <div className="flex justify-between gap-2">
            <ActionBlock 
              icon={
                <div className="group relative w-full flex flex-col items-center">
                  <Volume2 className="text-neo-cyan mb-1"/>
                  <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-12 h-1 bg-gray-800 rounded-full appearance-none cursor-pointer" />
                </div>
              } 
              label={Math.round(volume * 100) + '%'} 
              color="cyan" 
            />
            <ActionBlock 
              icon={
                <div className="flex flex-wrap justify-center gap-1">
                   {speeds.map(s => (
                      <button 
                        key={s} 
                        onClick={() => setSpeed(s)}
                        className={cn("text-[8px] font-mono border border-gray-800 px-1 rounded hover:border-neo-lime", playbackSpeed === s && "text-neo-lime border-neo-lime")}
                      >
                         {s}x
                      </button>
                   ))}
                </div>
              }
              label="SPEED" 
              color="lime" 
            />
            <ActionBlock icon={<Sliders className="text-neo-magenta"/>} label="EQUALIZER" color="magenta" to="/equalizer" />
         </div>
      </div>
      
    </div>
  );
}

function ActionBlock({ icon, label, color, to, onClick }: any) {
  const colorMap: any = {
    cyan: 'border-neo-cyan/50 text-neo-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.3)_inset]',
    magenta: 'border-neo-magenta/50 text-neo-magenta hover:shadow-[0_0_15px_rgba(255,0,255,0.3)_inset]',
    lime: 'border-neo-lime/50 text-neo-lime hover:shadow-[0_0_15px_rgba(57,255,20,0.3)_inset]',
  };
  
  const content = (
    <>
      <div className="opacity-80 flex items-center justify-center">{icon}</div>
      <span className="text-[10px] font-bold tracking-widest text-white uppercase">{label}</span>
    </>
  );

  if (to) {
    return (
      <NavLink to={to} className={cn("cyber-panel flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all", colorMap[color])}>
        {content}
      </NavLink>
    );
  }

  if (onClick) {
    return (
       <button onClick={onClick} className={cn("cyber-panel flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all", colorMap[color])}>
          {content}
       </button>
    )
  }

  return (
     <div className={cn("cyber-panel flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all", colorMap[color])}>
        {content}
     </div>
  );
}
