import { Outlet } from 'react-router-dom';
import { BottomDock } from './BottomDock';
import { useAppStore } from '../../store/useAppStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

import { AudioDriver } from './AudioDriver';
import { AudioAnalyzerOverlay } from '../audio/AudioAnalyzerOverlay';
import { BootSequence } from '../startup/BootSequence';
import { NEO_AUDIO_BACKGROUND } from '../../lib/neoAudioAssets';

const NEO_BOOT_SESSION_KEY = 'neo-audio-boot-sequence-complete';

function shouldShowBootSequence() {
  try {
    return window.sessionStorage.getItem(NEO_BOOT_SESSION_KEY) !== 'true';
  } catch {
    return true;
  }
}

export function AppShell() {
  const loadSettings = useAppStore(state => state.loadSettings);
  const loadLibrary = useLibraryStore(state => state.loadLibrary);
  const [showBootSequence, setShowBootSequence] = useState(shouldShowBootSequence);

  useEffect(() => {
    loadSettings();
    loadLibrary();
  }, [loadSettings, loadLibrary]);

  const handleBootComplete = useCallback(() => {
    try {
      window.sessionStorage.setItem(NEO_BOOT_SESSION_KEY, 'true');
    } catch {
      // Session storage can be unavailable in locked-down WebViews; the boot still exits.
    }
    setShowBootSequence(false);
  }, []);

  const backgroundStyle = {
    '--neo-audio-background': `url("${NEO_AUDIO_BACKGROUND}")`,
  } as CSSProperties;

  return (
    <div
      className="neo-app-background safe-screen flex h-dvh bg-neo-bg text-gray-100 overflow-hidden font-sans"
      style={backgroundStyle}
      data-testid="app-shell"
    >
      {showBootSequence && <BootSequence onComplete={handleBootComplete} />}
      <div className="scanline-effect pointer-events-none" />
      <AudioDriver />
      <div className="safe-bottom-dock-padding flex w-full flex-col relative scroll-smooth overflow-y-auto overflow-x-hidden" data-testid="app-shell-scroll">
         <main className="flex-1 w-full max-w-5xl mx-auto px-2.5 pt-2 pb-4 sm:px-4 md:px-8 md:pt-5">
            <Outlet />
         </main>
      </div>
      <BottomDock />
      <AudioAnalyzerOverlay />
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#141418',
            color: '#fff',
            border: '1px solid #00f0ff',
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)'
          }
        }} 
      />
    </div>
  );
}
