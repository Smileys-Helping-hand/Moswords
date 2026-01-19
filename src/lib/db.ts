import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// For Node.js scripts, load from .env.local
if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env.local' });
}

let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set in environment variables');
  }
  
  if (!dbInstance) {
    const sql = neon(process.env.DATABASE_URL);
    dbInstance = drizzle(sql, { schema });
  }
  
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get: (target, prop) => {
    return (getDb() as any)[prop];
  }
});
