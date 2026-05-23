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
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  resultTrackId?: string;
}

const ACTIVE_STATUSES: JobStatus[] = ['queued', 'analyzing', 'downloading', 'converting', 'indexing'];
const TERMINAL_STATUSES: JobStatus[] = ['complete', 'failed', 'cancelled'];
const isActiveJobStatus = (status: JobStatus) => ACTIVE_STATUSES.includes(status);
const isTerminalJobStatus = (status: JobStatus) => TERMINAL_STATUSES.includes(status);

const safeResolveUploadPath = (filename: string | undefined | null): string | null => {
    if (!filename) return null;
    const base = path.basename(filename);
    if (!base || base === '.' || base === '..') return null;
    const resolved = path.resolve(UPLOADS_DIR, base);
    const root = path.resolve(UPLOADS_DIR) + path.sep;
    if (!resolved.startsWith(root)) return null;
    return resolved;
};

const cleanupJobFiles = (jobId: string, outputFilename?: string | null) => {
    const target = safeResolveUploadPath(outputFilename || undefined);
    if (target && fs.existsSync(target)) {
        try { fs.unlinkSync(target); } catch (e) { /* best effort */ }
    }
    try {
        const prefix = `${jobId}-`;
        const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith(prefix));
        for (const f of files) {
            const p = safeResolveUploadPath(f);
            if (p && fs.existsSync(p)) {
                try { fs.unlinkSync(p); } catch (e) { /* best effort */ }
            }
        }
    } catch (e) { /* best effort */ }
};

const killJobProcess = (jobId: string, signal: NodeJS.Signals = 'SIGTERM'): boolean => {
    const proc = jobProcesses.get(jobId);
    if (!proc) return false;
    try { proc.kill(signal); } catch (e) { /* best effort */ }
    jobProcesses.delete(jobId);
    return true;
};

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

   for (const job of downloadJobs) {
      if (job.status === 'failed' || job.status === 'cancelled') {
         cleanupJobFiles(job.id, job.outputFilename);
      }
   }

   downloadJobs = downloadJobs.filter(job => {
      if (isActiveJobStatus(job.status)) return true;
      return (now - job.updatedAt) < retentionMs;
   });

   saveJobsDb();
};

cleanupOldAndPartialJobs();

const runDownloadEngine = async (jobId: string) => {
    const job = downloadJobs.find(j => j.id === jobId);
    if (!job || job.status !== 'queued') return;
    
    job.status = 'analyzing';
    job.phase = 'Analyzing format & permissions...';
    job.updatedAt = Date.now();
    job.startedAt = Date.now();
    job.logs = [];
    saveJobsDb();

    const log = (msg: string) => {
        if (job.logs) job.logs.push(`[${new Date().toISOString()}] ${msg}`);
    };
    
    log(`Started processing: ${job.sourceUrl}`);
    
    let actualFile = '';
    
    try {
        const meta = await youtubedl(job.sourceUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true,
            geoBypass: true,
            quiet: true
        });

        const currentJobCheck1 = downloadJobs.find(j => j.id === jobId);
        if (currentJobCheck1 && currentJobCheck1.status === 'cancelled') return;

        const title = (meta as any).title || 'Unknown Title';
        const artist = (meta as any).uploader || 'Unknown Artist';
        const durationStr = (meta as any).duration || 0;
        
        log(`Title: ${title}, Artist: ${artist}, Duration: ${durationStr}s`);

        if (parseInt(durationStr as any) > MAX_DOWNLOAD_DURATION_SECONDS) {
             throw new Error(`Media duration exceeds maximum limit of ${MAX_DOWNLOAD_DURATION_SECONDS} seconds.`);
        }

        const cleanTitle = sanitize(title);
        const fileNameBase = `${job.id}-${cleanTitle}`;
        const outputTemplate = path.join(UPLOADS_DIR, `${fileNameBase}.%(ext)s`);

        job.status = 'downloading';
        job.phase = 'Downloading...';
        job.updatedAt = Date.now();
        saveJobsDb();

        const ffmpegDir = path.dirname(ffmpegInstaller.path);
        
        const subprocess = youtubedl.exec(job.sourceUrl, {
            extractAudio: true,
            audioFormat: job.format,
            audioQuality: job.bitrate,
            output: outputTemplate,
            noWarnings: true,
            noCheckCertificates: true,
            ffmpegLocation: ffmpegDir,
        });

        jobProcesses.set(job.id, subprocess);

        const handleProcessOutput = (data: Buffer) => {
            const output = data.toString();
            // Try to parse progress: [download]  12.5% of ...
            const dlMatch = output.match(/\[download\]\s+(\d+\.\d+)%/);
            if (dlMatch) {
               job.progress = parseFloat(dlMatch[1]);
               job.phase = 'Downloading...';
            }
            if (output.includes('[ExtractAudio]')) {
               job.progress = 100;
               job.phase = 'Converting format (ffmpeg)...';
               log('Extraction started');
            }
        };

        subprocess.stdout?.on('data', handleProcessOutput);
        subprocess.stderr?.on('data', (data: Buffer) => {
           handleProcessOutput(data);
           const str = data.toString().trim();
           if (str && !str.includes('%')) log(`[stderr] ${str}`);
        });

        await subprocess;
        jobProcesses.delete(job.id);
        log('Download/conversion complete');

        const currentJobCheck2 = downloadJobs.find(j => j.id === jobId);
        if (currentJobCheck2 && currentJobCheck2.status === 'cancelled') return;

        const expectedFile = `${fileNameBase}.${job.format}`;
        actualFile = expectedFile;
        // Check finding actual generated file
        if (!fs.existsSync(path.join(UPLOADS_DIR, expectedFile))) {
            const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith(`${fileNameBase}.`));
            if (files.length > 0) {
                actualFile = files[0];
            } else {
                throw new Error('Output file not found after conversion. It may have failed or timed out.');
            }
        }
        
        log(`Found output file: ${actualFile}`);
        const fullPath = path.join(UPLOADS_DIR, actualFile);
        const stat = fs.statSync(fullPath);
        
        if (stat.size < 1024) {
             throw new Error('Output file is suspiciously small (< 1KB). Extraction likely failed.');
        }
        if (stat.size > MAX_DOWNLOAD_SIZE_MB * 1024 * 1024) {
             throw new Error(`Output file exceeds maximum size limit of ${MAX_DOWNLOAD_SIZE_MB}MB.`);
        }

        job.status = 'indexing';
        job.phase = 'Verifying and Finalizing track...';
        job.updatedAt = Date.now();
        saveJobsDb();
        
        // Verify with ffprobe
        let actualDuration = parseInt(durationStr as any) || 0;
        let actualBitrate = job.bitrate;
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
        } catch(probeErr: any) {
             log(`ffprobe warning: ${probeErr.message}`);
             // If ffprobe completely fails to read it, it might be corrupt
             if (probeErr.message.includes('Invalid data found')) {
                 throw new Error('Verification failed: output file is corrupt or not a valid audio format.');
             }
        }
        
        job.outputFilename = actualFile;
        job.actualDuration = actualDuration;
        job.actualBitrate = actualBitrate;
        
        const newTrack = {
            id: crypto.randomUUID(),
            title: cleanTitle,
            artist: artist,
            sourceType: 'url' as const,
            sourceUrl: job.sourceUrl,
            localUrl: `/api/stream/${actualFile}`,
            format: job.format,
            bitrate: actualBitrate,
            duration: actualDuration,
            size: stat.size,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            favorite: false
        };
        
        tracks.unshift(newTrack);
        saveDb();

        job.status = 'complete';
        job.phase = 'Complete';
        job.progress = 100;
        job.resultTrackId = newTrack.id;
        job.completedAt = Date.now();
        job.updatedAt = Date.now();
        log('Job completed successfully');
        saveJobsDb();

    } catch (err: any) {
        const currentJobCheck3 = downloadJobs.find(j => j.id === jobId);
        if (currentJobCheck3 && currentJobCheck3.status === 'cancelled') return;

        jobProcesses.delete(job.id);
        job.status = 'failed';
        job.phase = 'Failed';
        job.error = err.message || 'Unknown error occurred during extraction';
        job.errorCode = 'ERR_ENGINE';
        job.progress = 0;
        job.updatedAt = Date.now();
        if (job.logs) job.logs.push(`[ERROR] ${job.error}`);
        saveJobsDb();

        cleanupJobFiles(job.id, actualFile || undefined);
    }
};

// API: Create Download Job
app.post("/api/download-jobs", (req, res) => {
   const { url, format, bitrate } = req.body;
   
   if (!url) return res.status(400).json({ error: "URL is required" });
   try {
       const parsedUrl = new URL(url);
       if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
           return res.status(400).json({ error: "URL must use http or https protocol" });
       }
       if (!parsedUrl.hostname) {
           return res.status(400).json({ error: "URL must have a valid hostname" });
       }
   } catch (e) {
       return res.status(400).json({ error: "Invalid URL string provided" });
   }
   
   if (!['mp3', 'wav', 'm4a'].includes(format)) {
       return res.status(400).json({ error: "Invalid format" });
   }
   
   if (![128, 192, 256, 320].includes(bitrate)) {
       return res.status(400).json({ error: "Invalid bitrate" });
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

   // runDownloadEngine runs synchronously up to its first await, which
   // mutates the job to 'analyzing' and persists before returning here.
   runDownloadEngine(job.id);
   const updated = downloadJobs.find(j => j.id === job.id) || job;
   res.json(updated);
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

// API: Delete job
app.delete("/api/download-jobs/:id", (req, res) => {
   const job = downloadJobs.find(j => j.id === req.params.id);
   if (!job) return res.status(404).json({ error: "Job not found" });

   // Queued jobs can be removed safely (no process exists yet).
   // Active, mid-run jobs must be cancelled first.
   if (isActiveJobStatus(job.status) && job.status !== 'queued') {
       return res.status(409).json({
           error: "Cannot delete an active job. Cancel it first.",
           code: "ERR_JOB_ACTIVE"
       });
   }

   // Only clean partials for non-complete jobs. Completed jobs' output
   // is owned by the Library track; removing the job must not delete it.
   if (job.status !== 'complete') {
       cleanupJobFiles(job.id, job.outputFilename);
   }
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

   // Sweep any leftover partials from the previous attempt before retrying.
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
   job.startedAt = undefined;
   job.completedAt = undefined;
   job.updatedAt = Date.now();
   saveJobsDb();

   runDownloadEngine(job.id);
   const updated = downloadJobs.find(j => j.id === job.id) || job;
   res.json(updated);
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
   job.updatedAt = Date.now();
   if (job.logs) job.logs.push(`[${new Date().toISOString()}] Job cancelled by user.`);
   saveJobsDb();

   killJobProcess(job.id, 'SIGTERM');
   cleanupJobFiles(job.id, job.outputFilename);

   res.json(job);
});


// API: Factory Reset
app.post("/api/reset", (req, res) => {
   try {
       const summary = {
          tracksDeleted: tracks.length,
          jobsDeleted: downloadJobs.length,
          processesKilled: 0,
          filesDeleted: 0
       };

       // Kill every active yt-dlp/ffmpeg child process first so no
       // orphan keeps writing to uploads/ during the wipe.
       for (const id of Array.from(jobProcesses.keys())) {
           if (killJobProcess(id, 'SIGTERM')) summary.processesKilled++;
       }
       jobProcesses.clear();

       // Mark in-flight jobs as cancelled so the engine's post-await
       // checks bail out cleanly instead of touching the wiped state.
       for (const job of downloadJobs) {
           if (isActiveJobStatus(job.status)) {
               job.status = 'cancelled';
               job.phase = 'Cancelled';
               job.updatedAt = Date.now();
           }
       }

       // Clear in-memory arrays
       tracks = [];
       downloadJobs = [];

       // Clear files
       if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
       if (fs.existsSync(JOBS_FILE)) fs.unlinkSync(JOBS_FILE);

       const files = fs.readdirSync(UPLOADS_DIR);
       for (const file of files) {
           const fullPath = safeResolveUploadPath(file);
           if (!fullPath) continue;
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

let shuttingDown = false;
const shutdown = (signal: NodeJS.Signals) => {
   if (shuttingDown) return;
   shuttingDown = true;
   console.log(`Received ${signal}. Killing ${jobProcesses.size} active job process(es)...`);
   for (const id of Array.from(jobProcesses.keys())) {
      killJobProcess(id, 'SIGTERM');
   }
   jobProcesses.clear();
   try { saveJobsDb(); } catch (e) { /* best effort */ }
   process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

setupVite();
