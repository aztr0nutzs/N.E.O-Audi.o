export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  sourceType: 'local' | 'youtube' | 'url';
  sourceUrl?: string; // Original URL if downloaded
  localUrl: string;   // Blob URL or local path
  format: 'mp3' | 'wav' | 'm4a';
  bitrate?: number;
  duration: number; // in seconds
  size: number; // in bytes
  coverArt?: string; // base64 or url
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type JobStatus = 'queued' | 'analyzing' | 'downloading' | 'converting' | 'indexing' | 'complete' | 'failed' | 'cancelled';

export interface DownloadJob {
  id: string;
  sourceUrl: string;
  status: JobStatus;
  progress: number;
  phase: string;
  error?: string;
  errorCode?: string;
  logs?: string[];
  startedAt?: number;
  outputFilename?: string;
  actualBitrate?: number;
  actualDuration?: number;
  speed?: string;
  eta?: string;
  format: 'mp3' | 'wav' | 'm4a';
  bitrate: number;
  metadata?: Partial<Track>;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  resultTrackId?: string;
}

export interface AppSettings {
  defaultFormat: 'mp3' | 'wav' | 'm4a';
  defaultBitrate: number;
  themeIntensity: 'clean' | 'neon' | 'reactor';
  autoFillMetadata: boolean;
  confirmDelete: boolean;
}
