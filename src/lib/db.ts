import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// For Node.js scripts, load from .env.local
if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env.local' });
}

// During build time, DATABASE_URL might not be available
// We'll create a mock connection that will be replaced at runtime
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Return a dummy URL for build time - this won't actually be used
  // Real connection is only needed at runtime
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
    return 'postgresql://dummy:dummy@localhost:5432/dummy';
  }
  
  throw new Error('DATABASE_URL must be set in environment variables');
};

const sql = neon(getDatabaseUrl());
export const db = drizzle(sql, { schema });
