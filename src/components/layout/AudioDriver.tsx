import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useEqualizerStore, BANDS } from '../../store/useEqualizerStore';
import { useSignalChainStore } from '../../store/useSignalChainStore';
import toast from 'react-hot-toast';

export function AudioDriver() {
  const { currentTrackId, isPlaying, next, setProgress, setDuration, volume, seekRequest, clearSeekRequest, playbackSpeed, setError, setAnalyserNode } = usePlayerStore();
  const getAudioUrl = useLibraryStore(state => state.getAudioUrl);
  
  const { bandValues, isOn, spatial } = useEqualizerStore();
  const { modules, outputGain, clippingProtection, setEstimatedPeak } = useSignalChainStore();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const vocalFilterRef = useRef<BiquadFilterNode | null>(null);
  const nightFilterRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const initializedRef = useRef(false);
  const lastPeakUpdateRef = useRef(0);

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
      analyserRef.current = analyser;
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

      const bassFilter = audioCtx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 100;
      bassFilter.gain.value = 0;
      bassFilterRef.current = bassFilter;

      const vocalFilter = audioCtx.createBiquadFilter();
      vocalFilter.type = 'peaking';
      vocalFilter.frequency.value = 3200;
      vocalFilter.Q.value = 1.1;
      vocalFilter.gain.value = 0;
      vocalFilterRef.current = vocalFilter;

      const nightFilter = audioCtx.createBiquadFilter();
      nightFilter.type = 'highshelf';
      nightFilter.frequency.value = 6500;
      nightFilter.gain.value = 0;
      nightFilterRef.current = nightFilter;

      const compressor = audioCtx.createDynamicsCompressor();
      compressorRef.current = compressor;

      const limiter = audioCtx.createDynamicsCompressor();
      limiterRef.current = limiter;

      const finalGain = audioCtx.createGain();
      outputGainRef.current = finalGain;

      // Connect: source -> EQ -> bass -> vocal -> night -> compressor -> spatial -> limiter -> output gain -> analyser -> destination
      let currentOutput: AudioNode = source;
      filters.forEach(filter => {
         currentOutput.connect(filter);
         currentOutput = filter;
      });
      currentOutput.connect(bassFilter);
      currentOutput = bassFilter;
      currentOutput.connect(vocalFilter);
      currentOutput = vocalFilter;
      currentOutput.connect(nightFilter);
      currentOutput = nightFilter;
      currentOutput.connect(compressor);
      currentOutput = compressor;
      currentOutput.connect(panner);
      panner.connect(limiter);
      limiter.connect(finalGain);
      finalGain.connect(analyser);
      analyser.connect(audioCtx.destination);
      
      initializedRef.current = true;
    } catch (e) {
      console.error("Failed to init audio context", e);
    }
  };

  useEffect(() => () => {
    try {
      mediaElementSourceRef.current?.disconnect();
      filtersRef.current.forEach(filter => filter.disconnect());
      bassFilterRef.current?.disconnect();
      vocalFilterRef.current?.disconnect();
      nightFilterRef.current?.disconnect();
      compressorRef.current?.disconnect();
      pannerRef.current?.disconnect();
      limiterRef.current?.disconnect();
      outputGainRef.current?.disconnect();
      analyserRef.current?.disconnect();
      audioContextRef.current?.close();
    } catch {
      /* best-effort audio graph cleanup */
    }
    initializedRef.current = false;
  }, []);

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
             const targetGain = isOn && modules.eq.enabled ? val * modules.eq.intensity : 0;
             filters[idx].gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
          }
       });

       if (bassFilterRef.current) {
          const bassGain = modules.bass.enabled ? modules.bass.intensity * 9 : 0;
          bassFilterRef.current.gain.setTargetAtTime(bassGain, audioCtx.currentTime, 0.12);
       }

       if (vocalFilterRef.current) {
          const vocalGain = modules.vocal.enabled ? modules.vocal.intensity * 5 : 0;
          vocalFilterRef.current.gain.setTargetAtTime(vocalGain, audioCtx.currentTime, 0.12);
       }

       if (nightFilterRef.current) {
          const nightGain = modules.night.enabled ? -(2 + modules.night.intensity * 6) : 0;
          nightFilterRef.current.gain.setTargetAtTime(nightGain, audioCtx.currentTime, 0.12);
       }

       if (compressorRef.current) {
          const compressor = compressorRef.current;
          const enabled = modules.compressor.enabled || modules.night.enabled;
          const intensity = modules.night.enabled ? Math.max(modules.compressor.intensity, modules.night.intensity) : modules.compressor.intensity;
          compressor.threshold.setTargetAtTime(enabled ? -18 - intensity * 8 : 0, audioCtx.currentTime, 0.12);
          compressor.knee.setTargetAtTime(enabled ? 12 + intensity * 12 : 40, audioCtx.currentTime, 0.12);
          compressor.ratio.setTargetAtTime(enabled ? 2 + intensity * 5 : 1, audioCtx.currentTime, 0.12);
          compressor.attack.setTargetAtTime(0.006 + intensity * 0.015, audioCtx.currentTime, 0.12);
          compressor.release.setTargetAtTime(0.16 + intensity * 0.28, audioCtx.currentTime, 0.12);
       }

       if (panner) {
          const spatialPan = modules.spatial.enabled ? spatial * Math.max(0.15, modules.spatial.intensity) : 0;
          panner.pan.setTargetAtTime(spatialPan, audioCtx.currentTime, 0.1);
       }

       if (limiterRef.current) {
          const limiter = limiterRef.current;
          const enabled = clippingProtection || modules.limiter.enabled;
          const intensity = modules.limiter.intensity;
          limiter.threshold.setTargetAtTime(enabled ? -4 - intensity * 8 : 0, audioCtx.currentTime, 0.08);
          limiter.knee.setTargetAtTime(enabled ? 0 : 40, audioCtx.currentTime, 0.08);
          limiter.ratio.setTargetAtTime(enabled ? 12 + intensity * 8 : 1, audioCtx.currentTime, 0.08);
          limiter.attack.setTargetAtTime(0.002, audioCtx.currentTime, 0.08);
          limiter.release.setTargetAtTime(0.06 + intensity * 0.08, audioCtx.currentTime, 0.08);
       }

       if (outputGainRef.current) {
          const nightTrim = modules.night.enabled ? 1 - modules.night.intensity * 0.12 : 1;
          outputGainRef.current.gain.setTargetAtTime(outputGain * nightTrim, audioCtx.currentTime, 0.08);
       }
    }
  }, [bandValues, isOn, spatial, modules, outputGain, clippingProtection]);

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
      const analyser = analyserRef.current;
      if (analyser && Date.now() - lastPeakUpdateRef.current > 500) {
        lastPeakUpdateRef.current = Date.now();
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const peak = data.reduce((max, value) => Math.max(max, value), 0) / 255;
        setEstimatedPeak(peak);
      }
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
