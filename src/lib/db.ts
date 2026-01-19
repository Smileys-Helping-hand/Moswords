import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// For Node.js scripts, load from .env.local
if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env.local' });
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in environment variables');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
