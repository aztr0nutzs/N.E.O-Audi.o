# N.E.O Audio Lab

A cyberpunk-themed audio downloader, library, player, uploader, and equalizer interface built with React, Vite, and Express.

## Safety and Compliance

**CRITICAL COMPLIANCE RULE:** The downloader module is strictly for audio that you own, have explicit legal permission to download, or that is unambiguously in the public domain or covered by a permissive license (such as Creative Commons). **Do not use this tool for copyright infringement.** By using N.E.O Audio Lab you assume full responsibility and must verify your legal rights to any targeted network resource before initiating any download job.

## What the package ships

- `node_modules` is intentionally **not** packaged — run `npm ci` after extraction to install pinned dependencies from `package-lock.json`.
- `dist` is intentionally **not** packaged — produce a production build locally with `npm run build`.
- `uploads/db.json` and `uploads/jobs.json` ship as empty arrays (`[]`); the running server reads/writes them in place.

## Capabilities

- **UI shell:** full N.E.O. neon navigation, reactor visuals, armored panels, and custom typography (preserved end-to-end).
- **Local uploads:** drop in audio files in **MP3, WAV, or M4A** from your device; the Express backend probes them with `ffprobe` and writes them to `uploads/`.
- **Library:** persistent track index served from the backend, queryable from the Library page.
- **Player & Equalizer:** real-time playback, 10-band EQ with presets and spatial control, visualizer synced to the audio reactor.
- **Downloader Engine:** real background download/extraction queue powered by **yt-dlp** (via `youtube-dl-exec`), **ffmpeg** (via `@ffmpeg-installer/ffmpeg`), and **ffprobe** (via `ffprobe-static`). Queued jobs are analyzed, extracted, converted to the selected format/bitrate, verified, and indexed into the Library. Real-time logs, progress, cancel, retry, and remove are all wired.

## Tech Stack

- **Frontend:** React 19, Zustand, Tailwind CSS, Lucide Icons, Motion, React Router
- **Backend:** Express, Multer, CORS, dotenv, youtube-dl-exec (yt-dlp), `@ffmpeg-installer/ffmpeg`, `ffprobe-static`, `sanitize-filename`, `mime-types`
- **Tooling:** TypeScript, Vite, Vitest, Testing Library, Supertest

## Running the App

After extracting the package:

1. `npm ci` — install pinned dependencies (do not use `npm install` here; `npm ci` reproduces the exact tree from `package-lock.json`).
2. `npm run dev` — launches Express on port 3000 with Vite middleware for HMR.

For a production build:

1. `npm run build` — the production build command. Bundles the frontend with Vite and the server with esbuild to `dist/`.
2. `npm start` — the production start command. Serves `dist/server.cjs` on port 3000.

## Downloader Engine

### Provider Policy (optional)

Set `ALLOWED_DOWNLOAD_HOSTS` to a comma-separated list of hostnames the engine is willing to accept (e.g. `upload.wikimedia.org,*.archive.org`). Leave it empty to allow any http(s) source — the Safety and Compliance rule above still applies to every request you make.

### Error Codes

When a job fails, `errorCode` is one of:

- `invalid_url` — malformed URL, wrong protocol, missing hostname
- `invalid_format` — `format` is not one of `mp3`, `wav`, `m4a`
- `invalid_bitrate` — `bitrate` is not one of `128`, `192`, `256`, `320`
- `unsupported_source` — host not on allowlist, or yt-dlp cannot handle the URL
- `metadata_failed` — yt-dlp could not read media info
- `duration_limit_exceeded` — exceeds `MAX_DOWNLOAD_DURATION_SECONDS`
- `size_limit_exceeded` — exceeds `MAX_DOWNLOAD_SIZE_MB`
- `engine_missing` — yt-dlp/ffmpeg binary not available
- `download_failed` — network or yt-dlp runtime failure
- `conversion_failed` — ffmpeg postprocessor failure or missing output
- `verification_failed` — output file fails ffprobe / size / extension checks
- `cancelled` — user cancelled the job

## Tests

- `npm run lint` — `tsc --noEmit`
- `npm run build` — Vite production build + server bundle
- `npm test` — Vitest suites: backend supertest cases, UI smoke renders, player/equalizer store tests
