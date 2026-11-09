import pg from 'pg';
import { isLocalDatabaseHost, resolveDatabaseUrl } from './databaseUrl.ts';

const { Pool } = pg;

const connectionString = resolveDatabaseUrl();

export const pool = new Pool({
  connectionString,
  max: 10,
  ssl: isLocalDatabaseHost(connectionString) ? undefined : { rejectUnauthorized: false },
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
