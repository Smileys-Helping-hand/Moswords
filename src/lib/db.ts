import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// For Node.js scripts, load from .env.local
if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // Ignore if dotenv is not available
  }
}

let cachedDb: ReturnType<typeof drizzle> | null = null;

function createDb() {
  if (!process.env.DATABASE_URL) {
    // For build time, return a dummy connection that won't be used
    console.warn('DATABASE_URL not set, using dummy connection for build');
    const dummySql = neon('postgresql://dummy:dummy@localhost:5432/dummy');
    return drizzle(dummySql, { schema });
  }
  
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

// Export a proxy that creates the connection lazily
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    if (!cachedDb) {
      cachedDb = createDb();
    }
    return (cachedDb as any)[prop];
  }
});
