import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app, __serverInternals } from '../../server';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const JOBS_FILE = path.join(UPLOADS_DIR, 'jobs.json');
const DB_FILE = path.join(UPLOADS_DIR, 'db.json');

let failures = 0;

async function step(label: string, fn: () => Promise<void>) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    await fn();
    process.stdout.write(`  PASS\n`);
  } catch (e: any) {
    process.stdout.write(`  FAIL: ${e.message}\n`);
    failures++;
  }
}

(async () => {
  await step('1. Create a queued job', async () => {
    const res = await request(app)
      .post('/api/download-jobs')
      .send({ url: 'https://example.com/audio.mp3', format: 'mp3', bitrate: 320 });
    if (![200, 201].includes(res.status)) throw new Error(`status ${res.status}`);
    if (res.body.status !== 'queued') throw new Error(`status=${res.body.status}`);
    console.log(`  job id=${res.body.id} status=${res.body.status}`);
    (globalThis as any).__queuedId = res.body.id;
  });

  await step('2. Cancel the job', async () => {
    const id = (globalThis as any).__queuedId;
    const res = await request(app).post(`/api/download-jobs/${id}/cancel`);
    if (res.status !== 200) throw new Error(`status ${res.status} body=${JSON.stringify(res.body)}`);
    console.log(`  cancel: status=${res.body.status} phase=${res.body.phase} errorCode=${res.body.errorCode}`);
  });

  await step('3. Confirm cancelled status via GET', async () => {
    const id = (globalThis as any).__queuedId;
    const res = await request(app).get(`/api/download-jobs/${id}`);
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    if (res.body.status !== 'cancelled') throw new Error(`expected cancelled, got ${res.body.status}`);
    console.log(`  GET reports status=${res.body.status}`);
  });

  await step('4. Delete an active (downloading) job returns 409', async () => {
    const createRes = await request(app)
      .post('/api/download-jobs')
      .send({ url: 'https://example.com/audio.mp3', format: 'mp3', bitrate: 320 });
    const id = createRes.body.id;
    const jobs = __serverInternals.getDownloadJobs();
    const job = jobs.find(j => j.id === id);
    if (!job) throw new Error('job not in internal store');
    job.status = 'downloading';
    job.phase = 'Downloading';

    const delRes = await request(app).delete(`/api/download-jobs/${id}`);
    if (delRes.status !== 409) throw new Error(`expected 409, got ${delRes.status}`);
    if (!delRes.body.error || !/cancel active job/i.test(delRes.body.error)) {
      throw new Error(`expected error text about cancel-active-job, got ${JSON.stringify(delRes.body)}`);
    }
    console.log(`  delete on downloading job -> 409  error="${delRes.body.error}"`);

    // Reset to cancelled so reset step can clean it up.
    job.status = 'cancelled';
    job.phase = 'Cancelled';
  });

  await step('5. Path traversal is blocked on stream endpoint', async () => {
    const res = await request(app).get('/api/stream/..%2F..%2Fpackage.json');
    if (res.status !== 404) throw new Error(`expected 404, got ${res.status}`);
    console.log(`  ../../package.json -> 404 (blocked)`);
  });

  await step('6. Factory reset with no active jobs', async () => {
    const res = await request(app).post('/api/reset');
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    if (typeof res.body.summary?.processesKilled !== 'number') {
      throw new Error(`summary.processesKilled missing: ${JSON.stringify(res.body.summary)}`);
    }
    console.log(`  reset summary=${JSON.stringify(res.body.summary)}`);
  });

  await step('7. Confirm uploads/db.json and jobs.json are []', async () => {
    const db = fs.readFileSync(DB_FILE, 'utf-8').trim();
    const jobs = fs.readFileSync(JOBS_FILE, 'utf-8').trim();
    if (db !== '[]') throw new Error(`db.json content: ${JSON.stringify(db)}`);
    if (jobs !== '[]') throw new Error(`jobs.json content: ${JSON.stringify(jobs)}`);
    console.log(`  db.json="${db}"  jobs.json="${jobs}"`);
  });

  process.stdout.write(`\nFailures: ${failures}\n`);
  process.exit(failures > 0 ? 1 : 0);
})();
