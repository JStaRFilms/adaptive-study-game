import { Pool } from 'pg';

let pool: Pool | undefined;

export function getDatabasePool(): Pool {
  const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Database is not configured.');
  return pool ??= new Pool({ connectionString, max: 3 });
}
