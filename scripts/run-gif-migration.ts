import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const sql = neon(connectionString);

  const migration = readFileSync('./drizzle/0007_gif_library.sql', 'utf8');
  // Split on semicolons but keep multi-line statements intact
  const stmts = migration
    .split(/;\s*\n/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0)
    .map((s: string) => s.endsWith(';') ? s : s + ';');

  let ok = 0, errs = 0;
  for (const stmt of stmts) {
    try {
      // neon tagged-template: pass raw SQL via String.raw workaround
      await sql.query(stmt);
      ok++;
      console.log('OK:', stmt.slice(0, 80).replace(/\n/g, ' '));
    } catch (e: any) {
      // "already exists" / "DO NOTHING" conflicts are fine
      const msg: string = e.message ?? '';
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        console.log('SKIP (exists):', stmt.slice(0, 60).replace(/\n/g, ' '));
      } else {
        console.error('ERR:', msg.slice(0, 150));
        errs++;
      }
    }
  }
  console.log(`\nMigration complete: ${ok} ok, ${errs} errors`);
}

main().catch(console.error);
