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

const app = express();
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
type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  sourceType: 'local' | 'url';
  sourceUrl?: string;
  localUrl: string;
  format: string;
  bitrate?: number;
  duration: number;
  size: number;
  coverArt?: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
};

let tracks: Track[] = [];
if (fs.existsSync(DB_FILE)) {
  try {
    tracks = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
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

// API: Upload track
app.post("/api/tracks/upload", upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const mimeType = mime.lookup(file.originalname) || '';
    if (!mimeType.startsWith('audio/') && !mimeType.startsWith('video/')) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: "File is not recognized as a valid audio file" });
    }

    // Parse metadata if provided
    const metadataStr = req.body.metadata;
    let metadata: any = {};
    if (metadataStr) {
       try { metadata = JSON.parse(metadataStr); } catch(e) {}
    }

    let actualDuration = 0;
    let actualBitrate = 0;
    let format = path.extname(file.originalname).replace('.', '') || 'mp3';

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
         if (formatData && formatData.duration) {
             actualDuration = parseFloat(formatData.duration);
         }
         if (formatData && formatData.bit_rate) {
             actualBitrate = Math.round(parseInt(formatData.bit_rate) / 1000);
         }
         if (formatData && formatData.format_name) {
             format = formatData.format_name.split(',')[0];
         }
    } catch(probeErr) {
         console.error('ffprobe error on upload:', probeErr);
    }

    const t: Track = {
      id: crypto.randomUUID(),
      title: metadata.title || file.originalname.replace(/\.[^/.]+$/, ""),
      artist: metadata.artist || 'Unknown Artist',
      sourceType: 'local',
      localUrl: `/api/stream/${file.filename}`,
      format: format,
      duration: actualDuration,
      bitrate: actualBitrate,
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
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// API: Update track
app.patch("/api/tracks/:id", (req, res) => {
  const id = req.params.id;
  const trackIdx = tracks.findIndex(t => t.id === id);
  if (trackIdx !== -1) {
    const track = tracks[trackIdx];
    const { title, artist, album, genre, favorite } = req.body;

    if (title !== undefined) track.title = title;
    if (artist !== undefined) track.artist = artist;
    if (album !== undefined) track.album = album;
    if (genre !== undefined) track.genre = genre;
    if (favorite !== undefined) track.favorite = favorite;
    track.updatedAt = Date.now();

    saveDb();
    res.json(track);
  } else {
    res.status(404).json({ error: "Track not found" });
  }
});

// API: Stream file
app.get("/api/stream/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const file = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(file)) return res.status(404).send('Not found');

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
        const filepath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filepath) && filepath.startsWith(UPLOADS_DIR)) {
             fs.unlinkSync(filepath);
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
  format: 'mp3' | 'wav' | 'm4a';
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
    if (['queued', 'analyzing', 'downloading', 'converting', 'indexing'].includes(job.status)) {
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
         if (job.outputFilename) {
             const p = path.join(UPLOADS_DIR, job.outputFilename);
             if (fs.existsSync(p)) fs.unlinkSync(p);
         }
         try {
             const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith(`${job.id}-`));
             for (const f of files) fs.unlinkSync(path.join(UPLOADS_DIR, f));
         } catch(e) {}
      }
   }

   const initialLen = downloadJobs.length;
   downloadJobs = downloadJobs.filter(job => {
      if (['queued', 'analyzing', 'downloading', 'converting', 'indexing'].includes(job.status)) return true;
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
            sourceType: 'url' as const,
            sourceUrl: job.sourceUrl,
            localUrl: `/api/stream/${actualFile}`,
            format: job.format,
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

   if (!['mp3', 'wav', 'm4a'].includes(format)) {
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
   const originalLen = downloadJobs.length;
   const job = downloadJobs.find(j => j.id === req.params.id);
   if (job) {
       if (job.status !== 'complete' && job.status !== 'failed' && job.status !== 'cancelled' && job.status !== 'queued') {
           return res.status(400).json({ error: "Cannot delete an active job. Cancel it first." });
       }
   }
   downloadJobs = downloadJobs.filter(j => j.id !== req.params.id);
   if (downloadJobs.length < originalLen) {
       saveJobsDb();
       res.json({ success: true });
   } else {
       res.status(404).json({ error: "Job not found" });
   }
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

   job.status = 'queued';
   job.phase = 'Queued';
   job.progress = 0;
   job.error = undefined;
   job.errorCode = undefined;
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

   if (job.status === 'complete' || job.status === 'failed' || job.status === 'cancelled') {
       return res.status(400).json({ error: "Cannot cancel a job that is complete, failed, or already cancelled." });
   }

   job.status = 'cancelled';
   job.phase = 'Cancelled';
   job.errorCode = 'cancelled';
   job.updatedAt = Date.now();
   if (job.logs) job.logs.push(`[${new Date().toISOString()}] Job cancelled by user.`);
   saveJobsDb();

   const proc = jobProcesses.get(job.id);
   if (proc) {
       try { proc.kill('SIGTERM'); } catch(e) {}
       jobProcesses.delete(job.id);
   }

   // Cleanup partial files
   try {
      const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith(`${job.id}-`));
      for(const f of files) fs.unlinkSync(path.join(UPLOADS_DIR, f));
   } catch(e) {}

   res.json(job);
});


// API: Factory Reset
app.post("/api/reset", (req, res) => {
   try {
       const summary = {
          tracksDeleted: tracks.length,
          jobsDeleted: downloadJobs.length,
          filesDeleted: 0
       };

       // Clear in-memory arrays
       tracks = [];
       downloadJobs = [];

       // Clear files
       if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
       if (fs.existsSync(JOBS_FILE)) fs.unlinkSync(JOBS_FILE);

       const files = fs.readdirSync(UPLOADS_DIR);
       for (const file of files) {
           const fullPath = path.join(UPLOADS_DIR, file);
           // Don't delete directories, and don't delete db files we already handled (though they should be gone)
           if (fs.lstatSync(fullPath).isFile()) {
               fs.unlinkSync(fullPath);
               summary.filesDeleted++;
           }
       }

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
