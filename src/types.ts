// Canonical set of audio formats N.E.O. can produce, probe, and play end to end.
// Adding to this list requires support in: ffmpeg/yt-dlp output, the upload
// validator, normalizeFormat() on the backend, and the Library Lossless filter.
export const SUPPORTED_FORMATS = ['mp3', 'wav', 'm4a'] as const;
export type SupportedFormat = typeof SUPPORTED_FORMATS[number];

// Lossless subset. Everything outside is treated as lossy regardless of bitrate.
export const LOSSLESS_FORMATS: ReadonlyArray<SupportedFormat | 'flac'> = ['wav', 'flac'];

// Where a Track came from. 'local' = uploaded from the user's device.
// 'downloaded' = produced by the N.E.O. download engine from a remote URL.
export type TrackSourceType = 'local' | 'downloaded';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  sourceType: TrackSourceType;
  sourceUrl?: string; // Original URL if downloaded
  localUrl: string;   // Blob URL or local path
  format: SupportedFormat;
  bitrate?: number;
  duration: number; // in seconds
  size: number; // in bytes
  coverArt?: string; // base64 or url
  coverArtUrl?: string;
  coverArtSource?: 'embedded' | 'uploaded' | 'generated' | 'downloaded';
  coverArtUpdatedAt?: string;
  dominantColor?: string;
  accentColor?: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  mood?: string;
  tags?: string[];
  notes?: string;
  energyLevel?: 1 | 2 | 3 | 4 | 5;
  explicit?: boolean;
  playCount?: number;
  lastPlayedAt?: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type SmartPlaylistId =
  | 'recently-added'
  | 'favorites'
  | 'most-played'
  | 'never-played'
  | 'downloaded'
  | 'local-uploads'
  | 'high-quality'
  | 'bass-heavy'
  | 'night-drive'
  | 'chill-focus'
  | 'vocals'
  | 'retro-synth'
  | 'long-tracks'
  | 'short-tracks';

export type SmartPlaylist = {
  id: SmartPlaylistId;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  ruleSummary: string;
  trackIds: string[];
};

export type MoodPack = {
  id: string;
  name: string;
  mood: string;
  trackIds: string[];
  color?: string;
  description?: string;
};

export type JobStatus = 'queued' | 'analyzing' | 'downloading' | 'converting' | 'indexing' | 'complete' | 'failed' | 'cancelled';

export interface DownloadJob {
  id: string;
  sourceUrl: string;
  status: JobStatus;
  progress: number;
  phase: string;
  sourceHostname?: string;
  error?: string;
  errorCode?: string;
  logs?: string[];
  startedAt?: number;
  outputFilename?: string;
  fileSize?: number;
  actualBitrate?: number;
  actualDuration?: number;
  speed?: string;
  eta?: string;
  format: SupportedFormat;
  bitrate: number;
  metadata?: Partial<Track>;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  resultTrackId?: string;
}

export interface AppSettings {
  defaultFormat: SupportedFormat;
  defaultBitrate: number;
  themeIntensity: 'clean' | 'neon' | 'reactor';
  autoFillMetadata: boolean;
  confirmDelete: boolean;
}


export type NeoEnhancerMode =
  | 'off'
  | 'cleanBoost'
  | 'neoDps'
  | 'spatial3d'
  | 'bassReactor'
  | 'vocalClarity'
  | 'nightMode';

export type NeoOutputProfile =
  | 'headphones'
  | 'phoneSpeaker'
  | 'bluetoothSpeaker'
  | 'carAudio'
  | 'earbuds'
  | 'outdoor';

export type NeoEnhancerSettings = {
  enabled: boolean;
  mode: NeoEnhancerMode;
  outputProfile: NeoOutputProfile;
  intensity: number;
  bass: number;
  clarity: number;
  spatial: number;
  loudness: number;
  limiter: boolean;
  safeGain: boolean;
};
