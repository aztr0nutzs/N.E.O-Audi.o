# N.E.O. File Manager & Audio Reactor

A cyberpunk-themed audio player, visualizer, and downloader interface built with React, Vite, and Express.

## Safety and Compliance

**CRITICAL COMPLIANCE RULE:** The downloader module and all acquisition features are STRICTLY designed for use ONLY with audio that you inherently own, have explicit legal permission to download, or audio that is unquestionably in the public domain or covered under permissive licenses (such as Creative Commons). 

**DO NOT USE THIS TOOL FOR COPYRIGHT INFRINGEMENT.**

By using this tool, you assume all responsibility and MUST verify your legal rights to any targeted network resource before initiating any download job.

## Current State & Capabilities

This project implements a highly polished "cyberpunk/neon" UI shell and robust local file management.

**Currently Working:**
- **UI Shell:** Full navigation, visual systems (neon borders, active states, custom typography).
- **Library & Local Uploads:** Users can manually upload MP3/audio files into the system, which are stored locally via the Express backend.
- **Audio Reactor:** Local audio playback with full visualizer syncing (via `useEqualizerStore` and `usePlayerStore`).
- **Equalizer:** Real-time playback manipulation mimicking physical faders and response curves.
- **Downloading Engine:** A real background download/extraction engine using `yt-dlp` and `ffmpeg`. It queues jobs, analyzes targets, extracts audio, converts to the specified format (MP3, WAV, M4A) and selected bitrate, and exposes real-time logs/progress.

## Tech Stack
- Frontend: React 19, Zustand, Tailwind CSS, Lucide Icons, Motion
- Backend: Express, Multer, CORS, dotenv, youtube-dl-exec (yt-dlp), `@ffmpeg-installer/ffmpeg`, `ffprobe-static`, `sanitize-filename`, `mime-types`
- Types: TypeScript

## Downloader Engine

The downloader is powered by **yt-dlp** (via `youtube-dl-exec`) for source extraction, **ffmpeg** (provided by `@ffmpeg-installer/ffmpeg`) for audio conversion, and **ffprobe** (provided by `ffprobe-static`) for verifying the produced files. Only audio you legally own or that is unambiguously permitted may be processed (see the Safety and Compliance section above).

## Running the App

1. `npm install`
2. `npm run dev` (Ensure configuration maps Express to 3000 and Vite middleware).
3. `npm run build && npm start` for production.
