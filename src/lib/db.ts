import { Pool } from 'pg';

let pool: Pool | null = null;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL environment variable');
  }
  return databaseUrl;
}

export function getPool() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: getDatabaseUrl(),
  });

  return pool;
}
