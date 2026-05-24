import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UploadCloud, Music, Save, Zap } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { Track } from '../types';
import toast from 'react-hot-toast';
import { NeoAudioHeader } from '../components/layout/NeoAudioHeader';

// Files matching this regex are accepted by the chooser. The backend still
// authoritatively validates via ffprobe; this is just a fast client-side guard.
const ACCEPTED_AUDIO_EXT_RE = /\.(mp3|wav|m4a)$/i;
const isAcceptableAudio = (file: File): boolean => {
   if (file.type.startsWith('video/')) return false;
   if (file.type.startsWith('audio/')) return true;
   return ACCEPTED_AUDIO_EXT_RE.test(file.name);
};

export function Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const addTrack = useLibraryStore(state => state.addTrack);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!isAcceptableAudio(selected)) {
        toast.error('Please select a supported audio file (MP3, WAV, M4A)');
        return;
      }
      setFile(selected);
      // Try to guess title from filename
      const name = selected.name.replace(/\.[^/.]+$/, "");
      setTitle(name);
      setArtist('Local User');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && isAcceptableAudio(dropped)) {
      setFile(dropped);
      setTitle(dropped.name.replace(/\.[^/.]+$/, ""));
      setArtist('Local User');
    } else {
      toast.error('Please drop a supported audio file (MP3, WAV, M4A)');
    }
  };

  const handleSave = async () => {
    if (!file) return;

    try {
      // Only title/artist are sent as overrides. format, duration, bitrate,
      // size, sourceType, and localUrl are all derived from the actual file
      // by the backend after probing, so sending placeholders here would just
      // be misleading.
      const overrides: Partial<Track> = {
         title: title.trim(),
         artist: artist.trim() || 'Unknown Artist',
      };

      await addTrack(overrides, file);
      toast.success('Track added to library');

      setFile(null);
      setTitle('');
      setArtist('');
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ? `Upload failed: ${err.message}` : 'Failed to save file');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24 md:pb-0">
      <NeoAudioHeader className="mb-2" alt="N.E.O Audio Lab uploader" />
      <header className="mb-6 border-b border-gray-800 pb-4 text-center">
        <h1 className="text-2xl font-bold tracking-widest text-neo-lime uppercase italic shadow-[0_0_15px_rgba(57,255,20,0.4)] drop-shadow-md inline-block px-8 py-2 border-y border-neo-lime/30">
          LOCAL IMPORT
        </h1>
      </header>

      <div className="hud-panel p-6 border-neo-lime/50">
          {!file ? (
            <div 
              className="border-2 border-dashed border-gray-700 hover:border-neo-lime hover:shadow-[0_0_15px_rgba(57,255,20,0.2)_inset] bg-[#0a0a0f] rounded-xl p-16 text-center cursor-pointer transition-all duration-300"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Zap className="mx-auto h-16 w-16 text-neo-lime mb-6 drop-shadow-[0_0_8px_rgba(57,255,20,0.8)]" />
              <p className="text-white font-bold tracking-widest uppercase mb-2">Initialize Data Link</p>
              <p className="text-xs text-gray-500 font-mono">Click or drag local audio assets here</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a"
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-6">
               <div className="flex items-center space-x-4 bg-[#0a0a0f] p-4 rounded-lg border border-neo-lime/30">
                  <div className="h-16 w-16 bg-[#141418] rounded border border-gray-800 flex items-center justify-center shrink-0">
                    <Music className="text-neo-lime shadow-[0_0_10px_rgba(57,255,20,0.8)]" />
                  </div>
                  <div className="overflow-hidden">
                     <p className="text-xs font-mono text-neo-magenta uppercase tracking-widest mb-1">Target Acquired:</p>
                     <p className="font-bold text-white truncate">{file.name}</p>
                     <p className="text-xs font-mono text-gray-500 mt-1">{(file.size / (1024*1024)).toFixed(2)} MB</p>
                  </div>
               </div>

               <div className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold tracking-widest text-neo-cyan mb-2 uppercase">Entity Name</label>
                   <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-[#0a0a0f] border-gray-700 focus:border-neo-lime transition-colors font-mono" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold tracking-widest text-neo-cyan mb-2 uppercase">Creator Tags</label>
                   <Input value={artist} onChange={e => setArtist(e.target.value)} className="bg-[#0a0a0f] border-gray-700 focus:border-neo-lime transition-colors font-mono" />
                 </div>
               </div>

               <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-800">
                 <Button variant="outline" className="border-neo-red text-neo-red w-full font-bold uppercase tracking-widest" onClick={() => setFile(null)}>ABORT</Button>
                 <Button className="bg-neo-lime text-black hover:bg-neo-lime/80 w-full shadow-[0_0_15px_rgba(57,255,20,0.5)] font-bold uppercase tracking-widest" onClick={handleSave}>
                   <Save className="mr-2 h-4 w-4" /> COMMIT
                 </Button>
               </div>
            </div>
          )}
      </div>
    </div>
  );
}
