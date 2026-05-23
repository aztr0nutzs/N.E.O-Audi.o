import { describe, it, expect } from 'vitest';

describe('App smoke', () => {
  it('imports app without route import errors', async () => {
    await expect(import('../src/App')).resolves.toBeTruthy();
  });
});
