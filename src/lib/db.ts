import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// For Node.js scripts, load from .env.local
if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // Ignore if dotenv is not available
  }
}

// Get database URL with fallback for build time
const databaseUrl = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';

/**
 * Production talks to Neon over HTTP (no connection pool to exhaust on
 * Lambda). A local Postgres (localhost / 127.0.0.1) can't speak that
 * protocol, so development and tests use node-postgres against the same
 * schema. Both drivers return `{ rows }` from db.execute().
 */
export function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

function createDb(): NeonHttpDatabase<typeof schema> {
  if (process.env.DATABASE_URL && isLocalDatabase(databaseUrl)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg') as typeof import('pg');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePg } = require('drizzle-orm/node-postgres') as typeof import('drizzle-orm/node-postgres');
    // Columns are `timestamp without time zone` holding UTC (Neon runs in GMT); make a
    // local server in any timezone behave the same.
    const pool = new Pool({ connectionString: databaseUrl, max: 5, options: '-c timezone=UTC' });
    return drizzlePg(pool, { schema }) as unknown as NeonHttpDatabase<typeof schema>;
  }
  return drizzle(neon(databaseUrl), { schema });
}

export const db = createDb();

/**
 * Run independent queries together. On Neon they travel in ONE HTTP request
 * (drizzle's db.batch — a single round trip and a single short transaction)
 * instead of one request each; on a local Postgres they run in parallel.
 * Pass drizzle query builders (not already-awaited promises).
 */
export async function runBatch<T extends unknown[]>(queries: [...{ [K in keyof T]: PromiseLike<T[K]> }]): Promise<T> {
  const batch = (db as unknown as { batch?: (q: unknown[]) => Promise<unknown[]> }).batch;
  if (queries.length > 1 && typeof batch === 'function' && !isLocalDatabase(process.env.DATABASE_URL)) {
    return (await batch.call(db, queries as unknown[])) as T;
  }
  return (await Promise.all(queries)) as T;
}
