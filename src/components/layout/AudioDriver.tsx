import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useEqualizerStore, BANDS } from '../../store/useEqualizerStore';
import toast from 'react-hot-toast';

export function AudioDriver() {
  const { currentTrackId, isPlaying, next, setProgress, setDuration, volume, seekRequest, clearSeekRequest, playbackSpeed, setError, setAnalyserNode } = usePlayerStore();
  const getAudioUrl = useLibraryStore(state => state.getAudioUrl);
  
  const { bandValues, isOn, spatial } = useEqualizerStore();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const initializedRef = useRef(false);

  // Initialize Web Audio API ONLY when we actually start playback
  // because browsers require user interaction
  const initAudioProcessing = () => {
    if (initializedRef.current || !audioRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaElementSource(audioRef.current);
      mediaElementSourceRef.current = source;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      setAnalyserNode(analyser);

      // Create 10 biquad filters
      const filters: BiquadFilterNode[] = BANDS.map(band => {
         const filter = audioCtx.createBiquadFilter();
         if (band.freq === 32 || band.freq === 64) {
             filter.type = 'lowshelf';
         } else if (band.freq === 16000) {
             filter.type = 'highshelf';
         } else {
             filter.type = 'peaking';
             filter.Q.value = 1;
         }
         filter.frequency.value = band.freq;
         filter.gain.value = 0;
         return filter;
      });
      filtersRef.current = filters;

      const panner = audioCtx.createStereoPanner();
      pannerRef.current = panner;

      // Connect: source -> [filters] -> panner -> analyser -> destination
      let currentOutput: AudioNode = source;
      filters.forEach(filter => {
         currentOutput.connect(filter);
         currentOutput = filter;
      });
      currentOutput.connect(panner);
      panner.connect(analyser);
      analyser.connect(audioCtx.destination);
      
      initializedRef.current = true;
    } catch (e) {
      console.error("Failed to init audio context", e);
    }
  };

  useEffect(() => {
    // Keep filter gains in sync with zustand
    if (!initializedRef.current) return;
    const filters = filtersRef.current;
    const panner = pannerRef.current;
    
    // Smoothly ramp to the new values
    const audioCtx = audioContextRef.current;
    if (audioCtx) {
       bandValues.forEach((val, idx) => {
          if (filters[idx]) {
             // If EQ is 'off', mock it by setting gains to 0
             const targetGain = isOn ? val : 0;
             filters[idx].gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
          }
       });

       if (panner) {
          panner.pan.setTargetAtTime(spatial, audioCtx.currentTime, 0.1);
       }
    }
  }, [bandValues, isOn, spatial]);

  useEffect(() => {
    let active = true;
    if (currentTrackId && audioRef.current) {
      getAudioUrl(currentTrackId).then(src => {
        if (active && src && audioRef.current) {
          audioRef.current.src = src;
          audioRef.current.load();
          setError(null);
          if (isPlaying) {
             initAudioProcessing();
             if (audioContextRef.current?.state === 'suspended') {
                 audioContextRef.current.resume();
             }
             audioRef.current.play().catch(e => {
                 console.error(e);
                 setError("Playback blocked. Please interact with document.");
             });
          }
        }
      });
    }
    return () => { active = false; };
  }, [currentTrackId, getAudioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        initAudioProcessing();
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        audioRef.current.play().catch(e => {
             console.error(e);
             setError("Playback blocked. Please interact with document.");
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
     if (audioRef.current) {
       audioRef.current.volume = volume;
     }
  }, [volume]);
  
  useEffect(() => {
     if (audioRef.current) {
       audioRef.current.playbackRate = playbackSpeed;
     }
  }, [playbackSpeed]);

  useEffect(() => {
    if (seekRequest !== null && audioRef.current) {
       audioRef.current.currentTime = seekRequest * (audioRef.current.duration || 1);
       if (isPlaying) {
          audioRef.current.play().catch(() => {});
       }
       clearSeekRequest();
    }
  }, [seekRequest, clearSeekRequest, isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
    }
  };

  const handleError = (e: any) => {
     console.error("Audio block error:", e);
     setError("Error decoding audio file.");
     toast.error("Error playing standard file.");
  };

  return (
    <audio 
      ref={audioRef} 
      onTimeUpdate={handleTimeUpdate}
      onEnded={next}
      onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
      onError={handleError}
      style={{ display: 'none' }}
      crossOrigin="anonymous"
    />
  );
}
