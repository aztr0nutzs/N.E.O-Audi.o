import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, __serverInternals } from '../server';

const createdJobIds: string[] = [];

afterAll(async () => {
  for (const id of createdJobIds) {
    await request(app).delete(`/api/download-jobs/${id}`).catch(() => undefined);
  }
});

describe('POST /api/download-jobs validation', () => {
  it('rejects invalid URL with 400 + errorCode invalid_url', async () => {
    const res = await request(app)
      .post('/api/download-jobs')
      .send({ url: 'notaurl', format: 'mp3', bitrate: 320 });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('invalid_url');
  });

  it('rejects invalid format with 400 + errorCode invalid_format', async () => {
    const res = await request(app)
      .post('/api/download-jobs')
      .send({ url: 'https://example.com/audio.mp3', format: 'exe', bitrate: 320 });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('invalid_format');
  });

  it('rejects invalid bitrate with 400 + errorCode invalid_bitrate', async () => {
    const res = await request(app)
      .post('/api/download-jobs')
      .send({ url: 'https://example.com/audio.mp3', format: 'mp3', bitrate: 999 });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('invalid_bitrate');
  });

  it('creates a queued job for a valid request', async () => {
    const url = 'https://example.com/audio.mp3';
    const res = await request(app)
      .post('/api/download-jobs')
      .send({ url, format: 'mp3', bitrate: 320 });
    expect([200, 201]).toContain(res.status);
    expect(res.body.status).toBe('queued');
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
    expect(res.body.sourceUrl).toBe(url);
    if (res.body.id) createdJobIds.push(res.body.id);
  });

  it('GET /api/download-jobs/:id/logs returns logs for existing job', async () => {
    const create = await request(app)
      .post('/api/download-jobs')
      .send({ url: 'https://example.com/with-logs.mp3', format: 'mp3', bitrate: 320 });
    expect([200, 201]).toContain(create.status);
    const id = create.body.id;
    createdJobIds.push(id);
    const res = await request(app).get(`/api/download-jobs/${id}/logs`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });
});

describe('Download job operations on missing job ids', () => {
  it('POST /api/download-jobs/missing/start returns 404', async () => {
    const res = await request(app).post('/api/download-jobs/missing/start');
    expect(res.status).toBe(404);
  });

  it('POST /api/download-jobs/missing/cancel returns 404', async () => {
    const res = await request(app).post('/api/download-jobs/missing/cancel');
    expect(res.status).toBe(404);
  });

  it('DELETE /api/download-jobs/missing returns 404', async () => {
    const res = await request(app).delete('/api/download-jobs/missing');
    expect(res.status).toBe(404);
  });

  it('GET /api/download-jobs/missing/logs returns 404', async () => {
    const res = await request(app).get('/api/download-jobs/missing/logs');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tracks/:id metadata validation', () => {
  it('missing track returns track_not_found', async () => {
    const res = await request(app).patch('/api/tracks/missing-track').send({ title: 'X' });
    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('track_not_found');
  });
});

describe('Cover art API', () => {
  const addTrack = (id: string) => {
    const tracks = __serverInternals.getTracks();
    tracks.push({
      id,
      title: 'Cover API Track',
      artist: 'API Artist',
      sourceType: 'local',
      localUrl: '/api/stream/test.mp3',
      format: 'mp3',
      duration: 1,
      size: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      favorite: false,
    } as any);
    return () => {
      for (let idx = tracks.length - 1; idx >= 0; idx--) {
        if ((tracks[idx] as any).id === id) tracks.splice(idx, 1);
      }
      __serverInternals.saveDb();
    };
  };

  it('rejects non-image cover upload', async () => {
    const cleanup = addTrack('cover-non-image');
    const res = await request(app)
      .post('/api/tracks/cover-non-image/cover')
      .attach('cover', Buffer.from('not image'), { filename: 'not-image.txt', contentType: 'text/plain' });
    expect(res.status).toBe(415);
    expect(res.body.errorCode).toBe('unsupported_cover_type');
    cleanup();
  });

  it('missing track returns 404 for cover upload', async () => {
    const res = await request(app)
      .post('/api/tracks/missing-cover-track/cover')
      .attach('cover', Buffer.from('fake'), { filename: 'cover.png', contentType: 'image/png' });
    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('track_not_found');
  });

  it('remove cover missing track returns 404', async () => {
    const res = await request(app).delete('/api/tracks/missing-cover-track/cover');
    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('track_not_found');
  });

  it('uploads a small png cover', async () => {
    const cleanup = addTrack('cover-upload-ok');
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    );
    const res = await request(app)
      .post('/api/tracks/cover-upload-ok/cover')
      .attach('cover', png, { filename: 'cover.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.coverArtSource).toBe('uploaded');
    expect(res.body.coverArtUrl).toMatch(/^\/api\/covers\//);
    await request(app).delete('/api/tracks/cover-upload-ok/cover');
    cleanup();
  });
});
