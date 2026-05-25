import { JobStatus, DownloadJob, Track } from '../types';

type DownloadJobLogsResponse = { id: string; logs: string[] };

export const api = {
  async getDownloadJobs(): Promise<DownloadJob[]> {
    const res = await fetch('/api/download-jobs');
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  },

  async addDownloadJob(url: string, format: string, bitrate: number): Promise<DownloadJob> {
    const res = await fetch('/api/download-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format, bitrate })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create job");
    return data;
  },

  async startDownloadJob(id: string): Promise<DownloadJob> {
    const res = await fetch(`/api/download-jobs/${id}/start`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to start job");
    return data;
  },

  async retryDownloadJob(id: string): Promise<DownloadJob> {
    const res = await fetch(`/api/download-jobs/${id}/retry`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to retry job");
    return data;
  },

  async cancelDownloadJob(id: string): Promise<DownloadJob> {
    const res = await fetch(`/api/download-jobs/${id}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to cancel job");
    return data;
  },

  async deleteDownloadJob(id: string): Promise<void> {
    const res = await fetch(`/api/download-jobs/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete job");
    }
  },

  async getDownloadJobLogs(id: string): Promise<DownloadJobLogsResponse> {
    const res = await fetch(`/api/download-jobs/${id}/logs`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch job logs");
    return data;
  },

  async factoryReset(): Promise<{ summary: any }> {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to reset");
    return data;
  }
};
