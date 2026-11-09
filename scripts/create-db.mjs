import { execFileSync } from 'node:child_process';
import pg from 'pg';

function resolveDatabaseUrl() {
  const fromProcess = process.env.DATABASE_URL?.trim();
  if (fromProcess) return fromProcess;
  if (process.platform !== 'win32') return '';
  for (const scope of ['User', 'Machine']) {
    try {
      const value = execFileSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', `[Environment]::GetEnvironmentVariable('DATABASE_URL','${scope}')`],
        { encoding: 'utf8', windowsHide: true, timeout: 8000 }
      ).trim();
      if (value) return value;
    } catch {
      /* ignore */
    }
  }
  return '';
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  throw new Error('DATABASE_URL 환경변수가 없습니다.');
}

const host = new URL(connectionString).hostname;
const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
const client = new pg.Client({
  connectionString,
  ssl: local ? undefined : { rejectUnauthorized: false },
});
await client.connect();
await client.query('SELECT 1');
console.log('database reachable');
await client.end();
