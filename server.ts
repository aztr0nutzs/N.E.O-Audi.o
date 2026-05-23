import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import cors from "cors";
import youtubedl from "youtube-dl-exec";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import sanitize from "sanitize-filename";
import crypto from "crypto";
import ffprobeStatic from "ffprobe-static";
import { execFile } from "child_process";
import { promisify } from "util";
import mime from "mime-types";

// Polyfill or ignore Vite development logic in this simple server check
const isDev = process.env.NODE_ENV !== "production";

const execFileAsync = promisify(execFile);

// Config
const MAX_DOWNLOAD_DURATION_SECONDS = parseInt(process.env.MAX_DOWNLOAD_DURATION_SECONDS || "3600");
const MAX_DOWNLOAD_SIZE_MB = parseInt(process.env.MAX_DOWNLOAD_SIZE_MB || "500");
const DOWNLOAD_JOB_RETENTION_HOURS = parseInt(process.env.DOWNLOAD_JOB_RETENTION_HOURS || "24");
const MIN_DOWNLOAD_SIZE_BYTES = 1024;
const FILENAME_MAX_LEN = 120;

// Optional comma-separated allowlist of hostnames. Empty/unset => allow all http(s) sources.
// The user remains solely responsible for complying with the legal/compliance warning.
const ALLOWED_DOWNLOAD_HOSTS = (process.env.ALLOWED_DOWNLOAD_HOSTS || "")
   .split(",")
   .map(h => h.trim().toLowerCase())
   .filter(Boolean);

const isHostAllowed = (hostname: string): boolean => {
   if (ALLOWED_DOWNLOAD_HOSTS.length === 0) return true;
   const h = hostname.toLowerCase();
   return ALLOWED_DOWNLOAD_HOSTS.some(allowed => {
      if (allowed.startsWith("*.")) {
         const suffix = allowed.slice(1); // ".example.com"
         return h === allowed.slice(2) || h.endsWith(suffix);
      }
      return h === allowed;
   });
};

// Specific engine error codes
type EngineErrorCode =
   | 'invalid_url'
   | 'unsupported_source'
   | 'metadata_failed'
   | 'duration_limit_exceeded'
   | 'size_limit_exceeded'
   | 'engine_missing'
   | 'download_failed'
   | 'conversion_failed'
   | 'verification_failed'
   | 'cancelled';

class EngineError extends Error {
   code: EngineErrorCode;
   constructor(code: EngineErrorCode, message: string) {
      super(message);
      this.code = code;
   }
}

export const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Set up storage
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory or simple JSON DB for tracks
const DB_FILE = path.join(UPLOADS_DIR, 'db.json');
const JOBS_FILE = path.join(UPLOADS_DIR, 'jobs.json');

// Canonical supported audio formats. Kept in sync with types.ts on the frontend.
const SUPPORTED_FORMATS = ['mp3', 'wav', 'm4a'] as const;
type SupportedFormat = typeof SUPPORTED_FORMATS[number];

const SUPPORTED_AUDIO_EXTENSIONS: Record<string, SupportedFormat> = {
   mp3: 'mp3',
   wav: 'wav',
   wave: 'wav',
   m4a: 'm4a',
   mp4: 'm4a',
   aac: 'm4a',
};

// Map ffprobe format_name (often a comma-separated list like "mov,mp4,m4a")
// or a file extension into the canonical SupportedFormat. Falls back to the
// provided default when nothing matches.
const normalizeFormat = (raw: string | undefined, fallback: SupportedFormat = 'mp3'): SupportedFormat => {
   if (!raw) return fallback;
   const tokens = raw.toLowerCase().split(/[,\s./]+/).filter(Boolean);
   for (const t of tokens) {
      if ((SUPPORTED_FORMATS as readonly string[]).includes(t)) return t as SupportedFormat;
      if (SUPPORTED_AUDIO_EXTENSIONS[t]) return SUPPORTED_AUDIO_EXTENSIONS[t];
      // ffprobe often reports mp3 as "mp3" inside the long format_name; catch common aliases
      if (t === 'mpeg' || t === 'mp3float' || t === 'mp3adu') return 'mp3';
      if (t === 'wav' || t === 'pcm_s16le' || t === 'pcm_s24le') return 'wav';
      if (t === 'm4a' || t === 'mp4' || t === 'aac' || t === 'isom') return 'm4a';
   }
   return fallback;
};

type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  sourceType: 'local' | 'downloaded';
  sourceUrl?: string;
  localUrl: string;
  format: SupportedFormat;
  bitrate?: number;
  duration: number;
  size: number;
  coverArt?: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
};

// Migrate a legacy persisted track record (which may still hold 'url' / 'youtube'
// sourceType values or a raw ffprobe format_name) into the canonical shape.
const migrateLegacyTrack = (raw: any): Track | null => {
   if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
   const legacySource = String(raw.sourceType || '').toLowerCase();
   const sourceType: 'local' | 'downloaded' = legacySource === 'local' ? 'local' : 'downloaded';
   return {
      id: raw.id,
      title: typeof raw.title === 'string' ? raw.title : 'Unknown Title',
      artist: typeof raw.artist === 'string' ? raw.artist : 'Unknown Artist',
      album: typeof raw.album === 'string' ? raw.album : undefined,
      genre: typeof raw.genre === 'string' ? raw.genre : undefined,
      sourceType,
      sourceUrl: typeof raw.sourceUrl === 'string' ? raw.sourceUrl : undefined,
      localUrl: typeof raw.localUrl === 'string' ? raw.localUrl : '',
      format: normalizeFormat(typeof raw.format === 'string' ? raw.format : undefined),
      bitrate: typeof raw.bitrate === 'number' ? raw.bitrate : undefined,
      duration: typeof raw.duration === 'number' ? raw.duration : 0,
      size: typeof raw.size === 'number' ? raw.size : 0,
      coverArt: typeof raw.coverArt === 'string' ? raw.coverArt : undefined,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
      favorite: Boolean(raw.favorite),
   };
};

let tracks: Track[] = [];
if (fs.existsSync(DB_FILE)) {
  try {
    const rawTracks = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (Array.isArray(rawTracks)) {
       tracks = rawTracks.map(migrateLegacyTrack).filter((t): t is Track => t !== null);
    }
  } catch(e) {}
}

const saveDb = () => fs.writeFileSync(DB_FILE, JSON.stringify(tracks, null, 2));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// API: Get all tracks
app.get("/api/tracks", (req, res) => {
  res.json(tracks);
});

// Best-effort sync unlink that won't throw if the file is already gone.
const tryUnlink = (p: string) => {
   try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
};

// API: Upload track
//
// Policy: only audio uploads in SUPPORTED_FORMATS are accepted. Video/* is
// rejected explicitly — we do not extract audio from video on upload, and the
// downloader is the supported path for "I have a URL, convert it for me".
// The uploaded file is probed BEFORE the Track record is created so a probe
// failure means the file is removed and no Track is persisted.
app.post("/api/tracks/upload", upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const mimeType = (mime.lookup(file.originalname) || '').toString().toLowerCase();
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();

    if (mimeType.startsWith('video/')) {
       tryUnlink(file.path);
       return res.status(415).json({
          error: "Video uploads are not supported. Upload an audio file (MP3, WAV, M4A) or use the Downloader.",
          errorCode: 'unsupported_media',
       });
    }

    if (!mimeType.startsWith('audio/') && !SUPPORTED_AUDIO_EXTENSIONS[ext]) {
       tryUnlink(file.path);
       return res.status(415).json({
          error: `Unsupported file type. Supported formats: ${SUPPORTED_FORMATS.join(', ')}.`,
          errorCode: 'unsupported_media',
       });
    }

    const fallbackFormat = SUPPORTED_AUDIO_EXTENSIONS[ext] || 'mp3';

    // Parse metadata overrides if provided. Only title/artist are accepted;
    // size/duration/bitrate/format are always derived from the actual file.
    const metadataStr = req.body.metadata;
    let metadata: { title?: string; artist?: string } = {};
    if (metadataStr) {
       try {
          const parsed = JSON.parse(metadataStr);
          if (parsed && typeof parsed === 'object') {
             if (typeof parsed.title === 'string') metadata.title = parsed.title.trim().slice(0, 300);
             if (typeof parsed.artist === 'string') metadata.artist = parsed.artist.trim().slice(0, 300);
          }
       } catch(e) {
          /* ignore malformed metadata, fall back to filename */
       }
    }

    // Probe BEFORE creating the Track. A failed probe = unsupported file = reject.
    let actualDuration = 0;
    let actualBitrate = 0;
    let probedFormatRaw: string | undefined;
    let hasAudioStream = false;
    let hasVideoStream = false;
    try {
       const probeResult = await execFileAsync(ffprobeStatic.path, [
           '-v', 'quiet',
           '-print_format', 'json',
           '-show_format',
           '-show_streams',
           file.path
       ]);
       const probeData = JSON.parse(probeResult.stdout);
       const formatData = probeData.format;
       const streams: any[] = Array.isArray(probeData.streams) ? probeData.streams : [];
       hasAudioStream = streams.some(s => s && s.codec_type === 'audio');
       hasVideoStream = streams.some(s => s && s.codec_type === 'video');
       if (formatData && formatData.duration) {
           const d = parseFloat(formatData.duration);
           if (Number.isFinite(d) && d > 0) actualDuration = d;
       }
       if (formatData && formatData.bit_rate) {
           const b = parseInt(formatData.bit_rate, 10);
           if (Number.isFinite(b) && b > 0) actualBitrate = Math.round(b / 1000);
       }
       if (formatData && typeof formatData.format_name === 'string') {
           probedFormatRaw = formatData.format_name;
       }
    } catch (probeErr) {
       console.error('ffprobe error on upload:', probeErr);
       tryUnlink(file.path);
       return res.status(415).json({
          error: "File could not be probed and is not a recognised audio file.",
          errorCode: 'unsupported_media',
       });
    }

    if (!hasAudioStream) {
       tryUnlink(file.path);
       return res.status(415).json({
          error: "Uploaded file does not contain an audio stream.",
          errorCode: 'unsupported_media',
       });
    }

    if (hasVideoStream) {
       // A pure audio container should not carry a video stream. Reject so we
       // don't silently index a video file as a track.
       tryUnlink(file.path);
       return res.status(415).json({
          error: "Video uploads are not supported. Upload an audio file (MP3, WAV, M4A) or use the Downloader.",
          errorCode: 'unsupported_media',
       });
    }

    const format = normalizeFormat(probedFormatRaw, fallbackFormat);
    if (!(SUPPORTED_FORMATS as readonly string[]).includes(format)) {
       tryUnlink(file.path);
       return res.status(415).json({
          error: `Unsupported audio codec. Supported formats: ${SUPPORTED_FORMATS.join(', ')}.`,
          errorCode: 'unsupported_media',
       });
    }

    const baseName = file.originalname.replace(/\.[^/.]+$/, '').trim();
    const t: Track = {
      id: crypto.randomUUID(),
      title: metadata.title || baseName || 'Unknown Title',
      artist: metadata.artist || 'Unknown Artist',
      sourceType: 'local',
      localUrl: `/api/stream/${file.filename}`,
      format,
      duration: actualDuration,
      bitrate: actualBitrate || undefined,
      size: file.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      favorite: false
    };

    tracks.unshift(t);
    saveDb();

    res.json(t);
  } catch (error) {
    console.error(error);
    tryUnlink(file.path);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// API: Update track
//
// Only user-editable metadata fields are accepted. Each string is validated as
// a string, trimmed, and length-capped before being written. Any other field
// in the body (id, format, duration, sourceType, etc.) is ignored.
const TRACK_TEXT_FIELD_MAX = 300;
const validateOptionalTrimmedString = (value: unknown): string | undefined | null => {
   if (value === undefined) return undefined;
   if (typeof value !== 'string') return null; // sentinel: invalid type
   return value.trim().slice(0, TRACK_TEXT_FIELD_MAX);
};

app.patch("/api/tracks/:id", (req, res) => {
  const id = req.params.id;
  const trackIdx = tracks.findIndex(t => t.id === id);
  if (trackIdx === -1) {
     return res.status(404).json({ error: "Track not found" });
  }

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const { title, artist, album, genre, favorite } = body as Record<string, unknown>;

  const titleVal = validateOptionalTrimmedString(title);
  const artistVal = validateOptionalTrimmedString(artist);
  const albumVal = validateOptionalTrimmedString(album);
  const genreVal = validateOptionalTrimmedString(genre);
  if (titleVal === null || artistVal === null || albumVal === null || genreVal === null) {
     return res.status(400).json({ error: "Invalid metadata: title/artist/album/genre must be strings." });
  }
  if (favorite !== undefined && typeof favorite !== 'boolean') {
     return res.status(400).json({ error: "Invalid metadata: favorite must be boolean." });
  }
  if (titleVal !== undefined && titleVal.length === 0) {
     return res.status(400).json({ error: "Title must not be empty." });
  }

  const track = tracks[trackIdx];
  if (titleVal !== undefined) track.title = titleVal;
  if (artistVal !== undefined) track.artist = artistVal || 'Unknown Artist';
  if (albumVal !== undefined) track.album = albumVal || undefined;
  if (genreVal !== undefined) track.genre = genreVal || undefined;
  if (favorite !== undefined) track.favorite = favorite as boolean;
  track.updatedAt = Date.now();

  saveDb();
  res.json(track);
});

// API: Stream file
app.get("/api/stream/:filename", (req, res) => {
  const file = safeResolveUploadPath(req.params.filename);
  if (!file || !fs.existsSync(file)) return res.status(404).send('Not found');

  const stat = fs.statSync(file);
  const fileSize = stat.size;
  const range = req.headers.range;
  const mimeType = mime.lookup(file) || 'application/octet-stream';

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(file, {start, end});
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    };
    res.writeHead(206, head);
    fileStream.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
    };
    res.writeHead(200, head);
    fs.createReadStream(file).pipe(res);
  }
});

// API: Delete track
app.delete("/api/tracks/:id", (req, res) => {
  const id = req.params.id;
  const trackIdx = tracks.findIndex(t => t.id === id);
  if (trackIdx !== -1) {
    const track = tracks[trackIdx];
    if (track.localUrl.startsWith('/api/stream/')) {
        const filename = path.basename(track.localUrl);
        const filepath = safeResolveUploadPath(filename);
        if (filepath && fs.existsSync(filepath)) {
             unlinkSafely(filepath);
        }
    }
    tracks.splice(trackIdx, 1);
    saveDb();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Track not found" });
  }
});

type JobStatus = 'queued' | 'analyzing' | 'downloading' | 'converting' | 'indexing' | 'complete' | 'failed' | 'cancelled';
interface DownloadJob {
  id: string;
  sourceUrl: string;
  status: JobStatus;
  progress: number;
  phase: string;
  format: SupportedFormat;
  bitrate: number;
  error?: string;
  errorCode?: string;
  logs?: string[];
  startedAt?: number;
  outputFilename?: string;
  actualBitrate?: number;
  actualDuration?: number;
  speed?: string;
  eta?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  resultTrackId?: string;
}

let downloadJobs: DownloadJob[] = [];
const jobProcesses = new Map<string, any>();

// --- Lifecycle helpers -----------------------------------------------------
const ACTIVE_JOB_STATUSES: readonly JobStatus[] = ['queued', 'analyzing', 'downloading', 'converting', 'indexing'];
const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ['complete', 'failed', 'cancelled'];

const isActiveJobStatus = (status: JobStatus): boolean => ACTIVE_JOB_STATUSES.includes(status);
const isTerminalJobStatus = (status: JobStatus): boolean => TERMINAL_JOB_STATUSES.includes(status);

const UPLOADS_DIR_ABS = path.resolve(UPLOADS_DIR);

// Resolve a filename against UPLOADS_DIR_ABS, returning null when the result
// would escape the uploads directory. The caller must treat null as "do not touch".
const safeResolveUploadPath = (filename: string): string | null => {
   if (typeof filename !== 'string' || filename.length === 0) return null;
   const base = path.basename(filename);
   if (!base || base === '.' || base === '..') return null;
   const resolved = path.resolve(UPLOADS_DIR_ABS, base);
   const rel = path.relative(UPLOADS_DIR_ABS, resolved);
   if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
   return resolved;
};

const unlinkSafely = (resolvedPath: string): void => {
   try {
      fs.unlinkSync(resolvedPath);
   } catch (e: any) {
      if (e?.code !== 'ENOENT') {
         console.warn(`unlinkSafely: failed to remove ${resolvedPath}: ${e.message}`);
      }
   }
};

const cleanupJobFiles = (jobId: string, outputFilename?: string): void => {
   try {
      const entries = fs.readdirSync(UPLOADS_DIR_ABS);
      for (const entry of entries) {
         if (!entry.startsWith(`${jobId}-`)) continue;
         const safe = safeResolveUploadPath(entry);
         if (safe) unlinkSafely(safe);
      }
   } catch (e: any) {
      if (e?.code !== 'ENOENT') {
         console.warn(`cleanupJobFiles: readdir failed: ${e.message}`);
      }
   }
   if (outputFilename) {
      const safe = safeResolveUploadPath(outputFilename);
      if (safe) unlinkSafely(safe);
   }
};

const killJobProcess = (jobId: string, signal: NodeJS.Signals = 'SIGTERM'): boolean => {
   const proc = jobProcesses.get(jobId);
   if (!proc) return false;
   try { proc.kill(signal); } catch (_e) { /* already exited */ }
   jobProcesses.delete(jobId);
   return true;
};

const killAllJobProcesses = (signal: NodeJS.Signals = 'SIGTERM'): number => {
   let killed = 0;
   for (const [, proc] of jobProcesses) {
      try { proc.kill(signal); killed++; } catch (_e) { /* already exited */ }
   }
   jobProcesses.clear();
   return killed;
};
// ---------------------------------------------------------------------------

const loadJobsDb = (): DownloadJob[] => {
    if (!fs.existsSync(JOBS_FILE)) return [];
    let raw: string;
    try {
        raw = fs.readFileSync(JOBS_FILE, 'utf-8');
    } catch (e: any) {
        console.warn(`jobs.json could not be read (${e.message}); starting with empty job list.`);
        return [];
    }
    if (!raw || raw.trim() === '') return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        console.warn('jobs.json is not valid JSON; starting with empty job list.');
        return [];
    }
};

downloadJobs = loadJobsDb();
for (const job of downloadJobs) {
    if (isActiveJobStatus(job.status)) {
        job.status = 'failed';
        job.phase = 'Failed';
        job.error = 'Server was restarted before job could complete';
        job.errorCode = 'ERR_SERVER_RESTARTED';
        job.updatedAt = Date.now();
    }
}

const saveJobsDb = () => {
    try {
        const tempFile = JOBS_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(downloadJobs, null, 2));
        fs.renameSync(tempFile, JOBS_FILE);
    } catch(e) {
        console.error("Failed to save jobs.json", e);
    }
};

const cleanupOldAndPartialJobs = () => {
   const now = Date.now();
   const retentionMs = DOWNLOAD_JOB_RETENTION_HOURS * 60 * 60 * 1000;
   let changed = false;

   for (const job of downloadJobs) {
      if (job.status === 'failed' || job.status === 'cancelled') {
         cleanupJobFiles(job.id, job.outputFilename);
      }
   }

   const initialLen = downloadJobs.length;
   downloadJobs = downloadJobs.filter(job => {
      if (isActiveJobStatus(job.status)) return true;
      return (now - job.updatedAt) < retentionMs;
   });

   if (initialLen !== downloadJobs.length) changed = true;
   // Always save on boot mostly to flush partials
   saveJobsDb();
};

cleanupOldAndPartialJobs();

// Sanitize and truncate generated filenames for safe filesystem usage.
const buildSafeBasename = (title: string, fallback: string): string => {
   const cleaned = sanitize(title || '').replace(/\s+/g, ' ').trim();
   const safe = cleaned || fallback;
   if (safe.length <= FILENAME_MAX_LEN) return safe;
   return safe.slice(0, FILENAME_MAX_LEN).trim();
};

// Pick a non-colliding output filename base by appending a counter if needed.
const ensureUniqueBase = (base: string, ext: string): string => {
   let candidate = base;
   let counter = 1;
   while (fs.existsSync(path.join(UPLOADS_DIR, `${candidate}.${ext}`))) {
      counter += 1;
      candidate = `${base}-${counter}`;
      if (counter > 9999) {
         candidate = `${base}-${Date.now()}`;
         break;
      }
   }
   return candidate;
};

// Map common yt-dlp/network failure messages to engine error codes.
const classifyDownloadFailure = (msg: string): EngineErrorCode => {
   const m = msg.toLowerCase();
   if (m.includes('unsupported url') || m.includes('no video formats') || m.includes('no media') || m.includes('is not a valid url')) {
      return 'unsupported_source';
   }
   if (m.includes('ffmpeg') || m.includes('postprocess')) {
      return 'conversion_failed';
   }
   if (m.includes('enoent') || m.includes('command not found')) {
      return 'engine_missing';
   }
   return 'download_failed';
};

const runDownloadEngine = async (jobId: string) => {
    const job = downloadJobs.find(j => j.id === jobId);
    if (!job || job.status !== 'queued') return;

    job.status = 'analyzing';
    job.phase = 'Analyzing format & permissions...';
    job.progress = 2;
    job.updatedAt = Date.now();
    job.startedAt = Date.now();
    job.logs = [];
    job.error = undefined;
    job.errorCode = undefined;
    job.speed = undefined;
    job.eta = undefined;
    saveJobsDb();

    const log = (msg: string) => {
        if (job.logs) job.logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    const wasCancelled = () => {
       const j = downloadJobs.find(x => x.id === jobId);
       return j && j.status === 'cancelled';
    };

    log(`Started processing: ${job.sourceUrl}`);

    let actualFile = '';
    let outputBase = '';

    try {
        // ---- Phase 1: analyzing (0-10) ----
        let meta: any;
        try {
            meta = await youtubedl(job.sourceUrl, {
                dumpSingleJson: true,
                noWarnings: true,
                noCheckCertificates: true,
                geoBypass: true,
                quiet: true
            });
        } catch (metaErr: any) {
            const rawStderr: string = (metaErr && metaErr.stderr) ? String(metaErr.stderr) : '';
            const rawMsg: string = (metaErr && metaErr.message) || String(metaErr);
            const combined = `${rawMsg} ${rawStderr}`.trim();
            const lower = combined.toLowerCase();
            const sysCode: string = (metaErr && metaErr.code) ? String(metaErr.code) : '';
            if (sysCode === 'ENOENT' || lower.includes('enoent') || lower.includes('command not found') || lower.includes('no such file')) {
                throw new EngineError('engine_missing', `yt-dlp binary is missing or not executable: ${combined || sysCode}`);
            }
            if (lower.includes('unsupported url') || lower.includes('is not a valid url') || lower.includes('no video formats')) {
                throw new EngineError('unsupported_source', `Source is not supported by the engine: ${combined.slice(0, 400)}`);
            }
            throw new EngineError('metadata_failed', `Failed to read metadata: ${combined.slice(0, 400) || sysCode || 'unknown error'}`);
        }

        if (wasCancelled()) { throw new EngineError('cancelled', 'Job cancelled before download'); }

        const title: string = (meta && meta.title) || 'Unknown Title';
        const artist: string = (meta && meta.uploader) || (meta && meta.channel) || 'Unknown Artist';
        const durationStr = (meta && meta.duration) || 0;
        const metaDuration = parseFloat(durationStr as any) || 0;

        log(`Title: ${title}, Artist: ${artist}, Duration: ${metaDuration}s`);
        job.progress = 8;
        job.updatedAt = Date.now();
        saveJobsDb();

        if (metaDuration > MAX_DOWNLOAD_DURATION_SECONDS) {
            throw new EngineError(
                'duration_limit_exceeded',
                `Media duration (${metaDuration}s) exceeds maximum limit of ${MAX_DOWNLOAD_DURATION_SECONDS}s.`
            );
        }

        // Pre-check size from metadata if available
        const metaSize = (meta && (meta.filesize || meta.filesize_approx)) || 0;
        if (metaSize && metaSize > MAX_DOWNLOAD_SIZE_MB * 1024 * 1024) {
            throw new EngineError(
                'size_limit_exceeded',
                `Estimated source size (${Math.round(metaSize / 1024 / 1024)}MB) exceeds limit of ${MAX_DOWNLOAD_SIZE_MB}MB.`
            );
        }

        const safeTitle = buildSafeBasename(title, 'audio');
        const baseCandidate = `${job.id}-${safeTitle}`;
        outputBase = ensureUniqueBase(baseCandidate, job.format);
        const outputTemplate = path.join(UPLOADS_DIR, `${outputBase}.%(ext)s`);

        // ---- Phase 2: downloading (10-75) ----
        job.status = 'downloading';
        job.phase = 'Downloading...';
        job.progress = 10;
        job.updatedAt = Date.now();
        saveJobsDb();

        const ffmpegDir = path.dirname(ffmpegInstaller.path);

        // Bitrate mapping: explicitly pass kbps to both yt-dlp (--audio-quality)
        // and the ffmpeg post-processor (-b:a) so the requested 128/192/256/320
        // is honored. WAV is uncompressed PCM, so bitrate doesn't apply.
        const ytdlOpts: Record<string, any> = {
            extractAudio: true,
            audioFormat: job.format,
            output: outputTemplate,
            noWarnings: true,
            noCheckCertificates: true,
            ffmpegLocation: ffmpegDir,
            maxFilesize: `${MAX_DOWNLOAD_SIZE_MB}m`,
        };

        if (job.format !== 'wav') {
            ytdlOpts.audioQuality = `${job.bitrate}K`;
            // postprocessorArgs: youtube-dl-exec converts arrays into repeated flags.
            ytdlOpts.postprocessorArgs = `ffmpeg:-b:a ${job.bitrate}k`;
        }

        const subprocess = youtubedl.exec(job.sourceUrl, ytdlOpts as any);

        jobProcesses.set(job.id, subprocess);

        const updateProgressFromOutput = (output: string) => {
            // [download]  12.5% of  3.45MiB at 1.23MiB/s ETA 00:02
            // [download]  12% of  3.45MiB at 1.23MiB/s ETA 00:02
            // [download]  100% of 3.45MiB in 00:03
            const dlMatch = output.match(/\[download\]\s+(\d+(?:\.\d+)?)%(?:\s+of\s+\S+)?(?:\s+at\s+(\S+))?(?:\s+ETA\s+(\S+))?/);
            if (dlMatch) {
                const pct = Math.min(100, Math.max(0, parseFloat(dlMatch[1])));
                // Map raw 0-100 download percent to weighted 10-75 band
                job.progress = Math.round(10 + (pct * 0.65));
                job.phase = 'Downloading...';
                if (dlMatch[2]) job.speed = dlMatch[2];
                if (dlMatch[3]) job.eta = dlMatch[3];
                job.updatedAt = Date.now();
            }

            if ((output.includes('[ExtractAudio]') || output.includes('Destination:')) && (job.status as string) !== 'converting') {
                job.status = 'converting';
                job.phase = 'Converting format (ffmpeg)...';
                job.progress = Math.max(job.progress, 78);
                job.speed = undefined;
                job.eta = undefined;
                log('Conversion started');
            }

            // ffmpeg lines often contain "size= ... time= ... bitrate="
            const ffMatch = output.match(/time=([\d:.]+)/);
            if (ffMatch && (job.status as string) === 'converting') {
                // Bump within 78-94 band as ffmpeg makes progress
                job.progress = Math.min(94, Math.max(job.progress, 78));
                job.updatedAt = Date.now();
            }
        };

        subprocess.stdout?.on('data', (data: Buffer) => {
            const str = data.toString();
            updateProgressFromOutput(str);
        });
        subprocess.stderr?.on('data', (data: Buffer) => {
            const str = data.toString();
            updateProgressFromOutput(str);
            const trimmed = str.trim();
            // Log non-progress noise (lines without % indicator)
            if (trimmed && !/\[download\]\s+\d+(?:\.\d+)?%/.test(trimmed)) {
                log(`[stderr] ${trimmed.slice(0, 500)}`);
            }
        });

        try {
            await subprocess;
        } catch (procErr: any) {
            jobProcesses.delete(job.id);
            if (wasCancelled()) { throw new EngineError('cancelled', 'Job cancelled during download'); }
            const rawStderr: string = (procErr && procErr.stderr) ? String(procErr.stderr) : '';
            const rawMsg: string = (procErr && procErr.message) ? String(procErr.message) : String(procErr);
            const combined = `${rawMsg} ${rawStderr}`.trim();
            const sysCode: string = (procErr && procErr.code) ? String(procErr.code) : '';
            const code: EngineErrorCode = sysCode === 'ENOENT' ? 'engine_missing' : classifyDownloadFailure(combined);
            throw new EngineError(code, (combined || sysCode || 'unknown error').slice(0, 400));
        }
        jobProcesses.delete(job.id);
        log('Download/conversion process exited cleanly');

        if (wasCancelled()) { throw new EngineError('cancelled', 'Job cancelled after download'); }

        // Move into converting band briefly if we never hit it.
        // Cast through string because progress callbacks may have flipped status to 'converting'
        // already, and TS's literal-type narrowing here would otherwise rule that out.
        if ((job.status as string) !== 'converting') {
            job.status = 'converting';
            job.phase = 'Finalizing conversion...';
            job.progress = Math.max(job.progress, 80);
            job.updatedAt = Date.now();
            saveJobsDb();
        }

        // ---- Phase 3: locate and validate output ----
        const expectedFile = `${outputBase}.${job.format}`;
        actualFile = expectedFile;
        if (!fs.existsSync(path.join(UPLOADS_DIR, expectedFile))) {
            // yt-dlp may produce a different extension; pick the first match for this base.
            const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith(`${outputBase}.`));
            if (files.length === 0) {
                throw new EngineError('conversion_failed', 'Output file not found after conversion.');
            }
            actualFile = files[0];
        }

        log(`Found output file: ${actualFile}`);
        const fullPath = path.join(UPLOADS_DIR, actualFile);
        const stat = fs.statSync(fullPath);

        if (stat.size < MIN_DOWNLOAD_SIZE_BYTES) {
            throw new EngineError(
                'verification_failed',
                `Output file is suspiciously small (${stat.size} bytes < ${MIN_DOWNLOAD_SIZE_BYTES} bytes). Extraction likely failed.`
            );
        }
        if (stat.size > MAX_DOWNLOAD_SIZE_MB * 1024 * 1024) {
            throw new EngineError(
                'size_limit_exceeded',
                `Output file (${Math.round(stat.size / 1024 / 1024)}MB) exceeds maximum size limit of ${MAX_DOWNLOAD_SIZE_MB}MB.`
            );
        }

        // Extension should match requested format, unless yt-dlp normalised to a related container.
        const finalExt = path.extname(actualFile).slice(1).toLowerCase();
        const safeNormalizations: Record<string, string[]> = {
            mp3: ['mp3'],
            wav: ['wav'],
            m4a: ['m4a', 'mp4', 'aac'],
        };
        const allowedExts = safeNormalizations[job.format] || [job.format];
        if (!allowedExts.includes(finalExt)) {
            throw new EngineError(
                'verification_failed',
                `Final extension .${finalExt} does not match requested format .${job.format}.`
            );
        }

        // ---- Phase 4: indexing/verifying (95-99 until Track is created) ----
        job.status = 'indexing';
        job.phase = 'Verifying and finalizing track...';
        job.progress = 96;
        job.updatedAt = Date.now();
        saveJobsDb();

        let actualDuration = 0;
        let actualBitrate = 0;
        try {
            log(`Running ffprobe on ${actualFile}...`);
            const probeResult = await execFileAsync(ffprobeStatic.path, [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                fullPath
            ]);
            const probeData = JSON.parse(probeResult.stdout);
            const formatData = probeData.format;
            if (formatData && formatData.duration) {
                actualDuration = parseFloat(formatData.duration);
            }
            if (formatData && formatData.bit_rate) {
                actualBitrate = Math.round(parseInt(formatData.bit_rate) / 1000);
            }
            log(`ffprobe ok: ${actualDuration}s, ${actualBitrate}kbps`);
        } catch (probeErr: any) {
            throw new EngineError(
                'verification_failed',
                `ffprobe failed to read output: ${probeErr.message || probeErr}`
            );
        }

        // Some legitimate streams (e.g. live recordings stripped to audio) may
        // report duration=0; only fail when the format/source clearly should
        // have had a duration.
        const sourceShouldHaveDuration = metaDuration > 0;
        if (sourceShouldHaveDuration && actualDuration <= 0) {
            throw new EngineError(
                'verification_failed',
                'Output file has no readable duration but source advertised one.'
            );
        }

        // WAV is uncompressed - skip bitrate-mismatch check.
        if (job.format !== 'wav' && actualBitrate > 0) {
            const requested = job.bitrate;
            const drift = Math.abs(actualBitrate - requested) / requested;
            if (drift > 0.20) {
                log(`[warn] actual bitrate ${actualBitrate}kbps drifted ${Math.round(drift * 100)}% from requested ${requested}kbps`);
            }
        }

        job.outputFilename = actualFile;
        job.actualDuration = actualDuration;
        job.actualBitrate = actualBitrate || job.bitrate;

        // ---- Phase 5: create Track only after every check passes ----
        const newTrack: Track = {
            id: crypto.randomUUID(),
            title: buildSafeBasename(title, 'audio'),
            artist: artist,
            sourceType: 'downloaded',
            sourceUrl: job.sourceUrl,
            localUrl: `/api/stream/${actualFile}`,
            format: normalizeFormat(job.format, job.format),
            bitrate: job.actualBitrate,
            duration: actualDuration,
            size: stat.size,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            favorite: false
        };

        tracks.unshift(newTrack);
        saveDb();

        // Only now do we declare success at 100%
        job.status = 'complete';
        job.phase = 'Complete';
        job.progress = 100;
        job.resultTrackId = newTrack.id;
        job.completedAt = Date.now();
        job.updatedAt = Date.now();
        job.speed = undefined;
        job.eta = undefined;
        log('Job completed successfully');
        saveJobsDb();

    } catch (err: any) {
        jobProcesses.delete(job.id);

        const isEngine = err instanceof EngineError;
        const code: EngineErrorCode = isEngine ? err.code : 'download_failed';
        const message: string = (err && err.message) || 'Unknown error occurred during extraction';

        // If the failure was a user cancel, just mark cancelled (don't override existing cancellation state)
        if (code === 'cancelled' || wasCancelled()) {
            const j = downloadJobs.find(x => x.id === jobId);
            if (j) {
                j.status = 'cancelled';
                j.phase = 'Cancelled';
                j.errorCode = 'cancelled';
                j.error = 'Cancelled';
                j.updatedAt = Date.now();
                log('Job ended due to cancellation');
                saveJobsDb();
            }
        } else {
            job.status = 'failed';
            job.phase = 'Failed';
            job.error = message;
            job.errorCode = code;
            job.updatedAt = Date.now();
            if (job.logs) job.logs.push(`[${new Date().toISOString()}] [ERROR ${code}] ${message}`);
            saveJobsDb();
        }

        // Clean up partials
        try {
            if (actualFile) {
                const actualPath = path.join(UPLOADS_DIR, actualFile);
                if (fs.existsSync(actualPath)) fs.unlinkSync(actualPath);
            }
            const prefix = outputBase || `${job.id}-`;
            const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith(prefix) || f.startsWith(`${job.id}-`));
            for (const f of files) {
                const p = path.join(UPLOADS_DIR, f);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
        } catch (e) {}
    }
};

// API: Create Download Job
app.post("/api/download-jobs", (req, res) => {
   const { url, format, bitrate } = req.body;

   if (!url || typeof url !== 'string') {
       return res.status(400).json({ error: "URL is required", errorCode: 'invalid_url' });
   }

   let parsedUrl: URL;
   try {
       parsedUrl = new URL(url);
   } catch (e) {
       return res.status(400).json({ error: "Invalid URL string provided", errorCode: 'invalid_url' });
   }
   if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
       return res.status(400).json({ error: "URL must use http or https protocol", errorCode: 'invalid_url' });
   }
   if (!parsedUrl.hostname) {
       return res.status(400).json({ error: "URL must have a valid hostname", errorCode: 'invalid_url' });
   }
   if (!isHostAllowed(parsedUrl.hostname)) {
       return res.status(400).json({
           error: `Host '${parsedUrl.hostname}' is not on the configured ALLOWED_DOWNLOAD_HOSTS list`,
           errorCode: 'unsupported_source'
       });
   }

   if (!(SUPPORTED_FORMATS as readonly string[]).includes(format)) {
       return res.status(400).json({ error: "Invalid format", errorCode: 'invalid_url' });
   }

   if (![128, 192, 256, 320].includes(bitrate)) {
       return res.status(400).json({ error: "Invalid bitrate", errorCode: 'invalid_url' });
   }

   const job: DownloadJob = {
       id: crypto.randomUUID(),
       sourceUrl: url,
       status: 'queued',
       progress: 0,
       phase: 'Queued',
       format,
       bitrate,
       createdAt: Date.now(),
       updatedAt: Date.now()
   };

   downloadJobs.unshift(job);
   saveJobsDb();

   res.json(job);
});

// API: Start download job
app.post("/api/download-jobs/:id/start", (req, res) => {
   const job = downloadJobs.find(j => j.id === req.params.id);
   if (!job) return res.status(404).json({ error: "Job not found" });

   if (job.status !== "queued") {
       return res.status(400).json({ error: "Job is not in queued state" });
   }

   if (jobProcesses.has(job.id)) {
       return res.status(409).json({ error: "Job is already running" });
   }

   runDownloadEngine(job.id);
   res.json(job);
});

// API: Get all jobs
app.get("/api/download-jobs", (req, res) => {
   res.json(downloadJobs);
});

// API: Get single job
app.get("/api/download-jobs/:id", (req, res) => {
   const job = downloadJobs.find(j => j.id === req.params.id);
   if (job) res.json(job);
   else res.status(404).json({ error: "Job not found" });
});

// API: Get job logs only
app.get("/api/download-jobs/:id/logs", (req, res) => {
   const job = downloadJobs.find(j => j.id === req.params.id);
   if (!job) return res.status(404).json({ error: "Job not found" });
   res.json({ id: job.id, logs: job.logs || [] });
});

// API: Delete job
app.delete("/api/download-jobs/:id", (req, res) => {
   const job = downloadJobs.find(j => j.id === req.params.id);
   if (!job) return res.status(404).json({ error: "Job not found" });

   // Active = currently running. Queued jobs are deletable.
   if (isActiveJobStatus(job.status) && job.status !== 'queued') {
       return res.status(409).json({ error: "Cancel active job before deleting" });
   }

   cleanupJobFiles(job.id, job.outputFilename);
   downloadJobs = downloadJobs.filter(j => j.id !== req.params.id);
   saveJobsDb();
   res.json({ success: true });
});

// API: Retry job
app.post("/api/download-jobs/:id/retry", (req, res) => {
   const job = downloadJobs.find(j => j.id === req.params.id);
   if (!job) return res.status(404).json({ error: "Job not found" });

   if (job.status !== 'failed' && job.status !== 'cancelled') {
       return res.status(400).json({ error: "Only failed or cancelled jobs can be retried." });
   }

   if (jobProcesses.has(job.id)) {
       return res.status(409).json({ error: "Job is already running" });
   }

   // Clean up any leftover artifacts from the prior attempt before retrying.
   cleanupJobFiles(job.id, job.outputFilename);

   job.status = 'queued';
   job.phase = 'Queued';
   job.progress = 0;
   job.error = undefined;
   job.errorCode = undefined;
   job.logs = [];
   job.actualDuration = undefined;
   job.actualBitrate = undefined;
   job.outputFilename = undefined;
   job.resultTrackId = undefined;
   job.speed = undefined;
   job.eta = undefined;
   job.updatedAt = Date.now();
   saveJobsDb();

   runDownloadEngine(job.id);

   res.json(job);
});

// API: Cancel job
app.post("/api/download-jobs/:id/cancel", (req, res) => {
   const job = downloadJobs.find(j => j.id === req.params.id);
   if (!job) return res.status(404).json({ error: "Job not found" });

   if (isTerminalJobStatus(job.status)) {
       return res.status(400).json({ error: "Cannot cancel a job that is complete, failed, or already cancelled." });
   }

   job.status = 'cancelled';
   job.phase = 'Cancelled';
   job.errorCode = 'cancelled';
   job.updatedAt = Date.now();
   if (job.logs) job.logs.push(`[${new Date().toISOString()}] Job cancelled by user.`);

   killJobProcess(job.id);
   cleanupJobFiles(job.id);

   saveJobsDb();
   res.json(job);
});


// API: Factory Reset
app.post("/api/reset", (req, res) => {
   try {
       const summary = {
          tracksDeleted: tracks.length,
          jobsDeleted: downloadJobs.length,
          filesDeleted: 0,
          processesKilled: 0
       };

       // 1. Kill any active job processes first so they don't race against file deletion.
       summary.processesKilled = killAllJobProcesses();

       // 2. Clear in-memory state.
       tracks = [];
       downloadJobs = [];

       // 3. Delete every file in uploads/ via the safe-resolve gate.
       let entries: string[] = [];
       try { entries = fs.readdirSync(UPLOADS_DIR_ABS); } catch (_e) { entries = []; }
       for (const entry of entries) {
           const safe = safeResolveUploadPath(entry);
           if (!safe) continue;
           try {
              if (fs.lstatSync(safe).isFile()) {
                 fs.unlinkSync(safe);
                 summary.filesDeleted++;
              }
           } catch (e: any) {
              if (e?.code !== 'ENOENT') {
                 console.warn(`reset: failed to remove ${entry}: ${e.message}`);
              }
           }
       }

       // 4. Recreate db.json and jobs.json as empty arrays so the app starts clean.
       try { fs.writeFileSync(DB_FILE, '[]'); } catch (e: any) { console.warn(`reset: failed to recreate db.json: ${e.message}`); }
       try { fs.writeFileSync(JOBS_FILE, '[]'); } catch (e: any) { console.warn(`reset: failed to recreate jobs.json: ${e.message}`); }

       res.json({
           success: true,
           message: "Factory reset complete",
           summary
       });
   } catch (error: any) {
       console.error("Factory reset failed:", error);
       res.status(500).json({ error: "Failed to perform factory reset", details: error.message });
   }
});

// Vite middleware for dev or static serving for prod
async function setupVite() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

export async function startServer(port: number = PORT) {
  await setupVite();
  return app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

// Limited internal accessor used by lifecycle tests / manual verification scripts.
// Not part of the public HTTP API; safe to leave exported in production since it
// only exposes a getter to the same in-memory state the routes already mutate.
export const __serverInternals = {
  getDownloadJobs: () => downloadJobs,
  getJobProcesses: () => jobProcesses,
};

let shuttingDown = false;
const shutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  const killed = killAllJobProcesses();
  console.log(`Received ${signal}; terminated ${killed} active job process(es). Exiting.`);
  process.exit(0);
};

if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  startServer();
}
