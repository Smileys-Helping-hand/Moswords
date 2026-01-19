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

// Get database URL with fallback for build time
const databaseUrl = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';

// Create database connection
const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
