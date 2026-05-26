
<div align="center">
  <img src="./public/assets/neo_audio/neo_audio_boot.png" alt="N.E.O Audio Lab hero artwork" width="520" />

# N.E.O Audio Lab

<p>
  <strong>Cyberpunk audio downloader, library, player, queue, analyzer, and equalizer lab.</strong>
</p>

<p>
  <img src="https://img.shields.io/badge/Platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Platform Android" />
  <img src="https://img.shields.io/badge/Stack-React%20%7C%20Vite%20%7C%20Express-00F0FF?style=for-the-badge&logo=react&logoColor=white" alt="React Vite Express" />
  <img src="https://img.shields.io/badge/Audio-Playback%20%7C%20EQ%20%7C%20Queue-FF6B6B?style=for-the-badge" alt="Playback EQ Queue" />
  <img src="https://img.shields.io/badge/Status-In%20Progress-F7B731?style=for-the-badge" alt="In Progress" />
</p>

</div>

## Overview

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

<br />

<div align="center">
  <img src="./public/assets/neo_audio/neo_audio_header3.png" alt="N.E.O Audio Lab dashboard and utility screen header" width="760" />
  <br />

<br />

## Visual System

N.E.O Audio Lab uses deterministic branded artwork instead of random README imagery. Header variants are assigned by screen type, the global background sits behind the app shell, and the startup artwork is used only for the in-app boot sequence.

<br />

<div align="center">
  <img src="./public/assets/neo_audio/neo_audio_header4.png" alt="N.E.O Audio Lab player and audio workspace header" width="680" />
  <br />

<br />

The main app surface uses the neon alley background as a stable default layer behind the dashboard, downloader, player, library, equalizer, and settings screens.

<br />

<div align="center">
  <img src="./public/assets/neo_audio/neo_audio_backround.png" alt="N.E.O Audio Lab global neon alley background" width="520" />
  <br />
  <sub>Global app background used behind the main shell and screens.</sub>
</div>

<br />

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

## App Icon

The launcher icon source lives at `public/assets/neo_audio/neo_audio_icon.png` and is exported through `src/lib/neoAudioAssets.ts` as `NEO_AUDIO_ICON`. It is also referenced as the web favicon (`/favicon.png`), `apple-touch-icon`, and PWA manifest icon (`/manifest.json`).

> **APK launcher icon requires an Android/Capacitor wrapper.** This repository ships the web app only, so web/PWA icon is configured using `neo_audio_icon.png`. To produce Android launcher densities (`mipmap-mdpi`/`hdpi`/`xhdpi`/`xxhdpi`/`xxxhdpi`), add a Capacitor (or equivalent) wrapper and generate `ic_launcher.png` from `public/assets/neo_audio/neo_audio_icon.png`.

## N.E.O Audio UI Assets

- **Player transport controls** use the 14 supplied N.E.O Audio image buttons rendered through `<NeoImageButton>` (real `<button>` elements with `aria-label`, keyboard activation, active glow, and dimmed disabled state). The mapping is:

  | Asset | Action |
  | --- | --- |
  | `play.png` | Resume / play |
  | `pause.png` | Pause |
  | `stop.png` | Stop playback (pause + reset to 0) |
  | `next.png` | Next track |
  | `last.png` | Previous track |
  | `fast-fwd.png` | Seek forward 15 seconds |
  | `rewind.png` | Seek backward 15 seconds |
  | `shuffle.png` | Toggle shuffle (active glow) |
  | `repeat.png` | Cycle repeat mode (active glow) |
  | `playlist.png` | Navigate to `/library` |
  | `eq.png` | Navigate to `/equalizer` |
  | `equalizer.png` | Navigate to `/equalizer` (advanced shortcut) |
  | `download.png` | Navigate to `/download` |
  | `settings.png` | Navigate to `/settings` |

- **Bottom dock** uses `public/assets/neo_audio/neo_audio_dock.png` as the visual rail. The dock image is decorative — real overlay `<NavLink>` and `<button>` elements sit on top with their own hit areas (HOME → `/`, CHAT slot disabled, CENTER N → `/player`, GAMES → `/library`, SETTINGS → `/settings`). A compact secondary strip below the dock keeps `/download`, `/upload`, and `/equalizer` reachable so no route is hidden behind dead art.
- **Headers** use deterministic N.E.O variants through `<NeoAudioHeader>`: `neo_audio_header3.png` for Dashboard, Downloader, Uploader, and Settings; `neo_audio_header4.png` for Player, Library, Equalizer, and Track Detail.
- **Global background** uses `neo_audio_backround.png` as the default app shell background.
- **Web/PWA icon** uses `neo_audio_icon.png` as documented above.

## Startup Boot Sequence

The startup sequence is intentionally short and branded: it begins with the initialization artwork, transitions into the hero reveal, then fades into the existing app shell without replaying during route navigation.

<br />

<div align="center">
  <img src="./public/assets/neo_audio/neo_audio_boot_initializing.png" alt="N.E.O Audio Lab system initializing boot frame" width="760" />
  <br />
  <sub>Stage 1: system initializing.</sub>
</div>

<br />

After initialization, the app presents the final hero frame briefly before handing control to the dashboard.

<br />

<div align="center">
  <img src="./public/assets/neo_audio/neo_audio_boot.png" alt="N.E.O Audio Lab final boot hero frame" width="520" />
  <br />
  <sub>Final frame: branded hero reveal.</sub>
</div>

<br />

- Uses branded N.E.O startup artwork from `public/assets/neo_audio/neo_audio_boot_initializing.png` and `public/assets/neo_audio/neo_audio_boot.png`.
- Shows a short initialization-to-hero startup flow before fading into the app shell.
- Designed for mobile and Android-friendly launch behavior with safe-area padding and contained artwork framing.
- Runs once per browser session and does not replay during normal in-app navigation.

## Queue / Up Next

- Real playback queue with the current signal, Up Next list, and playback history.
- Add tracks from the Library, add whole visible groups, remove upcoming tracks, clear the queue, and clear history.
- Reorder upcoming tracks with accessible move up/down controls and shuffle the remaining queue.
- Open Queue / Up Next from the Player, Dashboard preview, and MiniPlayer queue control.
- Save the current queue snapshot as a playlist when the queue has tracks.

## EQ Preset Vault

- Built-in presets are grouped into Core, Bass, Vocals, Night, Retro, Device, and Custom categories.
- Custom presets save locally with the current 10-band curve and spatial setting, and can be renamed or deleted.
- A/B compare captures two EQ states and reapplies either slot without interrupting playback.
- Mini curve previews show preset and compare-slot response shapes without a chart dependency.
- Presets persist locally through `neo-eq-custom-presets`; A/B compare is session-only.

## Cover Art System

- Tracks support embedded, uploaded, downloaded, and generated cover art metadata.
- Uploaded cover art is stored under `uploads/covers/` and served through safe `/api/covers/:filename` paths.
- Local uploads attempt embedded artwork extraction; downloaded jobs attempt thumbnail capture and continue with generated fallback art if unavailable.
- Generated N.E.O fallback covers use deterministic neon reactor visuals based on track title, artist, genre, or mood.
- Cover art appears across Library, Player, Dashboard, Queue, Track Detail, MiniPlayer, and Metadata Lab where those tracks are displayed.

## Smart Playlists / Mood Packs

- Smart Playlists are auto-generated from source type, quality, favorites, mood, tags, genre, created date, duration, and playback history.
- Mood Packs are functional collections built from real `mood`, then `genre`, then `tags`; they can be opened, played, and added to the queue.
- Playback stats track simple `playCount` and `lastPlayedAt` when a track is started, enabling Most Played and Never Played packs.
- No fake tracks are generated; empty packs render truthful empty states.

## Signal Chain Audio Enhancements

- Web Audio graph now runs `SOURCE -> EQ -> BASS -> VOCAL -> NIGHT -> COMPRESSOR -> SPATIAL -> LIMITER -> OUTPUT -> ANALYSER`.
- Signal modules include EQ, Bass Enhancer, Spatial, Compressor, Limiter, Night Mode, and Vocal Clarity with toggles and intensity controls.
- Limiter/clipping protection is enabled by default, with an analyser-based estimated peak warning.
- Signal chain presets include Clean, Bass Reactor, Night Drive, Vocal Focus, Safe Loud, and Wide Space.
- EQ slider behavior and existing playback/analyser behavior are preserved.

## Android / Capacitor

N.E.O Audio Lab includes a Capacitor Android wrapper for building a debug APK from the existing React/Vite app.

Required tools: Node.js, npm, Android Studio, Android SDK, and a JDK compatible with the generated Gradle/Android plugin.

Runtime architecture: the APK bundles the Vite frontend only. The Express server is not automatically started inside Android WebView, so upload, download, library indexing, cover upload, stream, and reset endpoints require a reachable N.E.O backend.

By default, web builds use relative API paths such as `/api/tracks`. For Android or hosted frontend builds, set a backend origin before building:

```bash
VITE_API_BASE_URL=https://your-neo-backend.example.com npm run android:sync
```

PowerShell:

```powershell
$env:VITE_API_BASE_URL="https://your-neo-backend.example.com"
npm run android:sync
```

If no backend is reachable, server-powered screens report `Backend offline / configure API endpoint` instead of assuming Express is bundled into the APK. Upload/download persistence currently uses the server `uploads/` directory; Android device storage requires future native integration.

Setup and sync:

```bash
npm ci
npm run build
npx cap sync android
npx cap open android
```

Build a debug APK:

```bash
npm run android:build:debug
```

Unix/macOS/Linux Gradle wrapper equivalent:

```bash
cd android
chmod +x gradlew
./gradlew assembleDebug
```

PowerShell Gradle equivalent:

```powershell
cd android
.\gradlew.bat assembleDebug
```

The first Gradle wrapper run may need internet access to download the configured Gradle distribution from `services.gradle.org`. If that host is unreachable, the Android build can fail before compiling the app; configure a local Gradle distribution/cache or restore network access rather than treating that as an app build failure.

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Background playback and media notifications are not complete unless implemented later.

## Tests

- `npm run lint` — `tsc --noEmit`
- `npm run build` — Vite production build + server bundle
- `npm test` — Vitest suites: backend supertest cases, UI smoke renders, player/equalizer store tests

## Audio Command Center

- Dashboard at `/` now acts as a live command center for playback state, library intelligence, downloader operations, EQ/signal-chain status, and quick actions.
- All dashboard values are sourced from real store state (player, library, download jobs, EQ), with explicit standby/empty states when no data exists.
- Empty states are truthful: no fake track, storage, or job telemetry is rendered.


## Live Audio Analyzer

- Analyzer overlay provides Spectrum, Waveform, Stereo estimate, and Reactor modes.
- When live playback is running, visuals read from the Web Audio `AnalyserNode` in real time.
- When no live signal exists, analyzer shows truthful standby visuals/states (no fake telemetry).


## Metadata Lab

- Edit track title, artist, album, genre, mood, tags, notes, favorite state, explicit flag, and energy level.
- Mood Packs are powered by mood/genre/tag metadata.
- Metadata persists through `PATCH /api/tracks/:id`.

## Download Job Diagnostics

- Every downloader job now includes rich diagnostics: phase, progress, status, speed/ETA (when available), output metadata, and retry/cancel/remove actions.
- Failed downloads can be inspected in a neon terminal-style diagnostics drawer that exposes error code/message and recent log lines.
- Job logs are capped to prevent unbounded memory/storage growth.
