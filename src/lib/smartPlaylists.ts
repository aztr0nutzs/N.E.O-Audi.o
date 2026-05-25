import { MoodPack, SmartPlaylist, SmartPlaylistId, Track } from '../types';

const SMART_DEFINITIONS: Array<Omit<SmartPlaylist, 'trackIds'>> = [
  { id: 'recently-added', name: 'Recently Added', description: 'Newest signals indexed into the vault.', color: 'cyan', ruleSummary: 'Sorted by newest created date' },
  { id: 'favorites', name: 'Favorites', description: 'Tracks marked as priority signals.', color: 'yellow', ruleSummary: 'favorite is true' },
  { id: 'most-played', name: 'Most Played', description: 'Signals with playback history.', color: 'lime', ruleSummary: 'playCount greater than zero, sorted descending' },
  { id: 'never-played', name: 'Never Played', description: 'Fresh signals with no logged plays.', color: 'magenta', ruleSummary: 'playCount missing or zero' },
  { id: 'downloaded', name: 'Downloaded', description: 'Tracks captured by the downloader engine.', color: 'magenta', ruleSummary: 'source type is downloaded' },
  { id: 'local-uploads', name: 'Local Uploads', description: 'Tracks imported directly from this device.', color: 'cyan', ruleSummary: 'source type is local' },
  { id: 'high-quality', name: 'High Quality', description: 'High bitrate or lossless-ready files.', color: 'lime', ruleSummary: 'bitrate at least 320kbps or WAV format' },
  { id: 'bass-heavy', name: 'Bass Heavy', description: 'Club, workout, hype, and bass-tagged tracks.', color: 'lime', ruleSummary: 'mood, genre, or tags include bass/club/workout/hype' },
  { id: 'night-drive', name: 'Night Drive', description: 'Late-route synth and cyberpunk signals.', color: 'cyan', ruleSummary: 'mood, genre, or tags include night/drive/synth/cyberpunk' },
  { id: 'chill-focus', name: 'Chill / Focus', description: 'Ambient, lo-fi, chill, and focus-ready tracks.', color: 'blue', ruleSummary: 'mood, genre, or tags include chill/focus/ambient/lo-fi' },
  { id: 'vocals', name: 'Vocals', description: 'Voice-forward, podcast, spoken, and lyric tracks.', color: 'magenta', ruleSummary: 'mood, genre, or tags include vocal/podcast/spoken/lyrics' },
  { id: 'retro-synth', name: 'Retro Synth', description: 'Retro, arcade, synth, and 80s-coded signals.', color: 'yellow', ruleSummary: 'mood, genre, or tags include retro/synth/arcade/80s' },
  { id: 'long-tracks', name: 'Long Tracks', description: 'Extended mixes and long-form sessions.', color: 'cyan', ruleSummary: 'duration at least 420 seconds' },
  { id: 'short-tracks', name: 'Short Tracks', description: 'Brief signals and quick hits.', color: 'magenta', ruleSummary: 'duration at most 90 seconds' },
];

const tokenSeparators = /[,/|;]+/;

export function normalizeMoodToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function titleCase(value: string): string {
  return normalizeMoodToken(value)
    .split(' ')
    .filter(Boolean)
    .map(part => part === 'lo' ? 'Lo' : part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function metadataTokens(track: Track): string[] {
  const raw = [
    track.mood,
    track.genre,
    ...(track.tags || []),
  ].filter(Boolean) as string[];

  return raw.flatMap(value => value.split(tokenSeparators))
    .map(normalizeMoodToken)
    .filter(Boolean);
}

function hasAnyToken(track: Track, tokens: string[]): boolean {
  const haystack = metadataTokens(track);
  return haystack.some(value => tokens.some(token => value.includes(token)));
}

function tracksForSmartPlaylist(id: SmartPlaylistId, tracks: Track[]): Track[] {
  switch (id) {
    case 'recently-added':
      return [...tracks].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'favorites':
      return tracks.filter(track => track.favorite);
    case 'most-played':
      return tracks.filter(track => (track.playCount || 0) > 0).sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    case 'never-played':
      return tracks.filter(track => !track.playCount);
    case 'downloaded':
      return tracks.filter(track => track.sourceType === 'downloaded');
    case 'local-uploads':
      return tracks.filter(track => track.sourceType === 'local');
    case 'high-quality':
      return tracks.filter(track => (track.bitrate || 0) >= 320 || (track.format || '').toLowerCase() === 'wav');
    case 'bass-heavy':
      return tracks.filter(track => hasAnyToken(track, ['bass', 'club', 'workout', 'hype']));
    case 'night-drive':
      return tracks.filter(track => hasAnyToken(track, ['night', 'drive', 'synth', 'cyberpunk']));
    case 'chill-focus':
      return tracks.filter(track => hasAnyToken(track, ['chill', 'focus', 'ambient', 'lo fi', 'lo-fi']));
    case 'vocals':
      return tracks.filter(track => hasAnyToken(track, ['vocal', 'podcast', 'spoken', 'lyrics']));
    case 'retro-synth':
      return tracks.filter(track => hasAnyToken(track, ['retro', 'synth', 'arcade', '80s']));
    case 'long-tracks':
      return tracks.filter(track => (track.duration || 0) >= 420);
    case 'short-tracks':
      return tracks.filter(track => (track.duration || 0) <= 90);
    default:
      return [];
  }
}

export function buildSmartPlaylists(tracks: Track[]): SmartPlaylist[] {
  return SMART_DEFINITIONS.map(definition => ({
    ...definition,
    trackIds: tracksForSmartPlaylist(definition.id, tracks).map(track => track.id),
  }));
}

export function getMoodColor(mood: string): string {
  const token = normalizeMoodToken(mood);
  if (/(night|drive|cyberpunk)/.test(token)) return 'cyan';
  if (/(bass|club|workout|hype)/.test(token)) return 'lime';
  if (/(chill|focus|ambient|lo fi|lo-fi)/.test(token)) return 'blue';
  if (/(vocal|podcast|spoken|lyrics)/.test(token)) return 'magenta';
  if (/(retro|synth|arcade|80s)/.test(token)) return 'yellow';
  return ['cyan', 'magenta', 'lime', 'yellow', 'blue'][Math.abs(hashString(token)) % 5];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return hash;
}

function moodKeysForTrack(track: Track): string[] {
  const preferred = track.mood?.trim()
    ? [track.mood]
    : track.genre?.trim()
      ? track.genre.split(tokenSeparators)
      : (track.tags || []);

  return Array.from(new Set(preferred.map(normalizeMoodToken).filter(Boolean)));
}

export function buildMoodPacks(tracks: Track[]): MoodPack[] {
  const groups = new Map<string, string[]>();
  for (const track of tracks) {
    for (const key of moodKeysForTrack(track)) {
      const ids = groups.get(key) || [];
      ids.push(track.id);
      groups.set(key, ids);
    }
  }

  return Array.from(groups.entries())
    .filter(([, trackIds]) => trackIds.length > 0)
    .map(([mood, trackIds]) => ({
      id: `mood-${mood.replace(/\s+/g, '-')}`,
      name: titleCase(mood),
      mood,
      trackIds,
      color: getMoodColor(mood),
      description: `${trackIds.length} signal${trackIds.length === 1 ? '' : 's'} matched by mood, genre, or tags.`,
    }))
    .sort((a, b) => b.trackIds.length - a.trackIds.length || a.name.localeCompare(b.name));
}

