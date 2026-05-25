import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const capacitorDir = path.join(distDir, 'capacitor');
const excluded = new Set(['capacitor', 'server.cjs', 'server.cjs.map']);

if (!existsSync(distDir)) {
  throw new Error('dist does not exist. Run npm run build before preparing Capacitor assets.');
}

rmSync(capacitorDir, { recursive: true, force: true });
mkdirSync(capacitorDir, { recursive: true });

for (const entry of readdirSync(distDir, { withFileTypes: true })) {
  if (excluded.has(entry.name)) {
    continue;
  }

  const source = path.join(distDir, entry.name);
  const target = path.join(capacitorDir, entry.name);
  cpSync(source, target, { recursive: true });
}

