import { Outlet } from 'react-router-dom';
import { BottomDock } from './BottomDock';
import { useAppStore } from '../../store/useAppStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

import { AudioDriver } from './AudioDriver';

export function AppShell() {
  const loadSettings = useAppStore(state => state.loadSettings);
  const loadLibrary = useLibraryStore(state => state.loadLibrary);

  useEffect(() => {
    loadSettings();
    loadLibrary();
  }, [loadSettings, loadLibrary]);

  return (
    <div className="flex h-screen bg-neo-bg text-gray-100 overflow-hidden font-sans">
      <div className="scanline-effect pointer-events-none" />
      <AudioDriver />
      <div className="flex w-full flex-col relative scroll-smooth overflow-y-auto pb-32 overflow-x-hidden">
         <main className="flex-1 p-2 sm:p-4 md:p-8 max-w-5xl mx-auto w-full">
            <Outlet />
         </main>
      </div>
      <BottomDock />
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
