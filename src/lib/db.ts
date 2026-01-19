import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// For Node.js scripts, load from .env.local
if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env.local' });
}

// During build time, DATABASE_URL might not be available
// We'll create a connection with a fallback dummy URL for build
const getDatabaseUrl = () => {
  // If DATABASE_URL exists, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Fallback for build time - this won't actually connect during build
  // Real connection only happens at runtime when API routes are called
  console.warn('DATABASE_URL not set, using dummy URL for build');
  return 'postgresql://dummy:dummy@localhost:5432/dummy';
};

const sql = neon(getDatabaseUrl());
export const db = drizzle(sql, { schema });
