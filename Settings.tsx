import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useDownloadStore } from '../store/useDownloadStore';
import { Settings as SettingsIcon, Trash2, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { storage } from '../services/storage';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function Settings() {
  const { settings, updateSettings, loadSettings } = useAppStore();
  const { loadLibrary } = useLibraryStore();
  const { loadJobs } = useDownloadStore();

  const handleClearData = async () => {
    if (confirm("CRITICAL ACTION: This will PERMANENTLY delete all tracks, playlists, and jobs from both the server and your browser. Continue?")) {
       const loadingToast = toast.loading("Executing system reset...");
       try {
          // 1. Clear Backend
          const result = await api.factoryReset();
          
          // 2. Clear Frontend Storage
          await storage.clearBrowserData();
          
          // 3. Refresh Stores
          await loadSettings();
          await loadLibrary();
          await loadJobs();
          
          const { summary } = result;
          toast.success(
            `Reset Complete: ${summary.tracksDeleted} tracks, ${summary.jobsDeleted} jobs, and ${summary.filesDeleted} files removed.`, 
            { id: loadingToast, duration: 5000 }
          );
       } catch (err: any) {
          toast.error(`Reset Failed: ${err.message}`, { id: loadingToast });
       }
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
       <div className="flex items-center space-x-3 mb-8">
         <SettingsIcon className="w-8 h-8 text-neo-blue neo-glow-cyan rounded-full" />
         <h2 className="text-3xl font-bold italic text-white tracking-widest">System Configurations</h2>
       </div>

       <Card className="border-neo-yellow/30 bg-neo-yellow/5">
         <CardContent className="p-4 flex items-start space-x-4">
            <ShieldAlert className="w-6 h-6 text-neo-yellow shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-neo-yellow mb-1">Legal Usage Reminder</h4>
              <p className="text-sm text-gray-300">
                This tool is meant for personal extraction of permitted audio. 
                Do not distribute copyrighted materials or circumvent robust protection measures.
                Your downloads are stored locally in your browser.
              </p>
            </div>
         </CardContent>
       </Card>

       <Card>
         <CardHeader>
           <CardTitle>Download Defaults</CardTitle>
         </CardHeader>
         <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
               <div>
                  <h4 className="font-medium text-white">Default Format</h4>
                  <p className="text-xs text-gray-500">Preferred extraction format</p>
               </div>
               <select 
                 className="bg-neo-bg border border-gray-800 rounded px-3 py-1.5 text-sm w-32"
                 value={settings.defaultFormat}
                 onChange={(e) => updateSettings({ defaultFormat: e.target.value as any })}
               >
                 <option value="mp3">MP3</option>
                 <option value="wav">WAV</option>
                 <option value="m4a">M4A</option>
               </select>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-800 pt-6">
               <div>
                  <h4 className="font-medium text-white">Default Quality</h4>
                  <p className="text-xs text-gray-500">Preferred audio bitrate</p>
               </div>
               <select 
                 className="bg-neo-bg border border-gray-800 rounded px-3 py-1.5 text-sm w-32"
                 value={settings.defaultBitrate}
                 onChange={(e) => updateSettings({ defaultBitrate: parseInt(e.target.value) })}
               >
                 <option value="128">128 kbps</option>
                 <option value="192">192 kbps</option>
                 <option value="256">256 kbps</option>
                 <option value="320">320 kbps</option>
               </select>
            </div>
         </CardContent>
       </Card>

       <Card>
         <CardHeader>
           <CardTitle>Danger Zone</CardTitle>
         </CardHeader>
         <CardContent>
            <div className="flex items-center justify-between">
               <div>
                  <h4 className="font-medium text-neo-red">Clear application data</h4>
                  <p className="text-xs text-gray-500">Removes all tracks, settings, and library data.</p>
               </div>
               <Button variant="danger" size="sm" onClick={handleClearData}>
                 <Trash2 className="w-4 h-4 mr-2" />
                 Factory Reset
               </Button>
            </div>
         </CardContent>
       </Card>
    </div>
  );
}
