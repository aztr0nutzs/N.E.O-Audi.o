import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../server';

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

  it('rejects invalid format with 400', async () => {
    const res = await request(app)
      .post('/api/download-jobs')
      .send({ url: 'https://example.com/audio.mp3', format: 'exe', bitrate: 320 });
    expect(res.status).toBe(400);
  });

  it('rejects invalid bitrate with 400', async () => {
    const res = await request(app)
      .post('/api/download-jobs')
      .send({ url: 'https://example.com/audio.mp3', format: 'mp3', bitrate: 999 });
    expect(res.status).toBe(400);
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
