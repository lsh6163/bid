import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import os from 'node:os';

const databaseDir = path.join(os.homedir(), 'AppData', 'Local', 'steeleon-pgdata-emb');

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'postgres',
  port: 5433,
  persistent: true,
  initdbFlags: ['--locale=C', '--encoding=UTF8'],
});

await pg.initialise();
await pg.start();
try {
  await pg.createDatabase('steeleon');
} catch {
  // already exists
}

console.log('Local PostgreSQL is running on port 5433. Keep this process alive.');

process.on('SIGINT', async () => {
  await pg.stop();
  process.exit(0);
});
