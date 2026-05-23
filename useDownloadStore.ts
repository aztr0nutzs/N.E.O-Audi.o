import { create } from 'zustand';
import { DownloadJob, JobStatus } from '../types';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useLibraryStore } from './useLibraryStore';

interface DownloadState {
  jobs: DownloadJob[];
  loadJobs: () => Promise<void>;
  addJob: (url: string, format: string, bitrate: number) => Promise<DownloadJob | undefined>;
  removeJob: (id: string) => Promise<void>;
  startJob: (id: string) => Promise<void>;
  retryJob: (id: string) => Promise<void>;
  cancelJob: (id: string) => Promise<void>;
}

let pollingInterval: any = null;

export const useDownloadStore = create<DownloadState>((set, get) => {
  const startPolling = () => {
    if (pollingInterval) return;
    pollingInterval = setInterval(() => {
      get().loadJobs();
    }, 2000);
  };
  
  // start polling immediately
  if (typeof window !== 'undefined') startPolling();

  return {
    jobs: [],

    loadJobs: async () => {
      try {
        const prevJobs = get().jobs;
        const jobs = await api.getDownloadJobs();
        
        // Auto-reload library if something just completed
        const newlyCompleted = jobs.some(j => j.status === 'complete' && 
             !prevJobs.find(p => p.id === j.id && p.status === 'complete')
        );
        if (newlyCompleted) {
           useLibraryStore.getState().loadLibrary();
           toast.success("Download complete and added to Library!");
        }

        set({ jobs });
      } catch (err) {
        console.error(err);
      }
    },

    addJob: async (url, format, bitrate) => {
      try {
        const newJob = await api.addDownloadJob(url, format, bitrate);
        set((state) => ({ jobs: [newJob, ...state.jobs.filter(j => j.id !== newJob.id)] }));
        startPolling();
        return newJob;
      } catch (err: any) {
        toast.error(`Failed to add job: ${err.message}`);
        return undefined;
      }
    },

    removeJob: async (id) => {
      try {
        await api.deleteDownloadJob(id);
        set((state) => ({ jobs: state.jobs.filter(j => j.id !== id) }));
      } catch (err: any) {
        if (err.status === 409 || err.code === 'ERR_JOB_ACTIVE') {
          toast.error('Job is still active — cancel it first, then remove.');
        } else {
          toast.error(`Delete failed: ${err.message}`);
        }
      }
    },

    startJob: async (id) => {
      try {
          const job = await api.startDownloadJob(id);
          set((state) => ({ jobs: state.jobs.map(j => j.id === id ? job : j) }));
          startPolling();
      } catch (err: any) {
          toast.error(`Start failed: ${err.message}`);
      }
    },

    retryJob: async (id) => {
      try {
          const job = await api.retryDownloadJob(id);
          set((state) => ({ jobs: state.jobs.map(j => j.id === id ? job : j) }));
          startPolling();
      } catch (err: any) {
          toast.error(`Retry failed: ${err.message}`);
      }
    },

    cancelJob: async (id) => {
      try {
        const job = await api.cancelDownloadJob(id);
        set((state) => ({ jobs: state.jobs.map(j => j.id === id ? job : j) }));
      } catch (err: any) {
        toast.error(`Cancel failed: ${err.message}`);
      }
    }
  };
});
