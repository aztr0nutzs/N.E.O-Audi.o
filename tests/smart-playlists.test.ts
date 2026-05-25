import { describe, expect, it } from 'vitest';
import { buildMoodPacks, buildSmartPlaylists, normalizeMoodToken } from '../src/lib/smartPlaylists';
import { Track } from '../src/types';

const track = (overrides: Partial<Track>): Track => ({
  id: overrides.id || 'id',
  title: overrides.title || 'Track',
  artist: overrides.artist || 'Artist',
  sourceType: overrides.sourceType || 'local',
  localUrl: 'blob:x',
  format: overrides.format || 'mp3',
  bitrate: overrides.bitrate,
  duration: overrides.duration ?? 120,
  size: 100,
  createdAt: overrides.createdAt ?? 1,
  updatedAt: overrides.updatedAt ?? 1,
  favorite: overrides.favorite ?? false,
  mood: overrides.mood,
  genre: overrides.genre,
  tags: overrides.tags,
  playCount: overrides.playCount,
});

describe('smart playlist utilities', () => {
  const tracks = [
    track({ id: 'new', createdAt: 10, sourceType: 'local', genre: 'ambient', duration: 80 }),
    track({ id: 'fav', favorite: true, sourceType: 'downloaded', bitrate: 320, mood: 'Night Drive', playCount: 4 }),
    track({ id: 'bass', tags: ['Bass Heavy', 'Workout'], duration: 500 }),
    track({ id: 'retro', genre: 'Retro Synth', format: 'wav' }),
    track({ id: 'vocal', mood: 'Podcast Vocals' }),
  ];

  it('builds Recently Added sorted by created date', () => {
    const recentlyAdded = buildSmartPlaylists(tracks).find(pack => pack.id === 'recently-added');
    expect(recentlyAdded?.trackIds[0]).toBe('new');
  });

  it('builds Favorites, Downloaded, Local Uploads, and High Quality', () => {
    const packs = buildSmartPlaylists(tracks);
    expect(packs.find(pack => pack.id === 'favorites')?.trackIds).toEqual(['fav']);
    expect(packs.find(pack => pack.id === 'downloaded')?.trackIds).toEqual(['fav']);
    expect(packs.find(pack => pack.id === 'local-uploads')?.trackIds).toContain('new');
    expect(packs.find(pack => pack.id === 'high-quality')?.trackIds).toEqual(expect.arrayContaining(['fav', 'retro']));
  });

  it('builds Most Played and Never Played from playCount', () => {
    const packs = buildSmartPlaylists(tracks);
    expect(packs.find(pack => pack.id === 'most-played')?.trackIds).toEqual(['fav']);
    expect(packs.find(pack => pack.id === 'never-played')?.trackIds).toEqual(expect.arrayContaining(['new', 'bass']));
  });

  it('matches mood, tag, and genre smart packs', () => {
    const packs = buildSmartPlaylists(tracks);
    expect(packs.find(pack => pack.id === 'bass-heavy')?.trackIds).toContain('bass');
    expect(packs.find(pack => pack.id === 'night-drive')?.trackIds).toEqual(expect.arrayContaining(['fav', 'retro']));
    expect(packs.find(pack => pack.id === 'chill-focus')?.trackIds).toContain('new');
    expect(packs.find(pack => pack.id === 'vocals')?.trackIds).toContain('vocal');
    expect(packs.find(pack => pack.id === 'retro-synth')?.trackIds).toContain('retro');
  });

  it('returns empty groups safely', () => {
    const packs = buildSmartPlaylists([]);
    expect(packs.find(pack => pack.id === 'favorites')?.trackIds).toEqual([]);
  });
});

describe('mood pack utilities', () => {
  it('normalizes mood tokens', () => {
    expect(normalizeMoodToken('  Night-Drive  ')).toBe('night drive');
  });

  it('groups by mood before genre or tags', () => {
    const packs = buildMoodPacks([
      track({ id: 'a', mood: 'Night Drive', genre: 'Ignored' }),
      track({ id: 'b', mood: 'Night Drive', tags: ['Ignored'] }),
    ]);
    expect(packs.find(pack => pack.mood === 'night drive')?.trackIds).toEqual(['a', 'b']);
  });

  it('falls back to genre, then tags, and ignores empty metadata', () => {
    const packs = buildMoodPacks([
      track({ id: 'genre', genre: 'Lo-Fi, Focus' }),
      track({ id: 'tag', tags: ['Arcade'] }),
      track({ id: 'empty' }),
    ]);
    expect(packs.find(pack => pack.mood === 'lo fi')?.trackIds).toEqual(['genre']);
    expect(packs.find(pack => pack.mood === 'focus')?.trackIds).toEqual(['genre']);
    expect(packs.find(pack => pack.mood === 'arcade')?.trackIds).toEqual(['tag']);
    expect(packs.flatMap(pack => pack.trackIds)).not.toContain('empty');
  });
});

