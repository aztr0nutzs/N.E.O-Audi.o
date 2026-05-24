import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { ReactorCoreVisual } from '../components/ui/ReactorCoreVisual';
import { useLibraryStore } from '../store/useLibraryStore';
import { useDownloadStore } from '../store/useDownloadStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Download, Upload, ListMusic, HardDrive, Zap, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { NeoAudioHeader } from '../components/layout/NeoAudioHeader';

export function Dashboard() {
  const tracks = useLibraryStore(state => state.tracks);
  const jobs = useDownloadStore(state => state.jobs);
  const currentTrackId = usePlayerStore(state => state.currentTrackId);
  const navigate = useNavigate();

  const totalSize = tracks.reduce((acc, t) => acc + (t.size || 0), 0);
  const formatSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1) + ' MB';

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <NeoAudioHeader className="mb-6" alt="N.E.O Audio Lab dashboard" />
      <header className="mb-6 border-b border-gray-800 pb-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full border-2 border-neo-cyan flex items-center justify-center neo-glow-cyan">
             <Shield className="w-5 h-5 text-neo-cyan" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white uppercase italic">Home / Dashboard</h1>
            <p className="text-xs text-neo-magenta uppercase tracking-wider">Neural Environment Robotic Director</p>
          </div>
        </motion.div>
      </header>

      {/* Main Stats HUD */}
      <div className="hud-panel p-5 border-neo-cyan/30 text-neo-cyan">
         <div className="flex justify-between items-center mb-4">
           <h3 className="font-bold tracking-widest">DOWNLOAD STATS</h3>
           <ActivityIcon />
         </div>
         
         <div className="flex text-sm space-x-6 mb-3 font-mono">
            <span className="flex items-center gap-1"><Download className="w-4 h-4 text-neo-lime"/> {formatSize(totalSize)}</span>
            <span className="flex items-center gap-1"><HardDrive className="w-4 h-4 text-neo-yellow"/> {tracks.length}</span>
         </div>

         {/* Mock Multi-color progress bars */}
         <div className="space-y-2">
            <div className="h-4 w-full flex gap-1">
               <div className="h-full bg-neo-cyan w-1/3 blur-[1px]" />
               <div className="h-full bg-neo-lime w-1/4 blur-[1px]" />
               <div className="h-full bg-neo-magenta w-[15%] blur-[1px]" />
               <div className="h-full bg-neo-yellow w-1/6 blur-[1px]" />
            </div>
            <div className="h-2 w-[80%] flex gap-1">
               <div className="h-full bg-neo-cyan/50 w-1/2" />
               <div className="h-full bg-neo-lime/50 w-1/4" />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <ActionHex text="FETCH" icon={<Download />} color="cyan" onClick={() => navigate('/download')} />
        <ActionHex text="UPLOAD" icon={<Upload />} color="lime" onClick={() => navigate('/upload')} />
        <ActionHex text="LIBRARY" icon={<ListMusic />} color="magenta" onClick={() => navigate('/library')} />
        <ActionHex text="PLAYER" icon={<PlayCircle />} color="yellow" onClick={() => navigate('/player')} />
      </div>

      <div className="mt-8">
         <h3 className="text-lg font-bold italic tracking-wide text-white mb-4">RECENTLY ACQUIRED</h3>
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tracks.slice(-4).map(track => (
               <div key={track.id} className="hud-panel p-3 border-gray-800 hover:border-neo-cyan/50 transition-colors cursor-pointer" onClick={() => navigate('/library')}>
                  <div className="aspect-square bg-[#0a0a0f] rounded border border-gray-800 flex items-center justify-center mb-3 overflow-hidden">
                     {track.coverArt ? (
                        <img src={track.coverArt} className="w-full h-full object-cover" />
                     ) : (
                        <ReactorCoreVisual className="w-full h-full opacity-50" intensity="low" />
                     )}
                  </div>
                  <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
                  <p className="text-xs text-neo-cyan truncate">{track.artist}</p>
               </div>
            ))}
            {tracks.length === 0 && (
               <div className="col-span-full py-8 text-center text-gray-500 border border-dashed border-gray-800 rounded-lg">
                  No data modules found in local storage.
               </div>
            )}
         </div>
      </div>
    </div>
  );
}

function ActionHex({ text, icon, color, onClick }: any) {
  const colorMap: any = {
    cyan: 'text-neo-cyan border-neo-cyan/50 hover:border-neo-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]',
    lime: 'text-neo-lime border-neo-lime/50 hover:border-neo-lime hover:shadow-[0_0_15px_rgba(57,255,20,0.4)]',
    magenta: 'text-neo-magenta border-neo-magenta/50 hover:border-neo-magenta hover:shadow-[0_0_15px_rgba(255,0,255,0.4)]',
    yellow: 'text-neo-yellow border-neo-yellow/50 hover:border-neo-yellow hover:shadow-[0_0_15px_rgba(252,226,5,0.4)]',
  };

  return (
    <div 
      className={cn("flex flex-col items-center justify-center aspect-square gap-3 cursor-pointer bg-[#0a0a0f] transition-all hex-btn mx-auto w-full max-w-[140px]", colorMap[color])}
      onClick={onClick}
    >
      <div className="p-2">{icon}</div>
      <span className="text-[10px] sm:text-xs font-bold tracking-widest">{text}</span>
    </div>
  );
}

function ActivityIcon() {
  return (
    <div className="flex items-center gap-[2px] h-4">
       <motion.div animate={{ height: ['40%', '100%', '40%'] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-1 bg-neo-cyan" />
       <motion.div animate={{ height: ['80%', '30%', '80%'] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-1 bg-neo-magenta" />
       <motion.div animate={{ height: ['50%', '90%', '50%'] }} transition={{ duration: 0.9, repeat: Infinity }} className="w-1 bg-neo-lime" />
    </div>
  )
}
