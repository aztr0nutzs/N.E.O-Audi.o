import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Track, Playlist, AppSettings } from '../types';

interface NeoDB extends DBSchema {
  playlists: {
    key: string;
    value: Playlist;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = 'neo-downloader-db-v2';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<NeoDB>> | null = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<NeoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

// Best-effort error extraction from a non-ok fetch Response.
async function extractApiError(res: Response, fallback: string): Promise<string> {
   try {
      const data = await res.json();
      if (data && typeof data.error === 'string') return data.error;
   } catch (_) { /* not JSON */ }
   return `${fallback} (HTTP ${res.status})`;
}

// Fields the backend is willing to accept as metadata overrides on PATCH.
type EditableTrackFields = Pick<Track, 'title' | 'artist' | 'album' | 'genre' | 'favorite' | 'mood' | 'tags' | 'notes' | 'energyLevel' | 'explicit' | 'coverArtUrl'>;

export const storage = {
  // Upload a new audio file. `overrides` may carry user-supplied title/artist;
  // everything else (format, duration, bitrate, size, sourceType, localUrl) is
  // determined by the backend from the actual file. Do not send placeholder
  // values from the frontend.
  async uploadTrack(audioBlob: Blob, overrides: Partial<Track> = {}, filename?: string): Promise<Track> {
     const fd = new FormData();
     const safeName = filename || (overrides.title ? `${overrides.title}.audio` : 'upload.audio');
     fd.append('file', audioBlob, safeName);
     const metaPayload: Record<string, string> = {};
     if (typeof overrides.title === 'string' && overrides.title.trim()) metaPayload.title = overrides.title.trim();
     if (typeof overrides.artist === 'string' && overrides.artist.trim()) metaPayload.artist = overrides.artist.trim();
     fd.append('metadata', JSON.stringify(metaPayload));
     const res = await fetch('/api/tracks/upload', { method: 'POST', body: fd });
     if (!res.ok) throw new Error(await extractApiError(res, 'Failed to upload'));
     return await res.json();
  },

  async saveTrack(track: Track, audioBlob?: Blob) {
    if (audioBlob) {
       // Legacy entry point: preserve compatibility with callers that still
       // pass a full Track shape, but only forward editable overrides.
       const filename = track.title ? `${track.title}.audio` : 'upload.audio';
       return await storage.uploadTrack(audioBlob, track, filename);
    }
    // Update existing track. Only forward editable fields so we never try to
    // patch derived data (format, duration, etc.) onto the server.
    const editable: Partial<EditableTrackFields> = {};
    if (track.title !== undefined) editable.title = track.title;
    if (track.artist !== undefined) editable.artist = track.artist;
    if (track.album !== undefined) editable.album = track.album;
    if (track.genre !== undefined) editable.genre = track.genre;
    if (track.favorite !== undefined) editable.favorite = track.favorite;
    if (track.mood !== undefined) editable.mood = track.mood;
    if (track.tags !== undefined) editable.tags = track.tags;
    if (track.notes !== undefined) editable.notes = track.notes;
    if (track.energyLevel !== undefined) editable.energyLevel = track.energyLevel;
    if (track.explicit !== undefined) editable.explicit = track.explicit;
    if (track.coverArtUrl !== undefined) editable.coverArtUrl = track.coverArtUrl;

    const res = await fetch(`/api/tracks/${track.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editable)
    });
    if (!res.ok) throw new Error(await extractApiError(res, 'Failed to update track'));
    return await res.json();
  },

  async getTrack(id: string): Promise<Track | undefined> {
    const tracks = await storage.getAllTracks();
    return tracks.find(t => t.id === id);
  },

  async getAllTracks(): Promise<Track[]> {
    const res = await fetch('/api/tracks');
    if (!res.ok) return [];
    return await res.json();
  },

  async getAudioBlob(_trackId: string): Promise<Blob | undefined> {
    // We don't get blobs via API usually, we return null so getAudioUrl uses the URL
    return undefined;
  },

  async deleteTrack(id: string) {
    const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await extractApiError(res, 'Failed to delete track'));
    return await res.json().catch(() => ({ success: true }));
  },

  async uploadCoverArt(trackId: string, file: File): Promise<Track> {
    const fd = new FormData();
    fd.append('cover', file);
    const res = await fetch(`/api/tracks/${trackId}/cover`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await extractApiError(res, 'Failed to upload cover art'));
    return await res.json();
  },

  async removeCoverArt(trackId: string): Promise<Track> {
    const res = await fetch(`/api/tracks/${trackId}/cover`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await extractApiError(res, 'Failed to remove cover art'));
    return await res.json();
  },

  async savePlaylist(playlist: Playlist) {
    const db = await getDB();
    await db.put('playlists', playlist);
  },

  async getPlaylists(): Promise<Playlist[]> {
    const db = await getDB();
    return db.getAll('playlists');
  },
  
  async deletePlaylist(id: string) {
    const db = await getDB();
    await db.delete('playlists', id);
  },

  async saveSettings(settings: AppSettings) {
    const db = await getDB();
    await db.put('settings', settings, 'main');
  },

  async getSettings(): Promise<AppSettings | undefined> {
    const db = await getDB();
    return db.get('settings', 'main');
  },

  async clearBrowserData() {
    const db = await getDB();
    await db.clear('playlists');
    await db.clear('settings');
  }
};
