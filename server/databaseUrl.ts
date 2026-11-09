import { execFileSync } from 'node:child_process';

function readWindowsEnv(scope: 'User' | 'Machine'): string | undefined {
  if (process.platform !== 'win32') return undefined;
  try {
    const value = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `[Environment]::GetEnvironmentVariable('DATABASE_URL','${scope}')`,
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 8000 }
    ).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export function resolveDatabaseUrl(): string {
  const fromProcess = process.env.DATABASE_URL?.trim();
  if (fromProcess) return fromProcess;

  const fromOs = readWindowsEnv('User') ?? readWindowsEnv('Machine');
  if (fromOs) {
    process.env.DATABASE_URL = fromOs;
    return fromOs;
  }

  throw new Error(
    'DATABASE_URL 환경변수가 없습니다. OS/서비스에서 PostgreSQL 접속 문자열을 주입하세요. .env에 DATABASE_URL을 두지 않습니다.'
  );
}

export function isLocalDatabaseHost(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}
