import { describe, expect, it } from 'vitest';
import {
  NEO_AUDIO_BACKGROUND,
  NEO_AUDIO_HEADER_3,
  NEO_AUDIO_HEADER_4,
  NEO_AUDIO_HEADERS,
} from '../src/lib/neoAudioAssets';

describe('neo audio asset exports', () => {
  it('exports centralized header and background assets', () => {
    expect(NEO_AUDIO_HEADER_3).toBe('/assets/neo_audio/neo_audio_header3.png');
    expect(NEO_AUDIO_HEADER_4).toBe('/assets/neo_audio/neo_audio_header4.png');
    expect(NEO_AUDIO_BACKGROUND).toBe('/assets/neo_audio/neo_audio_backround.png');
    expect(NEO_AUDIO_HEADERS).toEqual([NEO_AUDIO_HEADER_3, NEO_AUDIO_HEADER_4]);
  });
});
