import { create } from 'zustand';
import { DownloadJob, JobStatus } from '../types';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useLibraryStore } from './useLibraryStore';

interface DownloadState {
  jobs: DownloadJob[];
  jobLogs: Record<string, string[]>;
  loadJobs: () => Promise<void>;
  addJob: (url: string, format: string, bitrate: number) => Promise<DownloadJob | undefined>;
  removeJob: (id: string) => Promise<void>;
  startJob: (id: string) => Promise<void>;
  retryJob: (id: string) => Promise<void>;
  cancelJob: (id: string) => Promise<void>;
  beginPolling: () => void;
  endPolling: () => void;
  loadJobLogs: (id: string, force?: boolean) => Promise<string[]>;
}

let pollingInterval: any = null;
const ACTIVE_STATUSES: JobStatus[] = ['queued', 'analyzing', 'downloading', 'converting', 'indexing'];

export const useDownloadStore = create<DownloadState>((set, get) => {
  const hasActiveJobs = (jobs: DownloadJob[]) => jobs.some((job) => ACTIVE_STATUSES.includes(job.status));

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  const startPolling = (intervalMs = 2000) => {
    if (pollingInterval) return;
    pollingInterval = setInterval(() => {
      get().loadJobs();
    }, intervalMs);
  };

  return {
    jobs: [],
    jobLogs: {},

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

        if (hasActiveJobs(jobs)) {
          startPolling(2000);
        } else {
          stopPolling();
          startPolling(7000);
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
        stopPolling();
        startPolling(2000);
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
        toast.error(`Delete failed: ${err.message}`);
      }
    },

    startJob: async (id) => {
      try {
          const job = await api.startDownloadJob(id);
          set((state) => ({ jobs: state.jobs.map(j => j.id === id ? job : j) }));
          stopPolling();
          startPolling(2000);
      } catch (err: any) {
          toast.error(`Start failed: ${err.message}`);
      }
    },

    retryJob: async (id) => {
      try {
          const job = await api.retryDownloadJob(id);
          set((state) => ({ jobs: state.jobs.map(j => j.id === id ? job : j) }));
          stopPolling();
          startPolling(2000);
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
    },

    beginPolling: () => {
      if (pollingInterval) return;
      startPolling(5000);
    },

    endPolling: () => {
      stopPolling();
    },

    loadJobLogs: async (id, force = false) => {
      const existing = get().jobLogs[id];
      if (existing && !force) return existing;
      try {
        const data = await api.getDownloadJobLogs(id);
        set((state) => ({ jobLogs: { ...state.jobLogs, [id]: data.logs } }));
        return data.logs;
      } catch (err) {
        console.error(err);
        return existing || [];
      }
    }
  };
});
