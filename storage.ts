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

export const storage = {
  async saveTrack(track: Track, audioBlob?: Blob) {
    if (audioBlob) {
       const fd = new FormData();
       fd.append('file', audioBlob, track.title || 'upload.mp3');
       fd.append('metadata', JSON.stringify(track));
       const res = await fetch('/api/tracks/upload', {
          method: 'POST',
          body: fd
       });
       if (!res.ok) throw new Error("Failed to upload");
       return await res.json();
    }
    // Update existing track
    const res = await fetch(`/api/tracks/${track.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(track)
    });
    if (!res.ok) throw new Error("Failed to update track");
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

  async getAudioBlob(trackId: string): Promise<Blob | undefined> {
    // We don't get blobs via API usually, we return null so getAudioUrl uses the URL
    return undefined;
  },

  async deleteTrack(id: string) {
    await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
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
