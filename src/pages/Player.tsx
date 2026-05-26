import { useRef, useEffect } from 'react';
import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { ReactorCoreVisual } from '../components/ui/ReactorCoreVisual';
import { Volume2, AlertTriangle } from 'lucide-react';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { NeoAudioHeader } from '../components/layout/NeoAudioHeader';
import { NeoImageButton } from '../components/ui/NeoImageButton';
import { useAnalyzerStore } from '../store/useAnalyzerStore';
import { NEO_AUDIO_BUTTONS } from '../lib/neoAudioAssets';
import { MetadataLab } from '../components/library/MetadataLab';
import { QueuePanel } from '../components/player/QueuePanel';
import { CoverArt } from '../components/media/CoverArt';
import { useSignalChainStore } from '../store/useSignalChainStore';

export function Player() {
  const {
    currentTrackId, isPlaying, pause, resume, stop, next, previous,
    seekForward, seekBackward, progress, volume, setVolume,
    repeat, toggleRepeat, shuffle, toggleShuffle, seekTo,
    analyserNode, error, duration: audioDuration, playbackSpeed, setSpeed,
  } = usePlayerStore();
  const tracks = useLibraryStore(state => state.tracks);
  const navigate = useNavigate();
  const setAnalyzerOpen = useAnalyzerStore(state => state.setAnalyzerOpen);
  const signalModules = useSignalChainStore(state => state.modules);
  const clippingWarning = useSignalChainStore(state => state.clippingWarning);

  const track = tracks.find(t => t.id === currentTrackId);
  const duration = audioDuration || track?.duration || 0;
  const visualizerBarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const noTrack = !track;
  const [metadataOpen, setMetadataOpen] = React.useState(false);
  const [queueOpen, setQueueOpen] = React.useState(false);

  useEffect(() => {
     if (!analyserNode || !isPlaying) return;
     let animationId: number;
     const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

     const draw = () => {
        animationId = requestAnimationFrame(draw);
        analyserNode.getByteFrequencyData(dataArray);

        const step = Math.floor(dataArray.length / 72);
        for (let i = 0; i < 36; i++) {
           const val = dataArray[i * step];
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

  if (!track) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4 gap-6 w-full max-w-lg mx-auto">
        <NeoAudioHeader variant="header4" className="w-full" alt="N.E.O Audio Lab player" />
        <div className="hud-panel w-full max-w-sm aspect-square flex flex-col items-center justify-center border-gray-800">
           <ReactorCoreVisual className="w-1/2 h-1/2 opacity-20" intensity="low" />
           <p className="mt-8 font-mono text-sm tracking-widest text-gray-600">AWAITING SIGNAL</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <NeoImageButton
            src={NEO_AUDIO_BUTTONS.playlist}
            alt="Queue"
            label="Queue / Up Next"
            size="md"
            onClick={() => setQueueOpen(true)}
          />
          <NeoImageButton
            src={NEO_AUDIO_BUTTONS.playlist}
            alt="Library"
            label="Open library"
            size="md"
            onClick={() => navigate('/library')}
          />
          <NeoImageButton
            src={NEO_AUDIO_BUTTONS.download}
            alt="Downloader"
            label="Open downloader"
            size="md"
            onClick={() => navigate('/download')}
          />
          <NeoImageButton
            src={NEO_AUDIO_BUTTONS.equalizer}
            alt="Equalizer"
            label="Open equalizer"
            size="md"
            onClick={() => navigate('/equalizer')}
          />
          <NeoImageButton
            src={NEO_AUDIO_BUTTONS.settings}
            alt="Settings"
            label="Open settings"
            size="md"
            onClick={() => navigate('/settings')}
          />
          <NeoImageButton
            src={NEO_AUDIO_BUTTONS.playlist}
            alt="Track Lab"
            label="Open Track Lab"
            size="md"
            disabled={!currentTrackId}
            onClick={() => currentTrackId && navigate(`/track/${currentTrackId}`)}
          />
        </div>
        <QueuePanel mode="drawer" open={queueOpen} onClose={() => setQueueOpen(false)} />
      </div>
    );
  }

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-24 flex flex-col items-center p-4 space-y-6">

      <NeoAudioHeader variant="header4" className="w-full" alt="N.E.O Audio Lab player" />

      {/* Top Title HUD */}
      <div className="armored-frame p-2 px-6 border-neo-cyan/50 shadow-[0_0_15px_rgba(0,240,255,0.2)] w-full relative flex items-center justify-between gap-2 min-h-[64px]">
         <NeoImageButton
           src={NEO_AUDIO_BUTTONS.shuffle}
           alt="Shuffle"
           label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
           active={shuffle}
           size="sm"
           onClick={toggleShuffle}
         />
         <h1 className="text-xl md:text-2xl font-bold italic text-white tracking-widest uppercase text-center drop-shadow-md flex-1">
            <span className="text-neo-cyan">N.E.O.</span> the <span className="text-neo-nerd">AUDIO ENGINE</span>
         </h1>
         <div className="relative">
           <NeoImageButton
             src={NEO_AUDIO_BUTTONS.repeat}
             alt="Repeat"
             label={`Repeat mode: ${repeat}`}
             active={repeat !== 'off'}
             size="sm"
             onClick={toggleRepeat}
           />
           {repeat === 'one' && (
             <span className="absolute -bottom-1 -right-1 text-[9px] font-bold text-neo-cyan drop-shadow-[0_0_3px_currentColor] pointer-events-none">1</span>
           )}
         </div>
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
         <div className="absolute inset-[28%] rounded-full overflow-hidden border border-neo-cyan/40 shadow-[0_0_25px_rgba(0,240,255,0.22)]">
            <CoverArt track={track} size="xl" active={isPlaying} className="h-full w-full rounded-full border-0 opacity-90" imageClassName="rounded-full" />
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

      <div className="w-full cyber-panel border-neo-cyan/30 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neo-cyan">Signal Chain</span>
          <button
            type="button"
            onClick={() => navigate('/equalizer')}
            className="border border-neo-cyan/50 bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-neo-cyan hover:bg-neo-cyan/10"
          >
            Open Signal Chain
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {(['eq', 'bass', 'spatial', 'limiter'] as const).map(id => (
            <div key={id} className={cn('border bg-black/50 px-2 py-2 font-mono text-[9px] uppercase tracking-widest', signalModules[id].enabled ? 'border-neo-lime text-neo-lime' : 'border-gray-800 text-gray-500')}>
              {id}
            </div>
          ))}
        </div>
        {clippingWarning && <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-neo-red">Estimated clipping risk</p>}
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
                aria-label="Seek track"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              <div className="absolute left-0 h-full bg-neo-lime shadow-[0_0_10px_#39ff14] rounded-full pointer-events-none" style={{ width: `${(progress || 0) * 100}%` }} />
           </div>
           <span className="text-[10px] font-mono text-neo-lime w-12">
             {formatDuration(duration)}
           </span>
         </div>

         {/* Transport Controls Block */}
         <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-gray-800 relative overflow-hidden gap-1 flex-wrap">
            <div className="absolute top-0 left-0 w-1 h-full bg-neo-cyan shadow-[0_0_10px_#00f0ff]" />
            <NeoImageButton
              src={NEO_AUDIO_BUTTONS.previous}
              alt="Previous"
              label="Previous track"
              size="md"
              disabled={noTrack}
              onClick={previous}
            />
            <NeoImageButton
              src={NEO_AUDIO_BUTTONS.rewind}
              alt="Rewind"
              label="Rewind 15 seconds"
              size="md"
              disabled={noTrack}
              onClick={() => seekBackward(15)}
            />
            {isPlaying ? (
              <NeoImageButton
                src={NEO_AUDIO_BUTTONS.pause}
                alt="Pause"
                label="Pause"
                size="lg"
                active
                disabled={noTrack}
                onClick={pause}
              />
            ) : (
              <NeoImageButton
                src={NEO_AUDIO_BUTTONS.play}
                alt="Play"
                label="Play"
                size="lg"
                disabled={noTrack}
                onClick={resume}
              />
            )}
            <NeoImageButton
              src={NEO_AUDIO_BUTTONS.stop}
              alt="Stop"
              label="Stop"
              size="md"
              disabled={noTrack}
              onClick={stop}
            />
            <NeoImageButton
              src={NEO_AUDIO_BUTTONS.fastForward}
              alt="Fast forward"
              label="Fast-forward 15 seconds"
              size="md"
              disabled={noTrack}
              onClick={() => seekForward(15)}
            />
            <NeoImageButton
              src={NEO_AUDIO_BUTTONS.next}
              alt="Next"
              label="Next track"
              size="md"
              disabled={noTrack}
              onClick={next}
            />
         </div>

         {/* Lower Option Buttons */}
         <div className="flex justify-between gap-2 items-stretch">
            <ActionBlock
              icon={
                <div className="group relative w-full flex flex-col items-center">
                  <Volume2 className="text-neo-cyan mb-1"/>
                  <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} aria-label="Volume" className="w-12 h-1 bg-gray-800 rounded-full appearance-none cursor-pointer" />
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
                        aria-label={`Set speed to ${s}x`}
                        aria-pressed={playbackSpeed === s}
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
         </div>

         {/* Image Shortcut Rail */}
         <div className="flex justify-between gap-2 items-center bg-black/30 p-2 rounded-xl border border-gray-800">
           <NeoImageButton
             src={NEO_AUDIO_BUTTONS.playlist}
             alt="Queue"
             label="Queue / Up Next"
             size="sm"
             onClick={() => setQueueOpen(true)}
           />
           <NeoImageButton
             src={NEO_AUDIO_BUTTONS.playlist}
             alt="Library"
             label="Open library"
             size="sm"
             onClick={() => navigate('/library')}
           />
           <NeoImageButton
             src={NEO_AUDIO_BUTTONS.eq}
             alt="EQ"
             label="Open equalizer"
             size="sm"
             onClick={() => navigate('/equalizer')}
           />
           <NeoImageButton
             src={NEO_AUDIO_BUTTONS.equalizer}
             alt="Equalizer"
             label="Open advanced equalizer"
             size="sm"
             onClick={() => navigate('/equalizer')}
           />
           <NeoImageButton
             src={NEO_AUDIO_BUTTONS.download}
             alt="Download"
             label="Open downloader"
             size="sm"
             onClick={() => navigate('/download')}
           />
           <NeoImageButton
             src={NEO_AUDIO_BUTTONS.settings}
             alt="Settings"
             label="Open settings"
             size="sm"
             onClick={() => navigate('/settings')}
           />
           <NeoImageButton
             src={NEO_AUDIO_BUTTONS.equalizer}
             alt="Analyzer"
             label="Open Live Analyzer"
             size="sm"
             onClick={() => setAnalyzerOpen(true)}
           />
           <NeoImageButton src={NEO_AUDIO_BUTTONS.settings} alt="Metadata" label="Open Metadata Lab" size="sm" disabled={!currentTrackId} onClick={() => setMetadataOpen(true)} />
           <NeoImageButton
             src={NEO_AUDIO_BUTTONS.playlist}
             alt="Track Lab"
             label="Open Track Lab"
             size="sm"
             disabled={!currentTrackId}
             onClick={() => currentTrackId && navigate(`/track/${currentTrackId}`)}
           />
         </div>
      </div>

      <QueuePanel mode="drawer" open={queueOpen} onClose={() => setQueueOpen(false)} />
      {track && (
        <MetadataLab
          track={track}
          open={metadataOpen}
          onClose={() => setMetadataOpen(false)}
          onSave={(patch) => useLibraryStore.getState().updateTrack(track.id, patch)}
        />
      )}
    </div>
  );
}

interface ActionBlockProps {
  icon: React.ReactNode;
  label: string;
  color: 'cyan' | 'magenta' | 'lime';
}

function ActionBlock({ icon, label, color }: ActionBlockProps) {
  const colorMap: Record<ActionBlockProps['color'], string> = {
    cyan: 'border-neo-cyan/50 text-neo-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.3)_inset]',
    magenta: 'border-neo-magenta/50 text-neo-magenta hover:shadow-[0_0_15px_rgba(255,0,255,0.3)_inset]',
    lime: 'border-neo-lime/50 text-neo-lime hover:shadow-[0_0_15px_rgba(57,255,20,0.3)_inset]',
  };

  return (
    <div className={cn("cyber-panel flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all", colorMap[color])}>
      <div className="opacity-80 flex items-center justify-center">{icon}</div>
      <span className="text-[10px] font-bold tracking-widest text-white uppercase">{label}</span>
    </div>
  );
}
