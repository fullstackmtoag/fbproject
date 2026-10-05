import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';

async function main() {
  // Load .env.local / .env the same way Next.js does.
  loadEnvConfig(process.cwd());

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set (add it to .env.local)');
  }

  const dir = path.join(process.cwd(), 'db');
  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No .sql files found in db/');
    return;
  }

  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    for (const file of files) {
      const sql = await readFile(path.join(dir, file), 'utf8');
      process.stdout.write(`Running ${file}... `);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log('ok');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    console.log('Migration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
