import 'server-only';
import { Pool, type QueryResultRow } from 'pg';

declare global {
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  // SSL is configured via the connection string (e.g. ?sslmode=require).
  return new Pool({ connectionString, max: 5 });
}

// Reuse one pool across hot reloads in dev (avoids exhausting Neon connections).
export const pool: Pool = globalThis.__pgPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}
